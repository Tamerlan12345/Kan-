import { useState } from 'react'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Send, Sparkles, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usePermission } from '@/hooks/usePermission'

type Task = Database['app_tasks']['Tables']['tasks']['Row']

interface TaskModalProps {
  task: Task
  onClose: () => void
}

interface ProposedSubtask {
    title: string
    description: string
    estimated_hours: number
    selected: boolean
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const queryClient = useQueryClient()
  const { role } = usePermission()

  // Only Admin/Team Lead can use AI Decompose
  // Role Hierarchy: observer(0), junior(1), middle(2), senior(3), team_lead(4), admin(5)
  // "Admin/Team Lead: See all buttons (..., AI decomposition)"
  const canDecompose = role === 'admin' || role === 'team_lead'

  // Task Decomposition State
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [proposedSubtasks, setProposedSubtasks] = useState<ProposedSubtask[] | null>(null)

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMsg = chatInput
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatInput('')
    setIsAiLoading(true)

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
                input: `Context Task: ${task.title}. ${task.description}. User Query: ${userMsg}`
            })
        })

        const result = await response.json()
        if (result.error) throw new Error(result.error)

        setMessages(prev => [...prev, { role: 'assistant', content: result.response }])

    } catch (error) {
        console.error(error)
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }])
    } finally {
        setIsAiLoading(false)
    }
  }

  const handleDecomposeTask = async () => {
      setIsDecomposing(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                assistantType: 'task_decomposer',
                input: JSON.stringify({
                    title: task.title,
                    description: task.description || ''
                })
            })
        })

        const result = await response.json()

        let jsonStr = result.response
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')

        const subtasks = JSON.parse(jsonStr)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksArray = Array.isArray(subtasks) ? subtasks : (subtasks.subtasks || [])

        // Add 'selected' property
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProposedSubtasks(tasksArray.map((t: any) => ({ ...t, selected: true })))

      } catch (error) {
          console.error("Decomposition error:", error)
          alert("Failed to decompose task. AI might have returned invalid format.")
      } finally {
          setIsDecomposing(false)
      }
  }

  const handleUpdateProposedTask = (index: number, field: keyof ProposedSubtask, value: string | number | boolean) => {
      if (!proposedSubtasks) return
      const updated = [...proposedSubtasks]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = { ...updated[index] } as any
      item[field] = value
      updated[index] = item
      setProposedSubtasks(updated)
  }

  const handleAcceptSubtasks = async () => {
      if (!proposedSubtasks) return

      const selectedTasks = proposedSubtasks.filter(t => t.selected)
      if (selectedTasks.length === 0) return

      const { data: { user } } = await supabase.auth.getUser()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inserts = selectedTasks.map((st: any) => ({
          board_id: task.board_id,
          column_id: task.column_id,
          organization_id: task.organization_id,
          title: st.title,
          description: st.description,
          estimated_hours: st.estimated_hours,
          parent_task_id: task.id,
          created_by: user?.id,
          status: 'todo',
          weight: task.weight
      }))

      const { error } = await supabase.schema('app_tasks').from('tasks').insert(inserts)
      if (error) {
          console.error(error)
          alert("Failed to create subtasks")
      } else {
          await supabase.schema('app_tasks').from('tasks').update({
              ai_decomposition: proposedSubtasks // Save full history? or just what we did?
          }).eq('id', task.id)

          setProposedSubtasks(null)
          alert("Subtasks created successfully!")
          queryClient.invalidateQueries({ queryKey: ['tasks', task.board_id] })
          // Optionally close modal
          // onClose()
      }
  }

  return (
    <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-xl font-bold">{task.title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
             {/* Left Main Content */}
             <div className="flex-1 overflow-y-auto p-6 border-r">
                 <div className="mb-6 space-y-4">
                     <div>
                         <h3 className="text-sm font-medium text-gray-500">Description</h3>
                         <div className="mt-1 text-sm">{task.description || "No description provided."}</div>
                     </div>
                     <div className="flex gap-4">
                         <div>
                             <h3 className="text-sm font-medium text-gray-500">Status</h3>
                             <Badge variant="outline" className="mt-1 uppercase">{task.status}</Badge>
                         </div>
                         <div>
                             <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                             <Badge variant={task.priority === 'P1' ? 'destructive' : 'secondary'} className="mt-1">{task.priority}</Badge>
                         </div>
                     </div>
                 </div>

                 {/* AI Actions Area */}
                 {canDecompose && (
                    <div className="rounded-lg border bg-slate-50 p-4">
                        <h3 className="flex items-center text-sm font-semibold text-purple-700">
                            <Sparkles className="mr-2 h-4 w-4" /> AI Assistant
                        </h3>
                        <div className="mt-3 flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleDecomposeTask}
                                disabled={isDecomposing}
                            >
                                {isDecomposing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Thinking...
                                    </>
                                ) : (
                                    "Decompose Task"
                                )}
                            </Button>
                        </div>

                        {/* Skeleton Loading State (Visual) */}
                        {isDecomposing && (
                            <div className="mt-4 space-y-3">
                                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                                <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
                            </div>
                        )}

                        {/* Proposed Subtasks UI */}
                        {proposedSubtasks && (
                            <div className="mt-4 rounded border bg-white p-3 shadow-sm">
                                <h4 className="mb-2 text-sm font-medium">Proposed Subtasks</h4>
                                <ul className="space-y-3">
                                    {proposedSubtasks.map((st, idx) => (
                                        <li key={idx} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                                            <Checkbox
                                                checked={st.selected}
                                                onCheckedChange={(c) => handleUpdateProposedTask(idx, 'selected', !!c)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    value={st.title}
                                                    onChange={e => handleUpdateProposedTask(idx, 'title', e.target.value)}
                                                    className="h-8 text-sm font-medium"
                                                />
                                                <Input
                                                    value={st.description}
                                                    onChange={e => handleUpdateProposedTask(idx, 'description', e.target.value)}
                                                    className="h-7 text-xs text-gray-500"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">Est. Hours:</span>
                                                    <Input
                                                        type="number"
                                                        value={st.estimated_hours}
                                                        onChange={e => handleUpdateProposedTask(idx, 'estimated_hours', parseFloat(e.target.value))}
                                                        className="h-6 w-20 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setProposedSubtasks(null)}>Discard</Button>
                                    <Button size="sm" onClick={handleAcceptSubtasks}>
                                        Create {proposedSubtasks.filter(t => t.selected).length} Tasks
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                 )}
             </div>

             {/* Right Sidebar - Chat */}
             <div className="w-80 flex flex-col bg-gray-50 border-l">
                 <div className="p-4 border-b font-medium text-sm">Comments & AI Chat</div>
                 <ScrollArea className="flex-1 p-4">
                     <div className="space-y-4">
                         {messages.map((m, i) => (
                             <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                 <Avatar className="h-6 w-6 mt-1">
                                     <AvatarFallback>{m.role === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                                 </Avatar>
                                 <div className={`rounded-lg p-3 text-sm max-w-[85%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white border shadow-sm'}`}>
                                     {m.content}
                                 </div>
                             </div>
                         ))}
                         {isAiLoading && (
                             <div className="flex gap-2">
                                 <Avatar className="h-6 w-6 mt-1"><AvatarFallback>AI</AvatarFallback></Avatar>
                                 <div className="rounded-lg p-3 text-sm bg-white border shadow-sm">
                                     <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                 </div>
                             </div>
                         )}
                     </div>
                 </ScrollArea>
                 <div className="p-3 border-t bg-white">
                     <div className="flex gap-2">
                         <Input
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            placeholder="Ask AI..."
                            className="text-sm"
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                         />
                         <Button size="icon" onClick={handleSendMessage}>
                             <Send className="h-4 w-4" />
                         </Button>
                     </div>
                 </div>
             </div>
        </div>
    </div>
  )
}
