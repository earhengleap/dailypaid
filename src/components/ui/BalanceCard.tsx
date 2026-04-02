"use client"

import * as React from "react"
import { formatCurrency, EXCHANGE_RATE } from "@/lib/utils"
import { ArrowUpRight, ArrowDownLeft, Wallet, Target } from "lucide-react"
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
  if (!data?.length || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 70 - 15
  }))

  const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`

  return (
    <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none opacity-15 group-hover:opacity-30 transition-opacity duration-700">
      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
    </div>
  )
}

export function BalanceCard({ title, amountUSD, type, className, history = [] }: BalanceCardProps) {
  const amountRiel = amountUSD * EXCHANGE_RATE
  
  const iconMap = {
    income: <ArrowUpRight className="h-4 w-4" />,
    expense: <ArrowDownLeft className="h-4 w-4" />,
    balance: <Wallet className="h-4 w-4" />,
  }

  const colorMap = {
    income: {
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
      spark: "#10b981",
    },
    expense: {
      accent: "text-rose-500",
      bg: "bg-rose-500/10 dark:bg-rose-400/10",
      spark: "#f43f5e",
    },
    balance: {
      accent: "text-indigo-500",
      bg: "bg-indigo-500/10 dark:bg-indigo-400/10",
      spark: "#6366f1",
    },
  }

  const colors = colorMap[type]

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("group", className)}
    >
      <div className={cn(
        "relative h-full overflow-hidden rounded-2xl",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200/80 dark:border-zinc-800",
        "shadow-sm hover:shadow-md dark:shadow-none",
        "transition-shadow duration-300",
        "p-5 sm:p-6",
      )}>
        <Sparkline data={history.length > 1 ? history : []} color={colors.spark} />
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {title}
          </span>
          <div className={cn("p-1.5 rounded-lg", colors.bg, colors.accent)}>
            {iconMap[type]}
          </div>
        </div>

        {/* Amount */}
        <div className="relative z-10 space-y-1">
          <div className={cn(
            "font-extrabold tracking-tight tabular-nums",
            type === 'balance' ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl",
            "text-zinc-900 dark:text-zinc-100"
          )}>
            {formatCurrency(amountUSD, 'USD')}
          </div>
          <div className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 tabular-nums tracking-tight">
            {formatCurrency(amountRiel, 'KHR')}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
