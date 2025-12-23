'use client'

import { useParams } from 'next/navigation'
import { KanbanBoard } from '@/components/KanbanBoard'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { TaskModal } from '@/components/TaskModal' // We will create this
import { Database } from '@/types/database.types'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Task = Database['app_tasks']['Tables']['tasks']['Row']

export default function ProjectPage() {
  const params = useParams()
  const boardId = params.id as string // Actually project ID, need to fetch board ID

  const [realBoardId, setRealBoardId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  // Create Task State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBoard() {
      // Assuming 1 board per project for now or getting the first one
      const { data, error } = await supabase
        .schema('app_projects')
        .from('boards')
        .select('id')
        .eq('project_id', boardId)
        .single()

      // @ts-expect-error - ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { error: _err } = error || {}

      if (data) {
        setRealBoardId(data.id)
      } else {
        // Create default board if missing? Or handle error
        console.log("No board found, creating default...")
        const { data: newBoard } = await supabase.schema('app_projects').from('boards').insert({
            project_id: boardId,
            name: 'Main Board',
            board_type: 'kanban'
        }).select().single()
        if (newBoard) {
             // Create default columns
             const cols = [
                 { board_id: newBoard.id, name: 'To Do', position: 1, color: '#e2e8f0' },
                 { board_id: newBoard.id, name: 'In Progress', position: 2, color: '#3b82f6' },
                 { board_id: newBoard.id, name: 'Done', position: 3, color: '#22c55e' }
             ]
             await supabase.schema('app_projects').from('board_columns').insert(cols)
             setRealBoardId(newBoard.id)
        }
      }
    }
    fetchBoard()
  }, [boardId])

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOpenTask = (e: any) => {
        setSelectedTask(e.detail)
        setIsTaskModalOpen(true)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleCreateTask = (e: any) => {
        setTargetColumnId(e.detail.columnId)
        setIsCreateTaskOpen(true)
    }

    window.addEventListener('open-task-modal', handleOpenTask)
    window.addEventListener('create-task', handleCreateTask)
    return () => {
        window.removeEventListener('open-task-modal', handleOpenTask)
        window.removeEventListener('create-task', handleCreateTask)
    }
  }, [])

  const handleCreateTaskSubmit = async () => {
      if (!newTaskTitle || !realBoardId || !targetColumnId) return

      const { data: { user } } = await supabase.auth.getUser()

      // Need organization ID
      // Fetch current project to get org id
      const { data: project } = await supabase.schema('app_projects').from('projects').select('organization_id').eq('id', boardId).single()

      await supabase.schema('app_tasks').from('tasks').insert({
          board_id: realBoardId,
          column_id: targetColumnId,
          organization_id: project?.organization_id,
          title: newTaskTitle,
          created_by: user?.id,
          status: 'todo',
          weight: 65536 // Default weight
      })

      setIsCreateTaskOpen(false)
      setNewTaskTitle('')
      // Invalidate queries handled by realtime or parent
  }

  if (!realBoardId) return <div className="p-8">Loading Project Board...</div>

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-xl font-bold">Project Board</h1>
        {/* Breadcrumbs or other nav could go here */}
      </header>
      <main className="flex-1 overflow-hidden">
         <KanbanBoard boardId={realBoardId} />
      </main>

      {/* Task Detail Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
             {selectedTask && <TaskModal task={selectedTask} onClose={() => setIsTaskModalOpen(false)} />}
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
          <DialogContent>
              <h2 className="text-lg font-bold">Create Task</h2>
              <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                      <Label htmlFor="task-title">Title</Label>
                      <Input id="task-title" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} />
                  </div>
              </div>
              <Button onClick={handleCreateTaskSubmit}>Create</Button>
          </DialogContent>
      </Dialog>
    </div>
  )
}
