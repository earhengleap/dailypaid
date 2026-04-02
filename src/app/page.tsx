"use client"

import * as React from "react"
import { BalanceCard } from "@/components/ui/BalanceCard"
import { TransactionItem, type Transaction } from "@/components/ui/TransactionItem"
import { AddTransactionModal } from "@/components/ui/AddTransactionModal"
import { EXCHANGE_RATE } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Sun, 
  Moon, 
  Loader2, 
  LogOut, 
  ShieldCheck,
  Zap,
  LayoutDashboard
} from "lucide-react"
import { isToday, isYesterday, format, startOfDay } from "date-fns"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/Button"
import { getTransactions, createTransaction, deleteTransactionAction, seedExampleData } from "@/lib/actions"
import { signOutAction } from "@/lib/auth-actions"
import { useRouter } from "next/navigation"

const GUEST_DATA: Transaction[] = [
  { id: 'g1', title: 'Monthly Salary', amount: 3200, currency: 'USD', type: 'income', date: Date.now(), group: 'Work' },
  { id: 'g2', title: 'Morning Coffee', amount: 4.5, currency: 'USD', type: 'expense', date: Date.now() - 3600000, group: 'Personal' },
  { id: 'g3', title: 'Freelance Project', amount: 850, currency: 'USD', type: 'income', date: Date.now() - 86400000, group: 'Work' },
  { id: 'g4', title: 'Grocery Shopping', amount: 120, currency: 'USD', type: 'expense', date: Date.now() - 172800000, group: 'Personal' },
  { id: 'g5', title: 'Gym Membership', amount: 45, currency: 'USD', type: 'expense', date: Date.now() - 259200000, group: 'Personal' },
]

