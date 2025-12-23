'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from '@dnd-kit/core'
import { createPortal } from 'react-dom'
import { Database } from '@/types/database.types'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { supabase } from '@/lib/supabase/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Task = Database['app_tasks']['Tables']['tasks']['Row']
type Column = Database['app_projects']['Tables']['board_columns']['Row']

interface KanbanBoardProps {
  boardId: string
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  )

  // Fetch Columns
  const { data: columns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('app_projects')
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position')

      if (error) throw error
      return data as Column[]
    },
  })

  // Fetch Tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('app_tasks')
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('weight') // Order by weight for position

      if (error) throw error
      return data as Task[]
    },
  })

  // Real-time Subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'app_tasks',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          console.log('Realtime update:', payload)
          queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, queryClient])

  // Mutation for moving task
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, newColumnId, newPosition }: { taskId: string; newColumnId: string; newPosition: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _pos = newPosition
      const { data, error } = await supabase
        .rpc('reposition_task', {
          task_id: taskId,
          new_column_id: newColumnId,
          new_position: newPosition,
        })

      if (error) throw error
      return data
    },
    onMutate: async ({ taskId, newColumnId }) => {
       // Optimistic Update can be complex with weight-based positioning without knowing the exact weight calculation client-side.
       // However, we can update the column_id immediately for visual feedback if we manage local state manually.
       // For now, react-query invalidation is safe but might flicker. To be truly optimistic, we update the cache.

       await queryClient.cancelQueries({ queryKey: ['tasks', boardId] })
       const previousTasks = queryClient.getQueryData<Task[]>(['tasks', boardId])

       if (previousTasks) {
         queryClient.setQueryData<Task[]>(['tasks', boardId], (old) => {
            if (!old) return []
            return old.map(t =>
                t.id === taskId
                ? { ...t, column_id: newColumnId } // We can't easily guess weight, but we can move it to column
                : t
            )
         })
       }

       return { previousTasks }
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['tasks', boardId], context?.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] })
    }
  })

  // Dnd Handlers
  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onDragOver = (event: DragOverEvent) => {
     // Handle visual updates during drag if needed
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Identify if dropped over a column or a task
    const overColumn = columns.find(c => c.id === overId)
    const overTask = tasks.find(t => t.id === overId)

    let newColumnId = activeTask.column_id
    let newIndex = 0

    if (overColumn) {
        // Dropped on a column (empty area)
        newColumnId = overColumn.id
        // When dropped on column, we usually append to end or top.
        // Let's assume top (position 1) or end?
        // Logic: if dropped on column container, usually means append.
        // Let's find tasks in that column to determine count.
        const tasksInColumn = tasks.filter(t => t.column_id === overColumn.id)
        newIndex = tasksInColumn.length + 1
    } else if (overTask) {
        // Dropped over another task
        newColumnId = overTask.column_id
        // Calculate index relative to that task
        const tasksInColumn = tasks.filter(t => t.column_id === newColumnId) // already sorted by weight from query
        const overIndex = tasksInColumn.findIndex(t => t.id === overId)

        // If moving down, we want to be after. If up, before.
        // Dnd-kit sortable logic:
        // Actually, simple way: use `arrayMove` index mapping.
        // But we need the index in the destination column.

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const activeIndex = tasksInColumn.findIndex(t => t.id === activeId)

        // If distinct columns, the logic differs.
        if (activeTask.column_id !== newColumnId) {
             // Moving to new column at specific index
             // overIndex is the target index
             newIndex = overIndex + 1 // 1-based for our RPC? No, RPC expects position index (likely 1-based based on SQL: new_position < 2 check)
             // SQL: IF new_position < 2 ...
             // So 1 is top.

             // If I drop ON a task, I want to take its place or go below it?
             // usually "over" means I am displacing it.
             // If I am dragging from top to bottom, I displace downwards.

             // Let's approximate:
             newIndex = overIndex + 1
        } else {
             // Same column reorder
             // arrayMove index
             // We need to calculate the NEW index.
             // If activeIndex < overIndex, we are moving down, so new index is overIndex + 1?
             // Wait, dnd-kit handles visual reorder. We need final index for RPC.
             // RPC uses `OFFSET (new_position - 1)`. So it's 1-based index.

             // If I drag item at 0 to item at 2.
             // It becomes item at 2.
             newIndex = overIndex + 1
        }
    }

    if (activeTask.column_id !== newColumnId || newIndex !== 0) { // Check if moved
         moveTaskMutation.mutate({
             taskId: activeId,
             newColumnId: newColumnId!,
             newPosition: newIndex
         })
    }

    setActiveTask(null)
  }

  const tasksByColumn = useMemo(() => {
      const acc: Record<string, Task[]> = {}
      columns.forEach(c => acc[c.id] = [])
      tasks.forEach(t => {
          if (t.column_id && acc[t.column_id]) {
              acc[t.column_id].push(t)
          }
      })
      return acc
  }, [tasks, columns])

  if (columnsLoading || tasksLoading) return <div>Loading board...</div>

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={tasksByColumn[col.id] || []}
            onTaskClick={(t) => {
                 // Open modal (handled by parent or state)
                 // For now dispatch event or callback
                 // Since this component is deep, maybe use a context or just pass handler
                 const event = new CustomEvent('open-task-modal', { detail: t });
                 window.dispatchEvent(event);
            }}
            onAddTask={(colId) => {
                const event = new CustomEvent('create-task', { detail: { columnId: colId } });
                window.dispatchEvent(event);
            }}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay>
          {activeTask && (
            <TaskCard task={activeTask} onClick={() => {}} />
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  )
}
