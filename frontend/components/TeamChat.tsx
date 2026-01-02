import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DICTIONARY } from '@/lib/dictionaries'
import { toast } from 'sonner'

interface Message {
    id: string
    content: string
    created_at: string
    user_id: string
    user?: {
        full_name: string
        avatar_url: string | null
    }
}

interface TeamChatProps {
    projectId: string
    className?: string
}

export function TeamChat({ projectId, className }: TeamChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    useEffect(() => {
        const fetchUser = async () => {
             const { data: { user } } = await supabase.auth.getUser()
             setCurrentUserId(user?.id || null)
        }
        fetchUser()
    }, [])

    useEffect(() => {
        if (!projectId) return

        const fetchMessages = async () => {
            try {
                const { data, error } = await supabase
                    .schema('app_projects')
                    .from('team_messages')
                    .select(`
                        *,
                        user:user_id (
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true })

                if (error) throw error
                // Map the joined user data correctly.
                // Note: The select above returns user data as an object in the 'user' field if configured in types,
                // but raw Supabase response might need casting or handling if the types aren't perfect.
                // Assuming standard Supabase join behavior.
                setMessages(data as unknown as Message[])
            } catch (error) {
                console.error('Error fetching messages:', error)
                toast.error(DICTIONARY.errors.fetch_failed)
            } finally {
                setLoading(false)
            }
        }

        fetchMessages()

        const channel = supabase
            .channel(`team_chat_${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'app_projects',
                    table: 'team_messages',
                    filter: `project_id=eq.${projectId}`
                },
                async (payload) => {
                    // Fetch user details for the new message
                    const { data: userData } = await supabase
                        .schema('app_auth')
                        .from('users')
                        .select('full_name, avatar_url')
                        .eq('id', payload.new.user_id)
                        .single()

                    const newMsg: Message = {
                        id: payload.new.id,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                        user_id: payload.new.user_id,
                        user: userData ? { full_name: userData.full_name, avatar_url: userData.avatar_url } : undefined
                    }

                    setMessages(prev => [...prev, newMsg])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [projectId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !currentUserId) return

        setSending(true)
        try {
            const { error } = await supabase
                .schema('app_projects')
                .from('team_messages')
                .insert({
                    project_id: projectId,
                    user_id: currentUserId,
                    content: newMessage
                })

            if (error) throw error
            setNewMessage('')
        } catch (error) {
            console.error('Error sending message:', error)
            toast.error("Failed to send message")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className={`flex flex-col h-full bg-white border-l ${className}`}>
            <div className="p-4 border-b font-medium text-sm flex items-center justify-between">
                <span>Командный чат</span>
                <span className="text-xs text-muted-foreground">{messages.length} сообщений</span>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                         <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-10">
                        Нет сообщений. Начните обсуждение!
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isMe = msg.user_id === currentUserId
                            return (
                                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <Avatar className="h-8 w-8 mt-1">
                                        <AvatarImage src={msg.user?.avatar_url || undefined} />
                                        <AvatarFallback>{msg.user?.full_name?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`rounded-lg p-3 text-sm ${
                                            isMe
                                            ? 'bg-primary text-primary-foreground rounded-tr-none'
                                            : 'bg-muted rounded-tl-none'
                                        }`}>
                                            {msg.content}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground mt-1">
                                            {msg.user?.full_name} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t bg-gray-50/50">
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Напишите сообщение..."
                        className="bg-white"
                        disabled={sending}
                    />
                    <Button size="icon" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
