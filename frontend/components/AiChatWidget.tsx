'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Minimize2, Maximize2, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hi! I am your project assistant. Ask me anything about the board or tasks.' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Fetch context (e.g., current board summary? For now, we just pass the query)
      // Ideally, we'd pass some project context ID if we are on a specific page.
      // But this widget is global. Let's assume generic project questions or simple "help me plan".

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
            assistantType: 'business_analyst',
            input: userMsg
        })
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setMessages(prev => [...prev, { role: 'assistant', content: result.response }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className={`fixed right-6 z-50 bg-background shadow-xl rounded-lg border transition-all duration-200 ease-in-out ${isMinimized ? 'bottom-6 h-14 w-72' : 'bottom-6 w-80 md:w-96 h-[500px]'}`}>
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg cursor-pointer" onClick={() => !isMinimized && setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">AI Assistant</span>
        </div>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary/80" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}>
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary/80" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col h-[calc(100%-3rem)] bg-white dark:bg-slate-950">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                             <Avatar className="h-8 w-8">
                                <AvatarFallback>{m.role === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                             </Avatar>
                             <div className={`rounded-lg p-3 text-sm max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                 {m.content}
                             </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2">
                            <Avatar className="h-8 w-8"><AvatarFallback>AI</AvatarFallback></Avatar>
                            <div className="bg-muted rounded-lg p-3">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
