"use client"

import * as React from "react"
import { formatCurrency, EXCHANGE_RATE } from "@/lib/utils"
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Trash2
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { motion } from "framer-motion"

export interface Transaction {
  id: string
  title: string
  amount: number
  currency: 'USD' | 'KHR'
  type: 'income' | 'expense'
  date: number
  category?: string
  group: string
}

interface TransactionItemProps {
  transaction: Transaction
  onDelete: (id: string) => void
}

export function TransactionItem({ transaction, onDelete }: TransactionItemProps) {
  const isUSD = transaction.currency === 'USD'
  const amountUSD = isUSD ? transaction.amount : transaction.amount / EXCHANGE_RATE
  const amountRiel = isUSD ? transaction.amount * EXCHANGE_RATE : transaction.amount

  const colors = {
    income: {
      accent: "text-emerald-500",
      bg: "bg-emerald-500/10 dark:bg-emerald-400/10",
    },
    expense: {
      accent: "text-rose-500",
      bg: "bg-rose-500/10 dark:bg-rose-400/10",
    },
  }

  const currentColors = colors[transaction.type]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ x: 4 }}
      className="group relative flex items-center justify-between p-4 bg-white dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl transition-all duration-300 hover:shadow-sm hover:border-zinc-200 dark:hover:border-zinc-700 select-none"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
          currentColors.bg,
          currentColors.accent
        )}>
          {transaction.type === 'income' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider leading-none">
            {transaction.title}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              {format(new Date(transaction.date), 'HH:mm')}
            </p>
            <span className="w-1 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <p className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">
              {transaction.group}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right flex flex-col items-end">
          <p className={cn(
            "text-sm font-extrabold tracking-tight tabular-nums leading-none",
            currentColors.accent
          )}>
            {transaction.type === 'income' ? '+' : '-'}{amountUSD.toFixed(2)}
          </p>
          <p className="text-[9px] font-bold text-zinc-300 dark:text-zinc-600 tabular-nums uppercase tracking-tighter mt-1">
            {formatCurrency(amountRiel, 'KHR')}
          </p>
        </div>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all text-zinc-300 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl border-none"
          onClick={() => onDelete(transaction.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  )
}
