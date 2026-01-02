import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from 'sonner'
import { Skeleton } from "@/components/ui/skeleton"

interface Message {
    id: string
    content: string
    created_at: string
    user_id: string
    user?: {
        full_name: string
        avatar_url: string | null
    } | null
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

        let isMounted = true

        const fetchMessages = async () => {
            try {
                const { data: msgs, error: msgError } = await supabase
                    .schema('app_projects')
                    .from('team_messages')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true })

                if (msgError) throw msgError

                if (!msgs || msgs.length === 0) {
                    if (isMounted) setMessages([])
                    return
                }

                const userIds = Array.from(new Set(msgs.map(m => m.user_id)))
                const { data: users, error: userError } = await supabase
                    .schema('app_auth')
                    .from('users')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds)

                if (userError) throw userError

                const userMap = new Map(users?.map(u => [u.id, u]))

                const combinedMessages = msgs.map(m => ({
                    ...m,
                    user: userMap.get(m.user_id) || { full_name: 'Unknown', avatar_url: null }
                }))

                if (isMounted) setMessages(combinedMessages)

            } catch (error) {
                console.error('Error fetching messages:', error)
                toast.error("Не удалось загрузить чат")
            } finally {
                if (isMounted) setLoading(false)
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
                        user: userData ? { full_name: userData.full_name, avatar_url: userData.avatar_url } : null
                    }

                    setMessages(prev => [...prev, newMsg])
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [projectId])

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, loading])

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

            if (error) {
                 throw error
            } else {
                setNewMessage('')
            }
        } catch (error) {
            console.error('Error sending message:', error)
            toast.error("Не удалось отправить сообщение")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className={`flex flex-col h-full bg-slate-50 ${className}`}>
            <div className="p-4 border-b bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <span className="font-semibold text-slate-800">Командный чат</span>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                             <div key={i} className={`flex items-start gap-3 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <Skeleton className="h-10 w-24 rounded-2xl" />
                             </div>
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground opacity-50">
                        <p>Здесь пока тихо...</p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-4">
                        {messages.map((msg, i) => {
                            const isMe = msg.user_id === currentUserId
                            const userInfo = msg.user
                            const fullName = userInfo?.full_name || 'Unknown'
                            const avatarUrl = userInfo?.avatar_url

                            // Check if next message is from same user (to group bubbles)
                            // const isNextSame = messages[i+1]?.user_id === msg.user_id

                            return (
                                <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <Avatar className="h-8 w-8 mt-auto border border-white shadow-sm">
                                        <AvatarImage src={avatarUrl || undefined} />
                                        <AvatarFallback className="text-[9px] bg-slate-100 text-slate-500">
                                            {fullName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {!isMe && (
                                            <span className="text-[10px] text-slate-400 ml-1 mb-1">
                                                {fullName}, {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                        {isMe && (
                                            <span className="text-[10px] text-slate-400 mr-1 mb-1">
                                                You, {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                        <div
                                            className={`
                                                px-4 py-2 text-sm shadow-sm transition-all
                                                ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                                                    : 'bg-white text-slate-800 border border-slate-100 rounded-2xl rounded-tl-sm'
                                                }
                                            `}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t bg-white">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                    className="flex gap-2"
                >
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Сообщение..."
                        className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 rounded-full px-4"
                        disabled={sending}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={sending || !newMessage.trim()}
                        className={`rounded-full aspect-square h-10 w-10 shrink-0 transition-all ${
                            sending || !newMessage.trim()
                            ? 'bg-slate-100 text-slate-400 hover:bg-slate-100'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                        }`}
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" />}
                    </Button>
                </form>
            </div>
        </div>
    )
}
