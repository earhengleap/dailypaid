import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { formatCurrency, EXCHANGE_RATE } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Wallet } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface BalanceCardProps {
  title: string
  amountUSD: number
  type: 'income' | 'expense' | 'balance'
  className?: string
  history?: number[]
}

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  if (!data?.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 80 - 10
  }))

  const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`

  return (
    <div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-700">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </svg>
    </div>
  )
}

export function BalanceCard({ title, amountUSD, type, className, history = [] }: BalanceCardProps) {
  const amountRiel = amountUSD * EXCHANGE_RATE
  
  const iconMap = {
    income: <ArrowUpRight className="h-3.5 w-3.5 text-primary opacity-60" />,
    expense: <ArrowDownLeft className="h-3.5 w-3.5 text-accent opacity-60" />,
    balance: <Wallet className="h-3.5 w-3.5 text-primary opacity-60" />,
  }

  const colors = {
    income: "#4e46e5",
    expense: "#f43f5e",
    balance: "#4e46e5",
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn("h-full group", className)}
    >
      <Card className={cn(
        "relative h-full overflow-hidden border border-white/40 dark:border-white/[0.05] bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl shadow-premium transition-all duration-500",
      )}>
        <Sparkline data={history.length > 0 ? history : [0, 0, 0]} color={colors[type]} />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 sm:p-7 pb-0 relative z-10">
          <div className="flex items-center gap-2">
            <CardTitle className="text-[10px] font-black text-foreground/40 uppercase tracking-[0.3em]">
              {title}
            </CardTitle>
          </div>
          <div className="p-2 rounded-xl bg-background/30 dark:bg-white/[0.03] border border-white/20 dark:border-white/[0.03]">
            {iconMap[type]}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-6 sm:p-7 pt-5 relative z-10">
          <div className="flex flex-col gap-0.5">
            <div className={cn(
              "font-black tracking-tighter leading-tight tabular-nums text-foreground/90",
              type === 'balance' ? "text-4xl xs:text-5xl" : "text-2xl sm:text-3xl"
            )}>
              {formatCurrency(amountUSD, 'USD')}
            </div>
            <div className="text-[10px] sm:text-xs font-bold text-foreground/20 tracking-tight tabular-nums">
              {formatCurrency(amountRiel, 'KHR')}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
