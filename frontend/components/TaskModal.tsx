import { useState } from 'react'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Send, Sparkles, Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Task = Database['app_tasks']['Tables']['tasks']['Row']

interface TaskModalProps {
  task: Task
  onClose: () => void
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const queryClient = useQueryClient()

  // Task Decomposition State
  const [isDecomposing, setIsDecomposing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [proposedSubtasks, setProposedSubtasks] = useState<any[] | null>(null)

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return

    const userMsg = chatInput
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setChatInput('')
    setIsAiLoading(true)

    try {
        // Call generic AI assistant (business_analyst or similar)
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
                assistantType: 'business_analyst', // Default to generic
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
                }) // Send as JSON string to help model understand structure if needed
            })
        })

        const result = await response.json()

        // Parse JSON from response
        // The edge function returns { response: string }
        // The model output might be wrapped in ```json ... ```
        let jsonStr = result.response
        // Clean markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')

        const subtasks = JSON.parse(jsonStr)
        // Ensure it is array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksArray = Array.isArray(subtasks) ? subtasks : (subtasks.subtasks || [])

        setProposedSubtasks(tasksArray)

      } catch (error) {
          console.error("Decomposition error:", error)
          alert("Failed to decompose task. AI might have returned invalid format.")
      } finally {
          setIsDecomposing(false)
      }
  }

  const handleAcceptSubtasks = async () => {
      if (!proposedSubtasks) return

      // Insert subtasks
      // Need user ID
      const { data: { user } } = await supabase.auth.getUser()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inserts = proposedSubtasks.map((st: any) => ({
          board_id: task.board_id,
          column_id: task.column_id,
          organization_id: task.organization_id,
          title: st.title,
          description: st.description,
          estimated_hours: st.estimated_hours,
          parent_task_id: task.id,
          created_by: user?.id,
          status: 'todo',
          weight: task.weight // Add to same area
      }))

      const { error } = await supabase.schema('app_tasks').from('tasks').insert(inserts)
      if (error) {
          console.error(error)
          alert("Failed to create subtasks")
      } else {
          // Save decomposition result to original task
          await supabase.schema('app_tasks').from('tasks').update({
              ai_decomposition: proposedSubtasks
          }).eq('id', task.id)

          setProposedSubtasks(null)
          alert("Subtasks created successfully!")
          // Invalidate tasks to show new subtasks (if we displayed them in modal or board)
          queryClient.invalidateQueries({ queryKey: ['tasks', task.board_id] })
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
                             {isDecomposing && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                             Decompose Task
                         </Button>
                         <Button variant="secondary" size="sm">Suggest Reviewers</Button>
                         <Button variant="secondary" size="sm">Predict Risks</Button>
                     </div>

                     {/* Proposed Subtasks UI */}
                     {proposedSubtasks && (
                         <div className="mt-4 rounded border bg-white p-3">
                             <h4 className="mb-2 text-sm font-medium">Proposed Subtasks</h4>
                             <ul className="space-y-2">
                                 {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                 {proposedSubtasks.map((st: any, idx: number) => (
                                     <li key={idx} className="flex items-start gap-2 text-sm border-b pb-2 last:border-0">
                                         <div className="mt-0.5"><Check className="h-3 w-3 text-green-500" /></div>
                                         <div>
                                             <div className="font-medium">{st.title}</div>
                                             <div className="text-xs text-gray-500">{st.description}</div>
                                             <div className="text-xs text-gray-400">{st.estimated_hours}h</div>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                             <div className="mt-3 flex justify-end gap-2">
                                 <Button variant="ghost" size="sm" onClick={() => setProposedSubtasks(null)}>Discard</Button>
                                 <Button size="sm" onClick={handleAcceptSubtasks}>Accept Changes</Button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>

             {/* Right Sidebar - Chat */}
             <div className="w-80 flex flex-col bg-gray-50">
                 <div className="p-4 border-b font-medium text-sm">Comments & AI Chat</div>
                 <ScrollArea className="flex-1 p-4">
                     <div className="space-y-4">
                         {messages.map((m, i) => (
                             <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                 <Avatar className="h-6 w-6 mt-1">
                                     <AvatarFallback>{m.role === 'user' ? 'ME' : 'AI'}</AvatarFallback>
                                 </Avatar>
                                 <div className={`rounded-lg p-3 text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                                     {m.content}
                                 </div>
                             </div>
                         ))}
                         {isAiLoading && (
                             <div className="flex gap-2">
                                 <Avatar className="h-6 w-6 mt-1"><AvatarFallback>AI</AvatarFallback></Avatar>
                                 <div className="rounded-lg p-3 text-sm bg-white border">
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
