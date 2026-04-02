"use client"

import * as React from "react"
import { BalanceCard } from "@/components/ui/BalanceCard"
import { TransactionItem, type Transaction } from "@/components/ui/TransactionItem"
import { AddTransactionModal } from "@/components/ui/AddTransactionModal"
import { SupportChat } from "@/components/ui/SupportChat"
import { EXCHANGE_RATE } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Search, Filter, TrendingUp, TrendingDown, Layers, ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { isToday, isYesterday, format, startOfDay } from "date-fns"

import { useTheme } from "@/components/ThemeProvider"
import { Sun, Moon, Loader2, LogOut, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { getTransactions, createTransaction, deleteTransactionAction, seedExampleData } from "@/lib/actions"
import { signOutAction } from "@/lib/auth-actions"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [session, setSession] = React.useState<any>(null)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [filter, setFilter] = React.useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = React.useState("")
  const [activeGroup, setActiveGroup] = React.useState("All")
  const [isDataReady, setIsDataReady] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const { theme, toggleTheme } = useTheme()
  
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Check Session
  React.useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/session")
        const sessionData = await res.json()
        if (!sessionData || Object.keys(sessionData).length === 0) {
          router.push("/login")
        } else {
          setSession(sessionData)
        }
      } catch (err) {
        console.error("Auth check failed:", err)
        router.push("/login")
      }
    }
    checkAuth()
    setMounted(true)
  }, [router])

  // Load from Neon DB
  const loadData = React.useCallback(async () => {
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
  }, [])

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

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
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

  const groupedTransactions = React.useMemo(() => {
    const filtered = transactions
      .filter(t => activeGroup === 'All' ? true : t.group === activeGroup)
      .filter(t => filter === 'all' ? true : t.type === filter)
      .filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

    const groups: { [key: string]: Transaction[] } = {}
    filtered.forEach(t => {
      const dateKey = format(startOfDay(new Date(t.date)), 'yyyy-MM-dd')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [transactions, activeGroup, filter, search])

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

  return (
    <main className="min-h-screen bg-background pb-40 md:pb-24 font-sans text-foreground transition-colors duration-500">
      <nav className="glass sticky top-0 z-40 w-full overflow-hidden border-b border-border/40 dark:border-white/[0.03]">
        <div className="container max-w-4xl mx-auto px-4 sm:px-10 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-premium">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[11px] sm:text-xs font-black tracking-[0.3em] uppercase leading-none opacity-80">DailyPay</h1>
              <span className="text-[8px] sm:text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em] hidden xs:inline-block mt-0.5">
                {session?.user?.email ? `${session.user.name || 'User'} Vault` : "Syncing..."}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">{session?.user?.name || 'Private'}</span>
            </div>
            <div className="h-8 w-px bg-border/40 hidden sm:block mx-2" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => signOutAction()}
              className="rounded-xl text-foreground/20 hover:text-accent hover:bg-accent/5"
            >
              <LogOut size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-xl">
              {mounted ? (theme === "light" ? <Moon size={16} /> : <Sun size={16} />) : <div className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </nav>

      <div className="container max-w-4xl mx-auto px-4 sm:px-10 mt-8 sm:mt-16 space-y-12 sm:space-y-20">
        {/* Group Switcher */}
        <section className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/20 px-1">Manage Wallets</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
            {['All', 'Personal', ...existingGroups.filter(g => g !== 'Personal')].map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest snap-start transition-all border border-transparent",
                  activeGroup === g 
                    ? "bg-primary text-white shadow-luxury" 
                    : "bg-muted/40 dark:bg-white/[0.04] text-foreground/30 hover:text-foreground/60"
                )}
              >
                {g}
              </button>
            ))}
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

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
          <BalanceCard title="Net Assets" amountUSD={balanceUSD} type="balance" history={balanceHistory} className="md:col-span-2 lg:col-span-3 shadow-luxury" />
          <BalanceCard title="Earnings" amountUSD={incomeUSD} type="income" history={incomeHistory} />
          <BalanceCard title="Spending" amountUSD={expenseUSD} type="expense" history={expenseHistory} />
          <BalanceCard title="Account Goal" amountUSD={balanceUSD / 30} type="balance" className="hidden lg:block opacity-20 grayscale" />
        </section>

        <section className="space-y-10 sm:space-y-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 sm:gap-6">
            <div className="space-y-1.5 px-1">
              <h2 className="text-[10px] sm:text-xs font-black tracking-[0.4em] uppercase text-foreground/40 flex items-center gap-2.5">
                <Layers className="h-4 w-4 opacity-30 text-primary" /> {activeGroup} Activity
              </h2>
            </div>
            <div className="flex p-1 bg-muted/40 dark:bg-white/[0.03] rounded-2xl gap-1 h-10 border border-transparent dark:border-white/[0.02]">
              {['all', 'income', 'expense'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn("px-8 text-[9px] uppercase font-black tracking-widest rounded-xl transition-all", filter === f ? "bg-white dark:bg-white/[0.05] text-foreground shadow-sm" : "text-foreground/30 hover:text-foreground/60")}
                >
                  {f}
                </button>
              ))}
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
                className="space-y-16 sm:space-y-24"
              >
                {groupedTransactions.map(([dateKey, groupTransactions]) => {
                  const totals = getGroupTotals(groupTransactions)
                  return (
                    <div key={dateKey} className="space-y-8 sm:space-y-12">
                      <div className="sticky top-16 sm:top-20 z-30 py-5 bg-background/80 backdrop-blur-2xl flex items-center justify-between border-b border-border/40 dark:border-white/[0.03]">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/20">{getDateLabel(dateKey)}</h3>
                        <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest opacity-40">
                          <span className="text-primary">+${totals.income.toFixed(2)}</span>
                          <span className="text-accent">-${totals.expense.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:gap-5">
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
        <AddTransactionModal onAdd={addTransaction} existingGroups={existingGroups} />
      </div>

      <div className="lg:hidden">
        <nav className="glass fixed bottom-0 left-0 right-0 h-24 z-50 px-8 flex items-center justify-between rounded-t-[2.5rem] border-t border-border/40 dark:border-white/[0.03] shadow-luxury">
          <button className="flex flex-col items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Home</span></button>
          <div className="relative -top-10"><AddTransactionModal onAdd={addTransaction} existingGroups={existingGroups} /></div>
          <button className="flex flex-col items-center gap-2 text-foreground/20" onClick={() => setSearch("")}><Layers className="h-5 w-5" /><span className="text-[8px] font-black uppercase tracking-[0.2em]">Reset</span></button>
        </nav>
      </div>

      <SupportChat 
        currentUserId={session?.user?.id} 
        isAdmin={session?.user?.isAdmin} 
      />
    </main>
  )
}
