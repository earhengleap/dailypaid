"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { 
  Plus, 
  X, 
  Landmark, 
  DollarSign, 
  Wallet, 
  Utensils, 
  ShoppingBag, 
  Car, 
  HandCoins, 
  ReceiptText, 
  HeartPulse, 
  Layers 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface AddTransactionModalProps {
  onAdd: (transaction: { title: string, amount: number, currency: 'USD' | 'KHR', type: 'income' | 'expense', date: number, category: string, group: string }) => void
  existingGroups: string[]
}

export function AddTransactionModal({ onAdd, existingGroups }: AddTransactionModalProps) {
  const getLocalISOString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [isOpen, setIsOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [amount, setAmount] = React.useState("")
  const [date, setDate] = React.useState(getLocalISOString())
  const [currency, setCurrency] = React.useState<'USD' | 'KHR'>('USD')
  const [type, setType] = React.useState<'income' | 'expense'>('expense')
  const [group, setGroup] = React.useState("Personal")
  const [isAddingGroup, setIsAddingGroup] = React.useState(false)
  const [newGroup, setNewGroup] = React.useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !amount) return
    const finalGroup = isAddingGroup && newGroup.trim() ? newGroup.trim() : group
    onAdd({
      title,
      amount: parseFloat(amount),
      currency,
      type,
      category: 'General',
      date: new Date(date).getTime(),
      group: finalGroup
    })
    setTitle("")
    setAmount("")
    setDate(getLocalISOString())
    setNewGroup("")
    setIsAddingGroup(false)
    setIsOpen(false)
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        className="fixed bottom-24 right-6 md:bottom-8 md:right-8 h-12 w-12 md:h-14 md:w-14 rounded-2xl shadow-luxury transition-all hover:scale-110 active:scale-95 bg-primary text-white z-40 haptic-active border-none"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350, restDelta: 0.001 }}
              className="relative w-full md:max-w-md max-h-[95vh] overflow-y-auto scrollbar-none rounded-t-[2.5rem] md:rounded-[2.5rem] bg-card dark:bg-card backdrop-blur-3xl p-8 sm:p-10 shadow-luxury border-t md:border border-border/40 dark:border-white/[0.05]"
            >
              <div className="h-1.5 w-12 bg-foreground/10 rounded-full mx-auto mb-8 md:hidden" />
              
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <div>
                  <h2 className="text-xl font-black tracking-tight leading-none text-foreground/90">New Record</h2>
                  <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em] mt-2 leading-none">Record your movement</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-2xl hover:bg-foreground/5 transition-colors">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                <div className="flex p-1.5 bg-muted/50 dark:bg-white/[0.04] rounded-2xl gap-1.5 border border-border/10 dark:border-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300",
                      type === 'expense' ? "bg-white dark:bg-white/[0.1] text-accent shadow-sm" : "text-foreground/30 hover:text-foreground/60"
                    )}
                  >
                    Spending
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300",
                      type === 'income' ? "bg-white dark:bg-white/[0.1] text-primary shadow-sm" : "text-foreground/30 hover:text-foreground/60"
                    )}
                  >
                    Incoming
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50">Group / Wallet</label>
                    <button 
                      type="button"
                      onClick={() => setIsAddingGroup(!isAddingGroup)}
                      className={cn(
                        "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                        isAddingGroup ? "bg-accent/10 text-accent rotate-45" : "bg-primary/10 text-primary"
                      )}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {isAddingGroup ? (
                      <motion.div 
                        key="add-group"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex gap-2"
                      >
                        <Input 
                          placeholder="Group name (e.g. Work)" 
                          value={newGroup}
                          onChange={(e) => setNewGroup(e.target.value)}
                          className="h-10 px-4 rounded-xl bg-muted/30 dark:bg-white/[0.02] border-none text-[10px] font-bold"
                          autoFocus
                        />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="list-groups"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x"
                      >
                        {['Personal', ...existingGroups.filter(g => g !== 'Personal')].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGroup(g)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest snap-start transition-all border border-transparent",
                              group === g && !isAddingGroup
                                ? "bg-primary text-white shadow-premium" 
                                : "bg-muted/40 dark:bg-white/[0.04] text-foreground/30 hover:text-foreground/60"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 px-1">Description</label>
                  <Input 
                    placeholder="Brief description..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-12 px-5 rounded-2xl bg-muted/30 dark:bg-white/[0.02] border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-white/[0.05] transition-all text-xs font-bold text-foreground/90"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 xs:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 px-1">Currency</label>
                    <div className="flex p-1 bg-muted/30 dark:bg-white/[0.02] rounded-xl gap-1 h-12 border border-transparent dark:border-white/[0.01]">
                      <button
                        type="button"
                        onClick={() => setCurrency('USD')}
                        className={cn(
                          "flex-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                          currency === 'USD' ? "bg-white dark:bg-white/[0.1] text-foreground shadow-sm" : "text-foreground/20"
                        )}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrency('KHR')}
                        className={cn(
                          "flex-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                          currency === 'KHR' ? "bg-white dark:bg-white/[0.1] text-foreground shadow-sm" : "text-foreground/20"
                        )}
                      >
                        KHR
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 px-1">Amount</label>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-12 px-5 rounded-2xl bg-muted/30 dark:bg-white/[0.02] border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-white/[0.05] transition-all text-xs font-bold tabular-nums text-foreground/90"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-foreground/50 px-1">Date</label>
                  <Input 
                    type="datetime-local" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 px-5 rounded-2xl bg-muted/30 dark:bg-white/[0.02] border border-transparent focus:border-primary/20 focus:bg-white dark:focus:bg-white/[0.05] transition-all text-[10px] font-bold text-foreground/90"
                    required
                  />
                </div>

                <Button type="submit" className="w-full mt-6 h-14 text-xs font-black uppercase tracking-[0.2em] shadow-luxury rounded-2xl bg-primary hover:scale-[1.02] active:scale-95 transition-all text-white border-none">
                  Commit Record
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
