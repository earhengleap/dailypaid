"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, Mail, Lock, User, ArrowRight, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card } from "@/components/ui/Card"
import { signInAction, signUpAction } from "@/lib/auth-actions"
import { SupportChat } from "@/components/ui/SupportChat"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const [mode, setMode] = React.useState<"signIn" | "signUp">("signIn")
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)
    
    if (mode === "signIn") {
      const result = await signInAction(formData)
      if (result?.error) {
        setError(result.error)
        setIsPending(false)
      }
    } else {
      const result = await signUpAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess("Account created! Please sign in.")
        setMode("signIn")
      }
      setIsPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md z-10 space-y-12">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-luxury"
          >
            <TrendingUp size={32} />
          </motion.div>
          <div className="text-center space-y-2">
            <h1 className="text-xs font-black tracking-[0.5em] uppercase opacity-80">DailyPay</h1>
            <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.3em]">Minimalist Cloud Vault</p>
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-10 border border-white/40 dark:border-white/[0.05] bg-white/40 dark:bg-black/20 backdrop-blur-3xl shadow-luxury space-y-8">
            <div className="space-y-2">
              <h2 className="text-sm font-black tracking-widest uppercase text-foreground/80">
                {mode === "signIn" ? "Welcome Back" : "Start Your Journey"}
              </h2>
              <p className="text-[10px] font-black text-foreground/20 uppercase tracking-[0.2em]">
                {mode === "signIn" ? "Enter your credentials to access your vault" : "Create a secure account for your assets"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-accent/10 border border-accent/20 flex items-center gap-3 text-accent text-[10px] font-black uppercase tracking-wider"
                  >
                    <Info size={14} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-3 text-primary text-[10px] font-black uppercase tracking-wider"
                  >
                    <Info size={14} />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                {mode === "signUp" && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                    <Input 
                      name="name"
                      placeholder="Your Name" 
                      className="pl-12 h-14 rounded-2xl bg-white/50 dark:bg-white/[0.03] border-none text-[10px] font-black tracking-widest focus-visible:ring-primary/20"
                    />
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                  <Input 
                    required
                    name="email"
                    type="email"
                    placeholder="Email Address" 
                    className="pl-12 h-14 rounded-2xl bg-white/50 dark:bg-white/[0.03] border-none text-[10px] font-black tracking-widest focus-visible:ring-primary/20"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
                  <Input 
                    required
                    name="password"
                    type="password"
                    placeholder="Secure Password" 
                    className="pl-12 h-14 rounded-2xl bg-white/50 dark:bg-white/[0.03] border-none text-[10px] font-black tracking-widest focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button 
                  disabled={isPending}
                  className="w-full h-14 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-luxury transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isPending ? <Loader2 className="animate-spin" /> : (
                    <>
                      {mode === "signIn" ? "Authenticate" : "Create Account"}
                      <ArrowRight className="ml-3" size={14} />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signIn" ? "signUp" : "signIn")
                    setError(null)
                    setSuccess(null)
                  }}
                  className="text-[9px] font-black uppercase tracking-[0.3em] text-foreground/30 hover:text-primary transition-colors py-2"
                >
                  {mode === "signIn" ? "Request a new account" : "Login with existing vault"}
                </button>

                {mode === "signIn" && (
                  <button
                    type="button"
                    className="text-[9px] font-black uppercase tracking-[0.3em] text-accent/40 hover:text-accent transition-colors py-2"
                    onClick={() => {
                      // We'll let the SupportChat handle being open
                      const event = new CustomEvent('open-support-chat', { detail: { message: "I forgot my password and need assistance." } })
                      window.dispatchEvent(event)
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
            </form>
          </Card>
        </motion.div>
      </div>

      <SupportChat />
    </main>
  )
}
