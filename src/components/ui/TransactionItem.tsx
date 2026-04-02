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

  return (
    <div className="flex items-center justify-between p-4 sm:p-5 bg-transparent hover:bg-card/40 dark:hover:bg-white/[0.02] rounded-2xl transition-all duration-500 group haptic-active select-none border border-transparent hover:border-white/40 dark:hover:border-white/[0.05]">
      <div className="flex items-center gap-5">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
          transaction.type === 'income' ? "bg-primary/[0.05] text-primary" : "bg-accent/[0.05] text-accent"
        )}>
          {transaction.type === 'income' ? <ArrowUpRight className="h-5 w-5 opacity-70" /> : <ArrowDownLeft className="h-5 w-5 opacity-70" />}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black text-foreground/90 uppercase tracking-[0.15em] leading-none">{transaction.title}</p>
          <p className="text-[9px] font-black text-foreground/20 uppercase tracking-[0.2em]">{format(new Date(transaction.date), 'HH:mm')}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right space-y-0.5">
          <p className={cn(
            "text-sm font-black tracking-tight tabular-nums",
            transaction.type === 'income' ? "text-primary/90" : "text-accent/90"
          )}>
            {transaction.type === 'income' ? '+' : '-'}{amountUSD.toFixed(2)}
          </p>
          <p className="text-[9px] font-black text-foreground/10 uppercase tracking-tighter tabular-nums">
            {formatCurrency(amountRiel, 'KHR')}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 opacity-0 group-hover:opacity-100 transition-all text-foreground/10 hover:text-accent hover:bg-accent/[0.03] rounded-xl"
          onClick={() => onDelete(transaction.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
