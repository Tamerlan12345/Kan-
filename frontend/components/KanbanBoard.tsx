'use client'

import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { TaskSheet } from './TaskSheet';
import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';
import { toast } from 'sonner';
import { DICTIONARY, getStatusLabel } from '@/lib/dictionaries';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from '@/components/ui/scroll-area';

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

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
        if (cols && cols.length > 0) {
            setActiveTab(cols[0].id);
        }

        const { data: board, error: boardError } = await supabase
            .schema('app_projects')
            .from('boards')
            .select('project_id')
            .eq('id', boardId)
            .single();

        if (boardError) console.error("Error fetching board details:", boardError);
        if (board) setProjectId(board.project_id);

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
            distance: 8,
        }
    }),
    useSensor(TouchSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        },
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

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type !== 'Column';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isOverTask = over.data.current?.type !== 'Column';

    if (!isActiveTask) return;

    // Implements sorting logic between columns or within column
    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);
    const overColumn = columns.find(c => c.id === overId);

    if (!activeTask) return;

    // Moving over a column (drop on column)
    if (overColumn) {
        if (activeTask.column_id !== overColumn.id) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const newTasks = [...tasks];
                newTasks[activeIndex] = { ...newTasks[activeIndex], column_id: overColumn.id };
                return newTasks;
            });
        }
    }
    // Moving over another task
    else if (overTask) {
        if (activeTask.column_id !== overTask.column_id) {
             setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const newTasks = [...tasks];
                newTasks[activeIndex] = { ...newTasks[activeIndex], column_id: overTask.column_id };
                return newTasks;
            });
        }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string;

    setActiveId(null);

    if (!overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let newColumnId = activeTask.column_id;
    const overColumn = columns.find(c => c.id === overId);
    const overTask = tasks.find(t => t.id === overId);

    if (overColumn) {
        newColumnId = overColumn.id;
    } else if (overTask) {
        newColumnId = overTask.column_id;
    }

    if (newColumnId !== activeTask.column_id) {
        // Optimistic Update is already handled in DragOver for column change
        // We just need to persist it.
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
            // Revert would be complex here without deep cloning state, usually we reload
            fetchBoardData();
        }
    }
  };

  const handleTaskClick = (task: Task) => {
      setSelectedTask(task);
  }

  const handleMoveTask = async (taskId: string, targetColumnId: string) => {
      // Manual move via menu (for mobile)
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      if (task.column_id === targetColumnId) return;

      const previousTasks = [...tasks];
      setTasks(current => current.map(t => t.id === taskId ? { ...t, column_id: targetColumnId } : t));

      try {
          const { error } = await supabase
              .schema('app_tasks')
              .from('tasks')
              .update({ column_id: targetColumnId, updated_at: new Date().toISOString() })
              .eq('id', taskId);

          if (error) throw error;
          toast.success("Task moved");
      } catch (error) {
          console.error("Failed to move task", error);
          toast.error("Failed to move task");
          setTasks(previousTasks);
      }
  }

  return (
    <>
        <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        >

        {/* Mobile View: Tabs */}
        <div className="md:hidden w-full px-2">
             <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <ScrollArea className="w-full whitespace-nowrap mb-4">
                     <TabsList className="inline-flex w-auto justify-start">
                        {columns.map(col => (
                            <TabsTrigger key={col.id} value={col.id} className="px-4">
                                {getStatusLabel(col.name)}
                            </TabsTrigger>
                        ))}
                     </TabsList>
                 </ScrollArea>

                 {columns.map(col => (
                     <TabsContent key={col.id} value={col.id} className="mt-0 h-[calc(100vh-180px)]">
                         <div className="flex justify-center h-full">
                            <KanbanColumn
                                id={col.id}
                                title={getStatusLabel(col.name)}
                                tasks={tasks.filter((task) => task.column_id === col.id)}
                                onTaskClick={handleTaskClick}
                                onMoveTask={handleMoveTask}
                            />
                         </div>
                     </TabsContent>
                 ))}
             </Tabs>
        </div>

        {/* Desktop View: Grid */}
        <div className="hidden md:flex h-full gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-4">
            {columns.map((col) => (
            <div key={col.id} className="snap-center">
                <KanbanColumn
                    id={col.id}
                    title={getStatusLabel(col.name)}
                    tasks={tasks.filter((task) => task.column_id === col.id)}
                    onTaskClick={handleTaskClick}
                    onMoveTask={handleMoveTask}
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

        <TaskSheet
            task={selectedTask}
            isOpen={!!selectedTask}
            onClose={() => setSelectedTask(null)}
            projectId={projectId}
        />
    </>
  );
}
