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

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  column_id: string;
  assigned_to?: string;
  weight?: number;
}

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

  useEffect(() => {
    fetchBoardData();
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
        .order('weight'); // Assuming weight is used for ordering

      if (tError) console.error(tError);
      else setTasks(t || []);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
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
