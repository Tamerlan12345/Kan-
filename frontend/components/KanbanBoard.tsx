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
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useState, useEffect } from 'react';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import { KanbanBoardSkeleton } from '@/components/Skeletons';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { toast } from 'sonner';
import { DICTIONARY, getStatusLabel } from '@/lib/dictionaries';

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
  const [loading, setLoading] = useState(true);

  const canMoveTask = true;

  useEffect(() => {
    fetchBoardData();

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
                     const newTask = payload.new as Task;
                     setTasks(current => [...current, newTask]);
                } else if (payload.eventType === 'UPDATE') {
                    setTasks(current => current.map(task => {
                        if (task.id === payload.new.id) {
                            const updatedTask = payload.new as Task;
                            const oldTask = current.find(t => t.id === task.id);
                            if (oldTask && oldTask.assigned_to === updatedTask.assigned_to) {
                                return { ...updatedTask, assigned_to_user: oldTask.assigned_to_user };
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
      try {
        setLoading(true);
        const { data: cols, error: colsError } = await supabase
            .schema('app_projects')
            .from('board_columns')
            .select('*')
            .eq('board_id', boardId)
            .order('position');

        if (colsError) throw colsError;
        setColumns(cols || []);

        const { data: t, error: tError } = await supabase
            .schema('app_tasks')
            .from('tasks')
            .select('*')
            .eq('board_id', boardId)
            .order('weight');

        if (tError) throw tError;

        if (t) {
            const userIds = Array.from(new Set(t.map(task => task.assigned_to).filter(Boolean)));
            const usersMap: Record<string, Database['app_auth']['Tables']['users']['Row']> = {};

            if (userIds.length > 0) {
                const { data: users, error: uError } = await supabase
                    .schema('app_auth')
                    .from('users')
                    .select('*')
                    .in('id', userIds as string[]);

                if (uError) console.error(uError);
                else {
                    users?.forEach(u => { usersMap[u.id] = u; });
                }
            }

            const tasksWithUsers = t.map(task => ({
                ...task,
                assigned_to_user: task.assigned_to ? usersMap[task.assigned_to] : undefined
            }));

            setTasks(tasksWithUsers);
        }
      } catch (error) {
        console.error("Error loading board:", error);
        toast.error(DICTIONARY.errors.fetch_failed);
      } finally {
        setLoading(false);
      }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (!canMoveTask) return;
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    // Keeping logic simple for now
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    setActiveId(null);

    if (!overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overColumn = columns.find(c => c.id === overId);
    const overTask = tasks.find(t => t.id === overId);

    let newColumnId = activeTask.column_id;
    // let newWeight = activeTask.weight; // Unused for now

    if (overColumn) {
        newColumnId = overColumn.id;
    } else if (overTask) {
        newColumnId = overTask.column_id;
    }

    if (newColumnId !== activeTask.column_id) {
        // Optimistic Update
        const previousTasks = [...tasks];
        setTasks((current) => {
            return current.map(t => {
                if (t.id === activeId) {
                    return { ...t, column_id: newColumnId };
                }
                return t;
            });
        });

        try {
            const { error } = await supabase
                .schema('app_tasks')
                .from('tasks')
                .update({ column_id: newColumnId, updated_at: new Date().toISOString() })
                .eq('id', activeId);

            if (error) throw error;
        } catch (error) {
            console.error("Failed to move task", error);
            toast.error("Failed to move task");
            setTasks(previousTasks); // Revert
        }
    }
  };

  if (loading) return <KanbanBoardSkeleton />;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {columns.map((col) => (
          <div key={col.id} className="snap-center">
            <KanbanColumn
                id={col.id}
                title={getStatusLabel(col.name)}
                tasks={tasks.filter((task) => task.column_id === col.id)}
            />
          </div>
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
