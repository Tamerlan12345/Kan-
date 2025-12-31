'use client'

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { usePermission } from '@/hooks/usePermission';

// Extend Task with necessary fields
type Task = Database['app_tasks']['Tables']['tasks']['Row'] & {
    assigned_to_user?: Database['app_auth']['Tables']['users']['Row']
};

interface Column {
  id: string;
  name: string;
  position: number;
}

interface KanbanBoardProps {
  boardId: string;
}

export default function KanbanBoard({ boardId }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { canMoveTask } = usePermission();

  useEffect(() => {
    fetchBoardData();

    // Subscribe to realtime updates
    const channel = supabase
        .channel('board_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'app_tasks',
                table: 'tasks',
                filter: `board_id=eq.${boardId}`
            },
            (payload) => {
                if (payload.eventType === 'INSERT') {
                     // Fetch user info for the new task if assigned_to is present
                     // For simplicity, re-fetching the board or just adding it without user info initially
                     // A better approach is to fetch the single user or check cache
                     const newTask = payload.new as Task;
                     setTasks(current => [...current, newTask]);
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(current => current.map(task => {
                        if (task.id === payload.new.id) {
                            // Preserve assigned_to_user if assigned_to hasn't changed, otherwise we might need to fetch
                            const updatedTask = payload.new as Task;
                            if (updatedTask.assigned_to === task.assigned_to) {
                                return { ...updatedTask, assigned_to_user: task.assigned_to_user };
                            }
                            return updatedTask;
                        }
                        return task;
                    }));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(current => current.filter(task => task.id !== payload.old.id));
                }
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const fetchBoardData = async () => {
      // Fetch Columns
      const { data: cols, error: colsError } = await supabase
        .schema('app_projects')
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position');

      if (colsError) console.error(colsError);
      else setColumns(cols || []);

      // Fetch Tasks
      const { data: t, error: tError } = await supabase
        .schema('app_tasks')
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('weight');

      if (tError) {
          console.error(tError);
      } else if (t) {
          // Fetch users for tasks
          const userIds = Array.from(new Set(t.map(task => task.assigned_to).filter(Boolean)));

          const usersMap: Record<string, Database['app_auth']['Tables']['users']['Row']> = {};

          if (userIds.length > 0) {
              const { data: users, error: uError } = await supabase
                  .schema('app_auth')
                  .from('users')
                  .select('*')
                  .in('id', userIds as string[]); // Cast to string[] as filter returns (string|null)[]

              if (uError) console.error(uError);
              else {
                  users?.forEach(u => {
                      usersMap[u.id] = u;
                  });
              }
          }

          const tasksWithUsers = t.map(task => ({
              ...task,
              assigned_to_user: task.assigned_to ? usersMap[task.assigned_to] : undefined
          }));

          setTasks(tasksWithUsers);
      }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canMoveTask) return;
    setActiveId(event.active.id as string);
  };

  const handleDragOver = () => {
    // For simple Kanban, drag over might not be strictly necessary to handle if we handle drag end correctly,
    // but for smoother experience we can update local state here.
    // However, dnd-kit logic for across containers is tricky.
    // Let's implement DragEnd for DB updates first.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    if (!overId) {
       setActiveId(null);
       return;
    }

    // Find the task
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Find if over is a column or a task
    const overColumn = columns.find(c => c.id === overId);
    const overTask = tasks.find(t => t.id === overId);

    let newColumnId = activeTask.column_id;

    // Case 1: Dropped over a column (empty area)
    if (overColumn) {
        newColumnId = overColumn.id;
        // Determine position/weight - maybe append to end?
        // Or if we need specific sorting, we need more logic.
        // For now, let's just move it to the column.
    }
    // Case 2: Dropped over another task
    else if (overTask) {
        newColumnId = overTask.column_id;
        // We need to calculate new weight to place it relative to overTask.
        // But for MVP, let's just update the column ID if it changed.
        // If same column, we might want to reorder.
    }

    // Optimistic Update
    setTasks((tasks) => {
        return tasks.map(t => {
            if (t.id === activeId) {
                return { ...t, column_id: newColumnId };
            }
            return t;
        });
    });

    // DB Update
    if (newColumnId !== activeTask.column_id) {
       await supabase.schema('app_tasks').from('tasks').update({ column_id: newColumnId }).eq('id', activeId);
    }

    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.name}
            tasks={tasks.filter((task) => task.column_id === col.id)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeId ? (
           <TaskCard task={tasks.find((t) => t.id === activeId)!} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
