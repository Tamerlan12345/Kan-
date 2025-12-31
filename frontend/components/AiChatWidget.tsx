'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, X, Send, Minimize2, Maximize2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
  // Removed viewportRef since we can't easily attach it to shadcn ScrollArea without modifying it
  // and we have a fallback using last-message id

  const scrollToBottom = () => {
      // Fallback: use the id of the last message
      const last = document.getElementById('last-message');
      if (last) last.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    // Small delay to allow DOM to update
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
      const { data: { session } } = await supabase.auth.getSession()

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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 transition-transform hover:scale-110"
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className={`fixed right-6 z-50 bg-background shadow-xl rounded-lg border transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${isMinimized ? 'bottom-6 h-14 w-72' : 'bottom-6 w-[90vw] md:w-96 h-[80vh] md:h-[600px]'}`}>
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground cursor-pointer shrink-0" onClick={() => !isMinimized && setIsMinimized(!isMinimized)}>
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
        <div className="flex flex-col flex-1 bg-background">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pb-4">
                    {messages.map((m, i) => (
                        <div key={i} id={i === messages.length - 1 ? "last-message" : undefined} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                             <Avatar className="h-8 w-8 border border-border">
                                <AvatarFallback className="text-xs">{m.role === 'user' ? 'Вы' : 'AI'}</AvatarFallback>
                             </Avatar>
                             <div className={`rounded-lg p-3 text-sm max-w-[85%] break-words ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                                 {m.content}
                             </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-2">
                            <Avatar className="h-8 w-8 border border-border"><AvatarFallback className="text-xs">AI</AvatarFallback></Avatar>
                            <div className="bg-muted rounded-lg p-4 flex items-center">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <div className="p-3 border-t bg-background shrink-0">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
                    <Input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Задайте вопрос..."
                        className="flex-1"
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
