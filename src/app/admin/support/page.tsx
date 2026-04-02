"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, User, Search, ShieldCheck, Loader2, ArrowLeft, Send } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { getAdminConversationsAction, getChatHistoryAction, sendMessageAction } from "@/lib/chat-actions"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function AdminSupportPage() {
  const [conversations, setConversations] = React.useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<any[]>([])
  const [inputValue, setInputValue] = React.useState("")
  const [isPending, setIsPending] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const loadConversations = React.useCallback(async () => {
    const data = await getAdminConversationsAction()
    setConversations(data)
  }, [])

  const loadHistory = React.useCallback(async () => {
    if (!selectedUserId) return
    const history = await getChatHistoryAction(selectedUserId)
    setMessages(history)
  }, [selectedUserId])

  React.useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, 10000)
    return () => clearInterval(interval)
  }, [loadConversations])

  React.useEffect(() => {
    if (selectedUserId) {
      loadHistory()
      const interval = setInterval(loadHistory, 3000)
      return () => clearInterval(interval)
    }
  }, [selectedUserId, loadHistory])

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!inputValue.trim() || !selectedUserId || isPending) return

    setIsPending(true)
    const result = await sendMessageAction(inputValue, selectedUserId)
    if (result.success) {
      setInputValue("")
      loadHistory()
    }
    setIsPending(false)
  }

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-background p-6 lg:p-10 font-sans flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-premium">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.4em] opacity-80">Admin Command Center</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/20">Support & Security Infrastructure</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => window.location.href = "/"} className="rounded-2xl gap-3 text-[10px] uppercase font-black tracking-widest hidden sm:flex">
          <ArrowLeft size={14} /> Back to Vault
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto w-full flex-1 min-h-[600px]">
        {/* Sidebar: Conversations List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/20" size={16} />
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH SESSIONS..." 
              className="w-full h-14 rounded-2xl bg-white/40 dark:bg-white/[0.03] border-none pl-12 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] scrollbar-none pr-1">
            {filteredConversations.length === 0 ? (
              <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
                <MessageSquare size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest">No Active Sessions</span>
              </div>
            ) : (
              filteredConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedUserId(c.id)}
                  className={cn(
                    "w-full p-6 rounded-[2rem] border transition-all text-left group",
                    selectedUserId === c.id 
                      ? "bg-primary text-white border-primary shadow-luxury" 
                      : "bg-white/40 dark:bg-white/[0.02] border-white/40 dark:border-white/[0.05] hover:bg-white/60 dark:hover:bg-white/[0.05]"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      selectedUserId === c.id ? "bg-white/20" : "bg-primary/10 text-primary"
                    )}>
                      <User size={18} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-[10px] font-black uppercase tracking-widest truncate">{c.name || 'Anonymous'}</h4>
                      <p className={cn(
                        "text-[8px] font-bold uppercase tracking-widest truncate mt-1",
                        selectedUserId === c.id ? "opacity-60" : "opacity-30"
                      )}>
                        {c.sentMessages[0]?.content || 'Empty Session'}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-8 flex flex-col bg-white/40 dark:bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/40 dark:border-white/[0.05] shadow-luxury overflow-hidden h-[650px]">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="p-8 border-b border-white/20 dark:border-white/[0.05] flex items-center justify-between">
                <div>
                  <h2 className="text-[11px] font-black uppercase tracking-[0.3em]">SECURE CHANNEL</h2>
                  <p className="text-[8px] font-black uppercase tracking-widest text-foreground/20 mt-1">INCIDENT RESPONSE INFRASTRUCTURE</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Live Encrypted</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-none">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[80%] gap-3",
                      msg.senderId !== selectedUserId ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "p-5 rounded-[2rem] text-[12px] font-bold leading-relaxed shadow-sm",
                      msg.senderId !== selectedUserId 
                        ? "bg-primary text-white rounded-tr-none" 
                        : "bg-white/60 dark:bg-white/[0.04] rounded-tl-none border border-white/40 dark:border-white/[0.05]"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] font-black opacity-20 uppercase tracking-widest">
                      {format(new Date(msg.createdAt), 'p')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendReply} className="p-8 border-t border-white/20 dark:border-white/[0.05] flex gap-4">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="AUTHORIZE REPLY..."
                  className="flex-1 bg-white/60 dark:bg-white/[0.03] border-none rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest placeholder:text-foreground/20 outline-none focus:ring-1 focus:ring-primary/20"
                />
                <Button 
                  type="submit" 
                  disabled={!inputValue.trim() || isPending}
                  className="rounded-2xl h-14 px-8 text-[10px] font-black uppercase tracking-[0.2em] shadow-premium"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <><Send size={14} className="mr-3" /> Execute</>}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-6 grayscale">
              <ShieldCheck size={80} />
              <div className="text-center space-y-2">
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em]">Awaiting Selection</h3>
                <p className="text-[9px] font-black uppercase tracking-widest">Select an active session to monitor infrastructure</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
