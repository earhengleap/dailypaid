"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Loader2, User, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { sendMessageAction, getChatHistoryAction } from "@/lib/chat-actions"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface SupportChatProps {
  currentUserId?: string
  isAdmin?: boolean
  targetUserId?: string // If admin is replying to a specific user
}

export function SupportChat({ currentUserId, isAdmin, targetUserId }: SupportChatProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<any[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const loadHistory = React.useCallback(async () => {
    if (!isOpen) return
    const history = await getChatHistoryAction(targetUserId)
    setMessages(history)
  }, [isOpen, targetUserId])

  // Polling for "real-time" updates
  React.useEffect(() => {
    const handleOpenChat = (event: any) => {
      setIsOpen(true)
      if (event.detail?.message) {
        setInputValue(event.detail.message)
      }
    }

    window.addEventListener('open-support-chat', handleOpenChat)

    if (isOpen) {
      loadHistory()
      const interval = setInterval(loadHistory, 5000)
      return () => {
        clearInterval(interval)
        window.removeEventListener('open-support-chat', handleOpenChat)
      }
    }

    return () => window.removeEventListener('open-support-chat', handleOpenChat)
  }, [isOpen, loadHistory])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || isSending) return

    setIsSending(true)
    const result = await sendMessageAction(inputValue, targetUserId)
    if (result.success) {
      setInputValue("")
      loadHistory()
    }
    setIsSending(false)
  }

  return (
    <div className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 z-[100] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[320px] sm:w-[380px] h-[500px] bg-white/40 dark:bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/[0.05] shadow-luxury overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/20 dark:border-white/[0.05] flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-premium">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Support Vault</h3>
                  <p className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mt-1">Direct Secure Line</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-xl">
                <X size={18} className="opacity-40" />
              </Button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-none"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4 text-center">
                  <MessageCircle size={40} />
                  <p className="text-[9px] font-black uppercase tracking-[0.2em]">Start a secure conversation</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[85%] gap-2",
                      msg.senderId === currentUserId ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-3xl text-[11px] font-bold leading-relaxed shadow-sm",
                      msg.senderId === currentUserId 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white/50 dark:bg-white/[0.05] rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">
                      {format(new Date(msg.createdAt), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-6 border-t border-white/20 dark:border-white/[0.05] flex gap-3">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your secure message..."
                className="flex-1 bg-white/50 dark:bg-white/[0.03] border-none rounded-2xl px-5 text-[10px] font-bold placeholder:text-foreground/20 outline-none focus:ring-1 focus:ring-primary/20"
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim() || isSending}
                className="rounded-2xl h-12 w-12 shadow-premium shrink-0"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white shadow-luxury transition-all relative group",
          isOpen ? "bg-accent rotate-90" : "bg-primary"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? <X key="x" size={24} /> : <MessageCircle key="msg" size={24} />}
        </AnimatePresence>
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full border-2 border-white dark:border-black animate-pulse" />
        )}
      </motion.button>
    </div>
  )
}
