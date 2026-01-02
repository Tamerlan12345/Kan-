'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import KanbanBoard from '@/components/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { usePermission } from '@/hooks/usePermission'

export default function ProjectPage({ params }: { params: { id: string } }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [project, setProject] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [board, setBoard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskPriority, setTaskPriority] = useState('P3')
  const [predictedHours, setPredictedHours] = useState<string>('')
  const [isEstimating, setIsEstimating] = useState(false)
  const [firstColumnId, setFirstColumnId] = useState<string | null>(null)

  const { role } = usePermission()
  // Admin/TeamLead/Senior can create tasks? Or everyone?
  // Requirement: "Developer: View, move tasks..." (Implies edit/create usually, strict read-only is Observer)
  // "Observer: Read-only"
  const canCreateTask = role !== 'observer'

  useEffect(() => {
    fetchProjectAndBoard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchProjectAndBoard = async () => {
    try {
      setLoading(true)
      const { data: proj, error: projError } = await supabase
        .schema('app_projects')
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projError) throw projError
      setProject(proj)

      const { data: boards } = await supabase
        .schema('app_projects')
        .from('boards')
        .select('*')
        .eq('project_id', params.id)

      let currentBoard = boards?.[0]

      if (!currentBoard) {
          const { data: newBoard, error: createError } = await supabase
             .schema('app_projects')
             .from('boards')
             .insert([{ project_id: params.id, name: 'Main Board' }])
             .select()
             .single()

          if (createError) throw createError
          currentBoard = newBoard

          const defaultColumns = [
              { name: 'To Do', position: 1 },
              { name: 'In Progress', position: 2 },
              { name: 'Done', position: 3 }
          ]

          for (const col of defaultColumns) {
              await supabase.schema('app_projects').from('board_columns').insert({
                  board_id: currentBoard.id,
                  name: col.name,
                  position: col.position
              })
          }
      }

      setBoard(currentBoard)

      const { data: cols } = await supabase.schema('app_projects').from('board_columns').select('id').eq('board_id', currentBoard.id).order('position').limit(1).single()
      if (cols) setFirstColumnId(cols.id)

    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const estimateTask = async () => {
      if (!taskTitle) return
      setIsEstimating(true)
      try {
          const { data: { session } } = await supabase.auth.getSession()
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                  assistantType: 'predictive_estimator',
                  input: JSON.stringify({ title: taskTitle, description: taskDesc })
              })
          })
          const result = await response.json()
          let jsonStr = result.response
          jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')
          const estimation = JSON.parse(jsonStr)
          if (estimation.estimated_hours) {
              setPredictedHours(estimation.estimated_hours.toString())
          }
      } catch (error) {
          console.error("Estimation failed", error)
      } finally {
          setIsEstimating(false)
      }
  }

  const createTask = async () => {
      if (!board || !firstColumnId) return

      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const orgId = project.organization_id

          const { error } = await supabase.schema('app_tasks').from('tasks').insert({
              board_id: board.id,
              column_id: firstColumnId,
              title: taskTitle,
              description: taskDesc,
              priority: taskPriority,
              organization_id: orgId,
              created_by: user.id,
              status: 'todo',
              estimated_hours: predictedHours ? parseFloat(predictedHours) : null,
              ai_predicted_hours: predictedHours ? parseFloat(predictedHours) : null
          })

          if (error) throw error

          setIsTaskModalOpen(false)
          setTaskTitle('')
          setTaskDesc('')
          setPredictedHours('')
          window.location.reload()

      } catch (error) {
          console.error(error)
      }
  }

  if (loading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="px-6 py-2 border-b bg-gray-50 dark:bg-zinc-900/50">
         <Breadcrumbs
            items={[
                { label: 'My Projects', href: '/dashboard' },
                { label: project.name }
            ]}
         />
      </div>
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background shadow-sm">
        <div>
           <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
           <p className="text-sm text-muted-foreground">{board?.name}</p>
        </div>

        {canCreateTask && (
            <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Создать новую задачу</DialogTitle>
                        <DialogDescription>
                            Заполните параметры задачи. ИИ поможет оценить время.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">Название</Label>
                            <Input id="title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">Описание</Label>
                            <Textarea id="desc" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="col-span-3"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="est" className="text-right">Часы (Est.)</Label>
                            <div className="col-span-3 flex gap-2">
                                <Input id="est" type="number" value={predictedHours} onChange={e => setPredictedHours(e.target.value)} placeholder="0" />
                                <Button size="icon" variant="outline" onClick={estimateTask} disabled={isEstimating} title="Оценить с помощью ИИ">
                                    {isEstimating ? <span className="animate-spin">...</span> : <Sparkles className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="prio" className="text-right">Приоритет</Label>
                            <select
                                id="prio"
                                value={taskPriority}
                                onChange={e => setTaskPriority(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                            >
                                <option value="P1">P1 - Критический</option>
                                <option value="P2">P2 - Высокий</option>
                                <option value="P3">P3 - Средний</option>
                                <option value="P4">P4 - Низкий</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={createTask}>Создать задачу</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50 dark:bg-gray-950">
        {board && <KanbanBoard boardId={board.id} />}
      </div>
    </div>
  )
}
