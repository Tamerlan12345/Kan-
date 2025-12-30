'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import KanbanBoard from '@/components/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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
  // We need to know which column to add to. Default to first column?
  const [firstColumnId, setFirstColumnId] = useState<string | null>(null)


  useEffect(() => {
    fetchProjectAndBoard()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchProjectAndBoard = async () => {
    try {
      setLoading(true)
      // 1. Fetch Project
      const { data: proj, error: projError } = await supabase
        .schema('app_projects')
        .from('projects')
        .select('*')
        .eq('id', params.id)
        .single()

      if (projError) throw projError
      setProject(proj)

      // 2. Fetch or Create Board (If not exists)
      // The schema has `app_projects.boards`. One project can have many boards or one?
      // "project_id UUID REFERENCES app_projects.projects(id)"
      // Let's see if one exists.
      const { data: boards } = await supabase
        .schema('app_projects')
        .from('boards')
        .select('*')
        .eq('project_id', params.id)

      let currentBoard = boards?.[0]

      if (!currentBoard) {
          // Create default board
          const { data: newBoard, error: createError } = await supabase
             .schema('app_projects')
             .from('boards')
             .insert([{ project_id: params.id, name: 'Main Board' }])
             .select()
             .single()

          if (createError) throw createError
          currentBoard = newBoard

          // Create default columns
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

      // Get first column for default add
      const { data: cols } = await supabase.schema('app_projects').from('board_columns').select('id').eq('board_id', currentBoard.id).order('position').limit(1).single()
      if (cols) setFirstColumnId(cols.id)

    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async () => {
      if (!board || !firstColumnId) return

      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          // Need organization_id.
          // Ideally fetch from user or project. Project has org_id.
          const orgId = project.organization_id

          const { error } = await supabase.schema('app_tasks').from('tasks').insert({
              board_id: board.id,
              column_id: firstColumnId,
              title: taskTitle,
              description: taskDesc,
              priority: taskPriority,
              organization_id: orgId,
              created_by: user.id,
              status: 'todo' // or map from column name
          })

          if (error) throw error

          setIsTaskModalOpen(false)
          setTaskTitle('')
          setTaskDesc('')
          // Refresh board (cheap way) - ideally we update local state or use React Query
          window.location.reload()

      } catch (error) {
          console.error(error)
      }
  }

  if (loading) return <div>Loading...</div>
  if (!project) return <div>Project not found</div>

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
           <h1 className="text-2xl font-bold">{project.name}</h1>
           <p className="text-sm text-muted-foreground">{board?.name}</p>
        </div>
        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Title</Label>
                        <Input id="title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="col-span-3"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Description</Label>
                        <Textarea id="desc" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="col-span-3"/>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="prio" className="text-right">Priority</Label>
                        <select
                            id="prio"
                            value={taskPriority}
                            onChange={e => setTaskPriority(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 col-span-3"
                        >
                            <option value="P1">P1 - Critical</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Medium</option>
                            <option value="P4">P4 - Low</option>
                        </select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={createTask}>Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-gray-50 dark:bg-gray-950">
        {board && <KanbanBoard boardId={board.id} />}
      </div>
    </div>
  )
}
