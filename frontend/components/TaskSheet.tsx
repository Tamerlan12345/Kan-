import { useState, useEffect } from 'react'
import { Database } from '@/types/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet'
import {
    Sparkles,
    Loader2,
    Plus,
    Trash2,
    Flag
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { usePermission } from '@/hooks/usePermission'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TeamChat } from './TeamChat'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

type Task = Database['app_tasks']['Tables']['tasks']['Row']

interface TaskSheetProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  projectId: string | null
}

interface Subtask {
    id: string
    title: string
    is_completed: boolean
    created_at: string
}

export function TaskSheet({ task, isOpen, onClose, projectId }: TaskSheetProps) {
  const { role } = usePermission()

  // Subtasks/Checklist State
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isSubtaskLoading, setIsSubtaskLoading] = useState(false)
  const [subtasksLoading, setSubtasksLoading] = useState(false)

  // Only Admin/Team Lead can use AI Decompose
  const canDecompose = role === 'admin' || role === 'team_lead'

  // Task Decomposition State
  const [isDecomposing, setIsDecomposing] = useState(false)
  // const [proposedSubtasks, setProposedSubtasks] = useState<ProposedSubtask[] | null>(null) // REMOVED

  const fetchSubtasks = async () => {
      if (!task) return
      setSubtasksLoading(true)
      const { data, error } = await supabase
          .schema('app_tasks')
          .from('subtasks')
          .select('*')
          .eq('task_id', task.id)
          .order('created_at', { ascending: true })

      if (error) {
          console.error("Error fetching subtasks:", error)
          toast.error("Не удалось загрузить чек-лист")
      } else {
          setSubtasks(data)
      }
      setSubtasksLoading(false)
  }

  useEffect(() => {
      if (task?.id && isOpen) {
          fetchSubtasks()

          // Subscribe to changes
          const channel = supabase
              .channel(`subtasks-${task.id}`)
              .on(
                  'postgres_changes',
                  {
                      event: '*',
                      schema: 'app_tasks',
                      table: 'subtasks',
                      filter: `task_id=eq.${task.id}`
                  },
                  (payload) => {
                      if (payload.eventType === 'INSERT') {
                          fetchSubtasks()
                          toast.success("Новая подзадача добавлена!")
                      } else {
                          fetchSubtasks()
                      }
                  }
              )
              .subscribe()

          return () => {
              supabase.removeChannel(channel)
          }

      } else {
          setSubtasks([])
          // setProposedSubtasks(null)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, isOpen])

  const handleAddSubtask = async () => {
      if (!newSubtaskTitle.trim() || !task) return
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
          toast.error("Не удалось добавить элемент")
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
          toast.error("Ошибка обновления статуса")
          fetchSubtasks() // Revert on error
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
          toast.error("Не удалось удалить элемент")
          fetchSubtasks() // Revert
      }
  }

  const handleDecomposeTask = async () => {
      if (!task) return
      setIsDecomposing(true)

      // Async UI: "Fire and forget" from UI perspective
      try {
        // Use proxy to avoid CORS and handle auth securely
        // We do NOT wait for the full response logic.
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                assistantType: 'task_decomposer',
                input: JSON.stringify({
                    taskId: task.id,
                    title: task.title,
                    description: task.description || ''
                })
            })
        }).catch(err => console.error("Trigger error:", err))

        toast.success("ИИ начал декомпозицию, задачи скоро появятся")

      } catch (error) {
          console.error("Decomposition trigger error:", error)
          toast.error("Ошибка запуска ИИ")
      } finally {
          setIsDecomposing(false)
      }
  }

  const completedCount = subtasks.filter(t => t.is_completed).length
  const totalCount = subtasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (!task) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[90vw] sm:w-[500px] md:w-[600px] p-0 flex flex-col gap-0 border-l shadow-2xl">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gray-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
                <SheetTitle className="text-xl leading-tight text-left">
                    {task.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-md font-normal text-xs uppercase tracking-wider bg-white">
                        {task.status}
                    </Badge>
                    <Badge
                        variant={task.priority === 'P1' ? 'destructive' : 'secondary'}
                        className={`rounded-md font-normal text-xs ${task.priority === 'P1' ? '' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        <Flag className="h-3 w-3 mr-1" fill={task.priority === 'P1' ? 'currentColor' : 'none'} />
                        {task.priority}
                    </Badge>
                </div>
            </div>
          </div>
          <SheetDescription className="hidden">Детали задачи</SheetDescription>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-8">

                {/* Description */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        Описание
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100 min-h-[60px]">
                        {task.description || "Нет описания."}
                    </div>
                </div>

                {/* Checklist */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            Чек-лист
                            <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                                {completedCount}/{totalCount}
                            </span>
                        </h3>
                    </div>

                    {totalCount > 0 && (
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mb-4 overflow-hidden">
                            <div
                                className="bg-green-500 h-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    <div className="space-y-1 mb-3">
                        {subtasksLoading ? (
                             <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                             </div>
                        ) : (
                            subtasks.map(st => (
                                <div key={st.id} className="flex items-start gap-3 group p-2 rounded-md hover:bg-gray-50 transition-colors">
                                    <Checkbox
                                        checked={st.is_completed}
                                        onCheckedChange={(c) => handleToggleSubtask(st.id, !!c)}
                                        className="mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                    />
                                    <span className={`text-sm flex-1 break-words transition-all duration-200 ${st.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                        {st.title}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                                        onClick={() => handleDeleteSubtask(st.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            ))
                        )}

                        {/* Completed items moved to bottom could be done by sorting in render,
                            but for now just keeping creation order as per standard list behavior usually expected unless specified */}
                    </div>

                    <div className="flex gap-2 items-center">
                        <Input
                            value={newSubtaskTitle}
                            onChange={e => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                            placeholder="Добавить элемент..."
                            className="h-9 text-sm"
                        />
                        <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim() || isSubtaskLoading}>
                            {isSubtaskLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* AI Actions */}
                {canDecompose && (
                    <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="flex items-center text-sm font-semibold text-purple-900">
                                <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                                AI Помощник
                            </h3>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 h-8"
                                            onClick={handleDecomposeTask}
                                            disabled={isDecomposing}
                                        >
                                            {isDecomposing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                    Думаю...
                                                </>
                                            ) : (
                                                "✨ Декомпозировать"
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
                            <div className="space-y-3 pt-2">
                                <Skeleton className="h-4 w-3/4 bg-purple-200/50" />
                                <Skeleton className="h-4 w-1/2 bg-purple-200/50" />
                                <Skeleton className="h-4 w-5/6 bg-purple-200/50" />
                            </div>
                        )}

                    </div>
                 )}

            </div>
        </div>

        {/* Footer: Team Chat */}
        <div className="h-[300px] border-t bg-gray-50">
            {projectId && <TeamChat projectId={projectId} className="h-full bg-white" />}
        </div>

      </SheetContent>
    </Sheet>
  )
}
