import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DICTIONARY } from '@/lib/dictionaries'
import { toast } from 'sonner'
import { Skeleton } from "@/components/ui/skeleton"

interface Message {
    id: string
    content: string
    created_at: string
    user_id: string
    // Allow for flexibility in how the joined user data is returned (alias 'user' or table name 'users')
    user?: {
        full_name: string
        avatar_url: string | null
    } | null
    users?: {
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

        const fetchMessages = async () => {
            try {
                // Modified query to try to resolve the relationship issue.
                // Using 'users' which is the table name, assuming the FK is correctly set up.
                // We use 'users' instead of alias 'user:user_id' to see if auto-detection works better.
                const { data, error } = await supabase
                    .schema('app_projects')
                    .from('team_messages')
                    .select(`
                        *,
                        users (
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: true })

                if (error) throw error
                setMessages(data as unknown as Message[])
            } catch (error) {
                console.error('Error fetching messages:', error)
                // More friendly error message
                toast.error("Не удалось загрузить чат")
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
                    // Fetch user details for the new message because realtime payload doesn't include joins
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
                        users: userData ? { full_name: userData.full_name, avatar_url: userData.avatar_url } : null
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
    }, [messages, loading]) // Auto scroll on load too

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
                if (error.code === '42501' || error.message.includes('permission')) {
                     toast.error("Нет прав для отправки сообщения")
                } else {
                     throw error
                }
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
        <div className={`flex flex-col h-full bg-gray-50/30 ${className}`}>
            <div className="p-4 border-b font-medium text-sm flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <span className="font-semibold text-gray-700">Командный чат</span>
                <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">{messages.length}</span>
            </div>

            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="space-y-4 px-2">
                         <div className="flex items-start gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-[200px] rounded-lg rounded-tl-none" />
                            </div>
                         </div>
                         <div className="flex items-start gap-3 flex-row-reverse">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-[150px] rounded-lg rounded-tr-none" />
                            </div>
                         </div>
                         <div className="flex items-start gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-16 w-[250px] rounded-lg rounded-tl-none" />
                            </div>
                         </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[200px] text-center text-sm text-muted-foreground">
                        <p>Нет сообщений.</p>
                        <p className="text-xs mt-1 opacity-70">Будьте первым!</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-4">
                        {messages.map((msg) => {
                            const isMe = msg.user_id === currentUserId
                            // Handle both potential structures (aliased 'user' or table 'users')
                            const userInfo = msg.users || msg.user
                            const fullName = userInfo?.full_name || 'Unknown'
                            const avatarUrl = userInfo?.avatar_url

                            return (
                                <div key={msg.id} className={`flex gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}>
                                    <Avatar className="h-8 w-8 mt-1 border border-gray-200">
                                        <AvatarImage src={avatarUrl || undefined} />
                                        <AvatarFallback className="text-[10px] bg-gray-100 text-gray-500">
                                            {fullName.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className="flex items-center gap-2 mb-1 px-1">
                                            <span className="text-[10px] font-medium text-gray-500">
                                                {isMe ? 'Вы' : fullName}
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                            isMe
                                            ? 'bg-blue-600 text-white rounded-tr-sm'
                                            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                                        }`}>
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
                <div className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !sending && handleSendMessage()}
                        placeholder="Напишите сообщение..."
                        className="bg-gray-50 border-gray-200 focus-visible:ring-blue-500/20"
                        disabled={sending}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={sending || !newMessage.trim()}
                        className={sending ? 'opacity-70' : 'bg-blue-600 hover:bg-blue-700 text-white'}
                    >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
