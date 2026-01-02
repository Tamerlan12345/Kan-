import { useState, useEffect } from 'react'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Send, Sparkles, X, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { usePermission } from '@/hooks/usePermission'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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

interface Subtask {
    id: string
    title: string
    is_completed: boolean
    created_at: string
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([])
  const [isAiLoading, setIsAiLoading] = useState(false)
  const { role } = usePermission()

  // Subtasks/Checklist State
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isSubtaskLoading, setIsSubtaskLoading] = useState(false)

  // Only Admin/Team Lead can use AI Decompose
  const canDecompose = role === 'admin' || role === 'team_lead'

  // Task Decomposition State
  const [isDecomposing, setIsDecomposing] = useState(false)
  const [proposedSubtasks, setProposedSubtasks] = useState<ProposedSubtask[] | null>(null)

  useEffect(() => {
      const fetchSubtasks = async () => {
          const { data, error } = await supabase
              .schema('app_tasks')
              .from('subtasks')
              .select('*')
              .eq('task_id', task.id)
              .order('created_at', { ascending: true })

          if (error) {
              console.error("Error fetching subtasks:", error)
          } else {
              setSubtasks(data)
          }
      }
      fetchSubtasks()
  }, [task.id])

  const fetchSubtasksRefetch = async () => {
      const { data, error } = await supabase
          .schema('app_tasks')
          .from('subtasks')
          .select('*')
          .eq('task_id', task.id)
          .order('created_at', { ascending: true })

      if (error) {
          console.error("Error fetching subtasks:", error)
      } else {
          setSubtasks(data)
      }
  }

  const handleAddSubtask = async () => {
      if (!newSubtaskTitle.trim()) return
      setIsSubtaskLoading(true)
      const { data, error } = await supabase
          .schema('app_tasks')
          .from('subtasks')
          .insert({
              task_id: task.id,
              title: newSubtaskTitle,
              is_completed: false
          })
          .select()
          .single()

      if (error) {
          console.error("Error adding subtask:", error)
      } else {
          setSubtasks([...subtasks, data])
          setNewSubtaskTitle('')
      }
      setIsSubtaskLoading(false)
  }

  const handleToggleSubtask = async (id: string, isCompleted: boolean) => {
      // Optimistic update
      setSubtasks(subtasks.map(t => t.id === id ? { ...t, is_completed: isCompleted } : t))

      const { error } = await supabase
          .schema('app_tasks')
          .from('subtasks')
          .update({ is_completed: isCompleted })
          .eq('id', id)

      if (error) {
          console.error("Error updating subtask:", error)
          fetchSubtasksRefetch() // Revert on error
      }
  }

  const handleDeleteSubtask = async (id: string) => {
      setSubtasks(subtasks.filter(t => t.id !== id))

      const { error } = await supabase
          .schema('app_tasks')
          .from('subtasks')
          .delete()
          .eq('id', id)

      if (error) {
          console.error("Error deleting subtask:", error)
          fetchSubtasksRefetch() // Revert
      }
  }

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
        setMessages(prev => [...prev, { role: 'assistant', content: "Извините, произошла ошибка." }])
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

        const subtasksData = JSON.parse(jsonStr)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tasksArray = Array.isArray(subtasksData) ? subtasksData : (subtasksData.subtasks || [])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setProposedSubtasks(tasksArray.map((t: any) => ({ ...t, selected: true })))

      } catch (error) {
          console.error("Decomposition error:", error)
          alert("Не удалось декомпозировать задачу. Возможно, ИИ вернул неверный формат.")
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

      // Insert into subtasks table instead of creating new tasks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inserts = selectedTasks.map((st: any) => ({
          task_id: task.id,
          title: st.title, // Ignoring description/hours for simple checklist for now, or could append to title
          is_completed: false
      }))

      const { error } = await supabase.schema('app_tasks').from('subtasks').insert(inserts)

      if (error) {
          console.error(error)
          alert("Не удалось создать подзадачи")
      } else {
          setProposedSubtasks(null)
          fetchSubtasksRefetch()
          alert("Подзадачи успешно созданы!")
      }
  }

  const completedCount = subtasks.filter(t => t.is_completed).length
  const totalCount = subtasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-xl font-bold line-clamp-1 break-all pr-4">{task.title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
             {/* Left Main Content */}
             <div className="flex-1 overflow-y-auto p-6 border-r">
                 <div className="mb-6 space-y-4">
                     <div>
                         <h3 className="text-sm font-medium text-gray-500">Описание</h3>
                         <div className="mt-1 text-sm whitespace-pre-wrap">{task.description || "Нет описания."}</div>
                     </div>
                     <div className="flex gap-4">
                         <div>
                             <h3 className="text-sm font-medium text-gray-500">Статус</h3>
                             <Badge variant="outline" className="mt-1 uppercase">{task.status}</Badge>
                         </div>
                         <div>
                             <h3 className="text-sm font-medium text-gray-500">Приоритет</h3>
                             <Badge variant={task.priority === 'P1' ? 'destructive' : 'secondary'} className="mt-1">{task.priority}</Badge>
                         </div>
                     </div>
                 </div>

                 {/* Checklist Section */}
                 <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            Чек-лист
                            <span className="text-xs font-normal text-muted-foreground">({completedCount}/{totalCount})</span>
                        </h3>
                    </div>

                    {totalCount > 0 && (
                        <div className="w-full bg-secondary/30 h-2 rounded-full mb-4 overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                    )}

                    <div className="space-y-2 mb-3">
                        {subtasks.map(st => (
                            <div key={st.id} className="flex items-start gap-3 group">
                                <Checkbox
                                    checked={st.is_completed}
                                    onCheckedChange={(c) => handleToggleSubtask(st.id, !!c)}
                                    className="mt-1"
                                />
                                <span className={`text-sm flex-1 break-words ${st.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                    {st.title}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteSubtask(st.id)}
                                >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <Input
                            value={newSubtaskTitle}
                            onChange={e => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                            placeholder="Добавить элемент..."
                            className="h-8 text-sm"
                        />
                        <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim() || isSubtaskLoading}>
                            {isSubtaskLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                 </div>

                 {/* AI Actions Area */}
                 {canDecompose && (
                    <div className="rounded-lg border bg-slate-50 p-4">
                        <h3 className="flex items-center text-sm font-semibold text-purple-700">
                            <Sparkles className="mr-2 h-4 w-4" /> AI Ассистент
                        </h3>
                        <div className="mt-3 flex gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleDecomposeTask}
                                            disabled={isDecomposing}
                                        >
                                            {isDecomposing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                    Думаю...
                                                </>
                                            ) : (
                                                "Декомпозировать задачу"
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Разбить задачу на подзадачи с помощью ИИ</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
                                <h4 className="mb-2 text-sm font-medium">Предложенные подзадачи</h4>
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
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setProposedSubtasks(null)}>Отмена</Button>
                                    <Button size="sm" onClick={handleAcceptSubtasks}>
                                        Добавить {proposedSubtasks.filter(t => t.selected).length} в чек-лист
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                 )}
             </div>

             {/* Right Sidebar - Chat */}
             <div className="w-80 flex flex-col bg-gray-50 border-l">
                 <div className="p-4 border-b font-medium text-sm">Комментарии и AI Чат</div>
                 <ScrollArea className="flex-1 p-4">
                     <div className="space-y-4">
                         {messages.map((m, i) => (
                             <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                 <Avatar className="h-6 w-6 mt-1">
                                     <AvatarFallback>{m.role === 'user' ? 'Я' : 'AI'}</AvatarFallback>
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
                            placeholder="Спросить AI..."
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
