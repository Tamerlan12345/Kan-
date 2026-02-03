'use client'

// Version: Fix CORS deploy

import React, { useState, useEffect } from 'react'
import { X, Send, Minimize2, Maximize2, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Security: API Keys are handled on server side.
// Authorization header is used for user identification.

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("AI Widget Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
          <div className="fixed bottom-6 right-6 p-4 bg-red-100 border border-red-300 rounded shadow-lg text-red-800 text-sm">
              AI Widget crashed. <button onClick={() => this.setState({ hasError: false })} className="underline">Reset</button>
          </div>
      );
    }
    return this.props.children;
  }
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
    </div>
  );
}

export function AiChatWidget() {
  return (
      <ErrorBoundary>
          <AiChatWidgetContent />
      </ErrorBoundary>
  )
}

function AiChatWidgetContent() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Привет! Я ваш AI ассистент. Спрашивайте о проектах и задачах.' }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const scrollToBottom = () => {
      const last = document.getElementById('last-message');
      if (last) last.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [messages, isLoading, isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim()) return

    const userMsg = input
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setInput('')
    setIsLoading(true)

    try {
      // Proxy request through Next.js API route to avoid CORS and handle auth securely
      // Verified: API path is absolute to prevent relative path errors
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Authorization header is handled by the server-side proxy using cookies
        },
        body: JSON.stringify({
            assistantType: 'business_analyst',
            input: userMsg
        })
      })

      if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
      }

      const result = await response.json()

      let aiResponse = "";
      if (result.response) {
          if (typeof result.response === 'string') {
               aiResponse = result.response;
          } else {
               aiResponse = JSON.stringify(result.response);
          }
      } else if (result.error) {
          throw new Error(result.error);
      } else {
          aiResponse = "Received empty response.";
      }

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: "Извините, не удалось связаться с сервером." }])
      toast.error("Ошибка AI ассистента");
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg p-0 bg-slate-900 hover:bg-slate-800 text-white border-2 border-white"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className={`fixed right-6 z-50 bg-white shadow-xl rounded-lg border border-slate-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden ring-1 ring-black/5 ${isMinimized ? 'bottom-6 h-12 w-72' : 'bottom-6 w-[90vw] md:w-96 h-[80vh] md:h-[600px]'}`}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 cursor-pointer shrink-0"
        onClick={() => !isMinimized && setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Bot className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm text-slate-900">AI Assistant</span>
        </div>
        <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}>
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}>
                <X className="h-4 w-4" />
            </Button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 bg-white">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-4">
                    {messages.map((m, i) => (
                        <div key={i} id={i === messages.length - 1 ? "last-message" : undefined} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                             <Avatar className="h-8 w-8 border border-slate-100">
                                <AvatarFallback className="text-xs bg-slate-50 text-slate-600">{m.role === 'user' ? 'Вы' : 'AI'}</AvatarFallback>
                             </Avatar>
                             <div className={cn(
                                "rounded-lg p-3 text-sm max-w-[85%] break-words shadow-sm",
                                m.role === 'user'
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-50 text-slate-700 border border-slate-100"
                             )}>
                                 {m.content}
                             </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2">
                            <Avatar className="h-8 w-8 border border-slate-100"><AvatarFallback className="text-xs bg-slate-50 text-slate-600">AI</AvatarFallback></Avatar>
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t border-slate-100 bg-slate-50/30 shrink-0">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Задайте вопрос..."
                        className="flex-1 bg-white border-slate-200"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="bg-slate-900 hover:bg-slate-800 text-white shrink-0">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