export default function Home() {
  const router = useRouter()
  const [session, setSession] = React.useState<any>(null)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [filter, setFilter] = React.useState<'all' | 'income' | 'expense'>('all')
  const [currencyFilter, setCurrencyFilter] = React.useState<'all' | 'USD' | 'KHR'>('all')
  const [search, setSearch] = React.useState("")
  const [activeGroup, setActiveGroup] = React.useState("All")
  const [isDataReady, setIsDataReady] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [mounted, setMounted] = React.useState(false)
  const { theme, toggleTheme } = useTheme()
  
  // Hydration Stability & Theme Sync
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Interactive Chart State
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const sessionData = await res.json()
        if (sessionData && Object.keys(sessionData).length > 0) {
          setSession(sessionData)
        }
      } catch (err) {
        console.error("Auth check failed:", err)
      } finally {
        setMounted(true)
      }
    }
    checkAuth()
  }, [router])

  // Load from Neon DB
  const loadData = React.useCallback(async () => {
    if (!session) {
      setTransactions(GUEST_DATA)
      setIsDataReady(true)
      return
    }

    setIsPending(true)
    try {
      const data = await getTransactions()
      if (data.length === 0) {
        // If empty, try seeding some initial data for the user
        await seedExampleData()
        const seeded = await getTransactions()
        setTransactions(seeded)
      } else {
        setTransactions(data)
      }
    } catch (err) {
      console.error("Failed to load transactions", err)
      setError("Failed to sync with cloud database")
    } finally {
      setIsDataReady(true)
      setIsPending(false)
    }
  }, [session])

  React.useEffect(() => {
    loadData()
  }, [loadData])


  const existingGroups = React.useMemo(() => {
    const groups = new Set<string>()
    transactions.forEach(t => {
      if (t.group) groups.add(t.group)
    })
    return Array.from(groups).sort()
  }, [transactions])

  const groupStats = React.useMemo(() => {
    const stats: Record<string, { balance: number, spending: number }> = {}
    
    // Initialize stats for each group
    existingGroups.forEach(g => {
      stats[g] = { balance: 0, spending: 0 }
    })

    transactions.forEach(t => {
      const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
      if (!stats[t.group]) stats[t.group] = { balance: 0, spending: 0 }
      
      if (t.type === 'income') {
        stats[t.group].balance += amt
      } else {
        stats[t.group].balance -= amt
        stats[t.group].spending += amt
      }
    })

    return stats
  }, [transactions, existingGroups])

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    if (!session) {
      const newTransaction: Transaction = {
        ...data,
        id: `local-${Date.now()}`,
      }
      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date - a.date))
      return
    }

    setIsPending(true)
    const result = await createTransaction(data)
    if (result.success && result.id) {
      const newTransaction: Transaction = {
        ...data,
        id: result.id,
      }
      setTransactions(prev => [newTransaction, ...prev].sort((a, b) => b.date - a.date))
    } else {
      setError(result.error || "Failed to add record")
    }
    setIsPending(false)
  }

  const deleteTransaction = async (id: string) => {
    if (!session || id.startsWith('local-') || id.startsWith('g')) {
      setTransactions(prev => prev.filter(t => t.id !== id))
      return
    }

    setIsPending(true)
    const result = await deleteTransactionAction(id)
    if (result.success) {
      setTransactions(prev => prev.filter(t => t.id !== id))
    } else {
      setError(result.error || "Failed to delete record")
    }
    setIsPending(false)
  }

  // Master Financial Calculations (Group-Aware)
  const { 
    incomeUSD, 
    expenseUSD, 
    balanceUSD, 
    todayExpense, 
    avgDailyExpense,
    progress,
    balanceHistory,
    incomeHistory, 
    expenseHistory
  } = React.useMemo(() => {
    const filtered = transactions.filter(t => activeGroup === 'All' ? true : t.group === activeGroup)
    
    let totalIncome = 0
    let totalExpense = 0
    let today = 0
    
    filtered.forEach(t => {
      const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
      if (t.type === 'income') totalIncome += amt
      else {
        totalExpense += amt
        if (isToday(new Date(t.date))) today += amt
      }
    })

    // Calculate Avg Daily Expense for current group
    const expenses = filtered.filter(t => t.type === 'expense')
    const dates = new Set(expenses.map(t => format(new Date(t.date), 'yyyy-MM-dd')))
    const avg = expenses.length > 0 ? totalExpense / (dates.size || 1) : 0
    const prog = avg > 0 ? Math.min((today / avg) * 100, 100) : 0

    // Rolling Trends
    const bHist: number[] = []
    const iHist: number[] = []
    const eHist: number[] = []
    const recent = filtered.slice(0, 10).reverse()
    let rolling = (totalIncome - totalExpense) - recent.reduce((acc, t) => {
      const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
      return acc + (t.type === 'income' ? amt : -amt)
    }, 0)

    recent.forEach(t => {
      const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
      if (t.type === 'income') {
        rolling += amt
        iHist.push(amt)
        eHist.push(0)
      } else {
        rolling -= amt
        iHist.push(0)
        eHist.push(amt)
      }
      bHist.push(rolling)
    })

    return {
      incomeUSD: totalIncome,
      expenseUSD: totalExpense,
      balanceUSD: totalIncome - totalExpense,
      todayExpense: today,
      avgDailyExpense: avg,
      progress: prog,
      balanceHistory: bHist.length ? bHist : [0, 0],
      incomeHistory: iHist.length ? iHist : [0, 0],
      expenseHistory: eHist.length ? eHist : [0, 0]
    }
  }, [transactions, activeGroup])

  const chartData = React.useMemo(() => {
    const days = 7
    const result: { date: string, income: number, expense: number }[] = []
    
    for (let i = days - 1; i >= 0; i--) {
      const d = startOfDay(new Date(Date.now() - (i * 86400000)))
      const dateStr = format(d, 'yyyy-MM-dd')
      
      let inc = 0
      let exp = 0
      
      transactions.forEach(t => {
        if (format(startOfDay(new Date(t.date)), 'yyyy-MM-dd') === dateStr) {
          const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
          if (t.type === 'income') inc += amt
          else exp += amt
        }
      })
      
      result.push({ date: dateStr, income: inc, expense: exp })
    }
    return result
  }, [transactions])



  const groupedTransactions = React.useMemo(() => {
    const filtered = transactions
      .filter(t => activeGroup === 'All' ? true : t.group === activeGroup)
      .filter(t => filter === 'all' ? true : t.type === filter)
      .filter(t => currencyFilter === 'all' ? true : t.currency === currencyFilter)
      .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

    const groups: { [key: string]: Transaction[] } = {}
    filtered.forEach(t => {
      const dateKey = format(startOfDay(new Date(t.date)), 'yyyy-MM-dd')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, activeGroup, filter, currencyFilter, search])

  // Chart Smoothing Helper (Catmull-Rom to Cubic Bezier)
  const getCurvePath = (data: number[]) => {
    if (data.length < 2) return ""
    const points = data.map((v, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - (v / Math.max(...data, 1) * 75 + 10)
    }))
    
    let path = `M ${points[0].x},${points[0].y}`
    
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }
    
    return path
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const index = Math.round((x / 100) * (chartData.length - 1))
    setHoverIndex(Math.max(0, Math.min(chartData.length - 1, index)))
  }

  const getGroupTotals = (groupTransactions: Transaction[]) => {
    let income = 0
    let expense = 0
    groupTransactions.forEach(t => {
      const amt = t.currency === 'USD' ? t.amount : t.amount / EXCHANGE_RATE
      if (t.type === 'income') income += amt
      else expense += amt
    })
    return { income, expense, net: income - expense }
  }

  const getDateLabel = (dateKey: string) => {
    const date = new Date(dateKey)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMM d')
  }

  if (!mounted) return null

  return (
    <main className="min-h-screen bg-background pb-40 md:pb-24 font-sans text-foreground transition-colors duration-500" suppressHydrationWarning>
      <nav className="glass sticky top-0 z-40 w-full overflow-hidden border-b border-border/40 dark:border-white/[0.03]" suppressHydrationWarning>
        <div className="container max-w-4xl mx-auto px-4 sm:px-10 h-16 sm:h-20 flex items-center justify-between" suppressHydrationWarning>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-premium">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[11px] sm:text-xs font-black tracking-[0.3em] uppercase leading-none opacity-80">DailyPay</h1>
              <span className="text-[8px] sm:text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] mt-0.5">
                {session?.user ? `${session.user.name || 'User'} Vault` : "Guest Preview Mode"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session && (
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">{session.user.name || 'Private'}</span>
              </div>
            )}
            {session && <div className="h-8 w-px bg-border/40 hidden sm:block mx-2" />}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => session ? signOutAction() : router.push("/login")}
              className={cn(
                "rounded-xl transition-all",
                session ? "text-foreground/20 hover:text-accent hover:bg-accent/5" : "text-primary hover:bg-primary/5 shadow-sm bg-primary/5"
              )}
            >
              {session ? <LogOut size={16} /> : <ArrowUpCircle size={18} className="rotate-90" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
              {mounted ? (theme === "light" ? <Moon size={16} /> : <Sun size={16} />) : <div className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-4 sm:px-10 mt-8 sm:mt-16 space-y-12 sm:space-y-20" suppressHydrationWarning>
        {!session && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-6 rounded-2xl bg-primary/[0.03] border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Guest Preview Mode</p>
                <p className="text-[9px] font-bold text-foreground/30 uppercase tracking-[0.1em] leading-tight">These records are for preview only and will be lost on refresh.</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push("/login")}
              className="w-full sm:w-auto bg-primary text-white rounded-xl px-8 font-black uppercase tracking-[0.2em] text-[10px] h-12 shadow-premium border-none hover:scale-105 active:scale-95 transition-all"
            >
              Sync to Cloud
            </Button>
          </motion.div>
        )}
        {/* Dynamic Wallet Overview */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground/20 italic">Wallet Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveGroup('All')}
              className={cn(
                "group relative overflow-hidden p-5 rounded-[2rem] transition-all duration-500 text-left border-2 haptic-active",
                activeGroup === 'All' 
                  ? "bg-primary border-primary shadow-luxury scale-[1.02]" 
                  : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200/50 dark:hover:border-zinc-700/50"
              )}
            >
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-xl transition-colors duration-500", activeGroup === 'All' ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest", activeGroup === 'All' ? "text-white/40" : "text-foreground/10")}>Full Portfolio</span>
                </div>
                <div>
                  <p className={cn("text-[10px] font-bold uppercase tracking-widest leading-none mb-1", activeGroup === 'All' ? "text-white/60" : "text-foreground/30")}>Total</p>
                  <p className={cn("text-lg font-black tracking-tighter tabular-nums", activeGroup === 'All' ? "text-white" : "text-foreground")}>Consolidated</p>
                </div>
              </div>
            </button>

            {existingGroups.map((g) => {
              const stats = groupStats[g] || { balance: 0, spending: 0 }
              const isActive = activeGroup === g
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={cn(
                    "group relative overflow-hidden p-5 rounded-[2rem] transition-all duration-500 text-left border-2 haptic-active",
                    isActive 
                      ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white shadow-luxury scale-[1.02]" 
                      : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200/50 dark:hover:border-zinc-700/50"
                  )}
                >
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-primary animate-pulse" : "bg-primary/20")} />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-white/30 dark:text-zinc-900/40" : "text-foreground/10")}>Wallet</span>
                    </div>
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] leading-none mb-1 text-primary shadow-sm")}>{g}</p>
                      <div className="space-y-0.5">
                        <p className={cn("text-lg font-black tracking-tighter tabular-nums", isActive ? "text-white dark:text-zinc-900" : "text-foreground")}>
                          ${stats.balance.toFixed(2)}
                        </p>
                        <p className={cn("text-[9px] font-bold uppercase tracking-widest", isActive ? "text-white/40 dark:text-zinc-900/30" : "text-foreground/10")}>
                          Spending: ${stats.spending.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Daily Progress */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1.5">
            <div className="flex items-center gap-3">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20">Daily Rate</span>
              <span className={cn("px-2 py-0.5 rounded-lg text-[7px] sm:text-[8px] font-black uppercase", progress > 90 ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary")}>
                {progress > 90 ? 'Limit Hit' : 'Balanced'}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] tabular-nums text-foreground/20">
              ${todayExpense.toFixed(2)} <span className="opacity-10">/</span> ${avgDailyExpense.toFixed(2)}
            </span>
          </div>
          <div className="h-2 w-full bg-muted/40 dark:bg-white/[0.02] rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn("h-full rounded-full", progress > 90 ? "bg-accent" : "bg-primary")} />
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <BalanceCard title="Net Assets" amountUSD={balanceUSD} type="balance" history={balanceHistory} className="sm:col-span-2" />
          <BalanceCard title="Earnings" amountUSD={incomeUSD} type="income" history={incomeHistory} />
          <BalanceCard title="Spending" amountUSD={expenseUSD} type="expense" history={expenseHistory} />
        </section>

        {/* 7-Day Trend Chart - Premium Interactive Version */}
        <section className="p-8 sm:p-10 rounded-[3rem] bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 shadow-premium relative overflow-hidden group">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-8 mb-12">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <TrendingUp size={16} strokeWidth={3} />
                </div>
                <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-zinc-900 dark:text-zinc-100 italic">Weekly Performance</h2>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none px-1">Income & Expense Trajectory</p>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-6">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Earnings</span>
                  </div>
                  <p className="text-xs font-black tabular-nums min-w-[60px] text-zinc-900 dark:text-zinc-100 ml-4">${chartData.reduce((a, b) => a + b.income, 0).toFixed(2)}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Spending</span>
                  </div>
                  <p className="text-xs font-black tabular-nums min-w-[60px] text-zinc-900 dark:text-zinc-100 ml-4">${chartData.reduce((a, b) => a + b.expense, 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full relative">
            <svg 
              viewBox="0 0 100 100" 
              className="w-full h-full overflow-visible touch-none cursor-crosshair" 
              preserveAspectRatio="none"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setHoverIndex(null)}
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g className="opacity-10 pointer-events-none">
                {[0, 25, 50, 75, 100].map(v => (
                  <line key={v} x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.15" />
                ))}
              </g>

              {hoverIndex !== null && (
                <motion.line
                  x1={(hoverIndex / (chartData.length - 1)) * 100}
                  y1="0"
                  x2={(hoverIndex / (chartData.length - 1)) * 100}
                  y2="100"
                  className="stroke-primary/20 dark:stroke-primary/10"
                  strokeWidth="0.4"
                  strokeDasharray="2 2"
                />
              )}

              {chartData.length > 1 && (
                <React.Fragment>
                  <motion.path d={`${getCurvePath(chartData.map(d => d.income))} L 100,100 L 0,100 Z`} fill="url(#incomeGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                  <motion.path d={`${getCurvePath(chartData.map(d => d.expense))} L 100,100 L 0,100 Z`} fill="url(#expenseGradient)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
                  <motion.path d={getCurvePath(chartData.map(d => d.income))} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <motion.path d={getCurvePath(chartData.map(d => d.expense))} fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {chartData.map((d, i) => {
                    const max = Math.max(...chartData.map(v => Math.max(v.income, v.expense, 1)))
                    const x = (i / (chartData.length - 1)) * 100
                    const yI = 100 - (d.income / max * 75 + 10)
                    const yE = 100 - (d.expense / max * 75 + 10)
                    const isHovered = hoverIndex === i
                    return (
                      <React.Fragment key={i}>
                        {d.income > 0 && <motion.circle cx={x} cy={yI} r={isHovered ? 4.5 : 2.5} fill="#10b981" className="stroke-white dark:stroke-zinc-950 stroke-[1.5px] transition-all" />}
                        {d.expense > 0 && <motion.circle cx={x} cy={yE} r={isHovered ? 4.5 : 2.5} fill="#f43f5e" className="stroke-white dark:stroke-zinc-950 stroke-[1.5px] transition-all" />}
                      </React.Fragment>
                    )
                  })}
                </React.Fragment>
              )}
            </svg>

            <AnimatePresence>
              {hoverIndex !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="absolute pointer-events-none z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-white/[0.05] p-5 rounded-[2rem] shadow-luxury min-w-[170px]"
                  style={{
                    left: `${(hoverIndex / (chartData.length - 1)) * 100}%`,
                    top: '15%',
                    transform: `translateX(${hoverIndex > 3 ? '-110%' : '10%'})`
                  }}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">{format(new Date(chartData[hoverIndex].date), 'EEEE, MMM d')}</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Earnings</span>
                      </div>
                      <span className="text-xs font-black tabular-nums text-emerald-600 dark:text-emerald-400">${chartData[hoverIndex].income.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Spending</span>
                      </div>
                      <span className="text-xs font-black tabular-nums text-rose-600 dark:text-rose-400">${chartData[hoverIndex].expense.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between mt-12 px-2">
            {chartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-4 group/label cursor-default">
                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300", hoverIndex === i ? "text-primary scale-110" : "text-zinc-300 dark:text-zinc-700")}>
                  {format(new Date(d.date), 'EEE')}
                </span>
                <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-500", hoverIndex === i ? "bg-primary scale-150 shadow-luxury" : "bg-zinc-100 dark:bg-zinc-800")} />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-12">
          {/* Activity Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
            <div className="space-y-1">
              <h2 className="text-[12px] font-black tracking-[0.2em] uppercase text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-primary" /> {activeGroup} Activity
              </h2>
              <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">Complete account history</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl gap-1 h-10 border border-transparent dark:border-zinc-800">
                {['all', 'income', 'expense'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={cn(
                      "px-6 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all",
                      filter === f ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl gap-1 h-10 border border-transparent dark:border-zinc-800">
                {['all', 'USD', 'KHR'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrencyFilter(c as any)}
                    className={cn(
                      "px-4 text-[9px] uppercase font-bold tracking-widest rounded-lg transition-all",
                      currencyFilter === c ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isDataReady ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-40 gap-4"
              >
                <Loader2 className="h-8 w-8 text-primary animate-spin opacity-50" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/20">Syncing with Neon Cloud...</p>
              </motion.div>
            ) : error ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center py-40 gap-4"
              >
                <div className="text-accent bg-accent/10 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">{error}</div>
                <Button variant="ghost" onClick={loadData} className="text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">Retry Connection</Button>
              </motion.div>
            ) : (
              <motion.div 
                key={`${filter}-${search}-${activeGroup}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-16"
              >
                {groupedTransactions.map(([dateKey, groupTransactions]) => {
                  const totals = getGroupTotals(groupTransactions)
                  return (
                    <div key={dateKey} className="space-y-6">
                      <div className="sticky top-16 sm:top-20 z-30 py-4 bg-background/95 backdrop-blur-md flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">
                             {getDateLabel(dateKey)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-400/5 text-emerald-600 dark:text-emerald-400 rounded-full h-6 transition-all duration-300">
                             +${totals.income.toFixed(2)}
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 dark:bg-rose-400/5 text-rose-600 dark:text-rose-400 rounded-full h-6 transition-all duration-300">
                             -${totals.expense.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {groupTransactions.map((t) => (
                          <TransactionItem key={t.id} transaction={t} onDelete={deleteTransaction} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <div className="hidden lg:block">
        <AddTransactionModal 
          onAdd={addTransaction} 
          existingGroups={existingGroups} 
          triggerClassName="fixed lg:bottom-10 lg:right-10"
        />
      </div>

      <div className="lg:hidden">
        <nav className="glass fixed bottom-0 left-0 right-0 h-24 z-50 px-8 flex items-center justify-between rounded-t-[2.5rem] border-t border-border/40 dark:border-white/[0.03] shadow-luxury">
          <button className="flex flex-col items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Home</span></button>
          <div className="relative -top-10"><AddTransactionModal onAdd={addTransaction} existingGroups={existingGroups} triggerClassName="relative" /></div>
          <button className="flex flex-col items-center gap-2 text-foreground/20" onClick={() => setSearch("")}><Layers className="h-5 w-5" /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Reset</span></button>
        </nav>
      </div>

    </main>
  )
}
