import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Wand2, HelpCircle } from 'lucide-react';
import TaskCard from './TaskCard';
import { Database } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DICTIONARY } from '@/lib/dictionaries';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Task = Database['app_tasks']['Tables']['tasks']['Row'] & {
    assigned_to_user?: Database['app_auth']['Tables']['users']['Row']
};

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onMoveTask?: (taskId: string, targetColumnId: string) => void;
}

// Simple mapping for column titles to Russian
const COLUMN_TITLES: Record<string, string> = {
    'todo': 'К выполнению',
    'in_progress': 'В работе',
    'done': 'Готово',
    'review': 'На проверке',
    'blocked': 'Заблокировано'
}

// WIP limits configuration (Mock)
const WIP_LIMITS: Record<string, number> = {
    'todo': 10,
    'in_progress': 3,
    'done': 100
}

export default function KanbanColumn({ id, title, tasks, onTaskClick, onMoveTask }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  const displayTitle = COLUMN_TITLES[title.toLowerCase()] || COLUMN_TITLES[id.toLowerCase()] || title;

  const limit = WIP_LIMITS[id.toLowerCase()] || WIP_LIMITS[title.toLowerCase()];
  const count = tasks.length;
  let wipColor = "bg-green-100 text-green-700 border-green-200";
  if (limit) {
      if (count > limit) wipColor = "bg-red-100 text-red-700 border-red-200";
      else if (count === limit) wipColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  const handleMagicWand = () => {
    toast.info("AI предложения скоро будут доступны!");
  };

  return (
    <div className="flex h-full w-80 flex-col rounded-xl bg-gray-100/50 border border-gray-200 shadow-sm backdrop-blur-sm">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 p-3 flex justify-between items-center bg-gray-100/90 rounded-t-xl border-b border-gray-200 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
           {displayTitle}
           <span className={`px-2 py-0.5 rounded-full text-xs border font-medium transition-colors ${wipColor}`}>
             {count}{limit ? `/${limit}` : ''}
           </span>
        </div>

        <div className="flex items-center gap-1">
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                         <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Лимит задач: {limit || 'Нет'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleMagicWand}
                            className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 rounded-lg"
                        >
                            <Wand2 size={14} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>AI Анализ колонки</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 min-h-0 overflow-y-auto custom-scrollbar">
        <ScrollArea className="h-full pr-3">
          <div className="space-y-3 pb-2">
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                    onMove={onMoveTask}
                />
            ))}
            </SortableContext>

            {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                    <p className="text-sm text-gray-400">{DICTIONARY.tasks.drag_hint}</p>
                </div>
            )}
        </div>
        </ScrollArea>
      </div>
    </div>
  );
}
