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
}

// Simple mapping for column titles to Russian
const COLUMN_TITLES: Record<string, string> = {
    'todo': 'К выполнению',
    'in_progress': 'В работе',
    'done': 'Готово',
    'review': 'На проверке',
    'blocked': 'Заблокировано'
}

export default function KanbanColumn({ id, title, tasks, onTaskClick }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  const displayTitle = COLUMN_TITLES[title.toLowerCase()] || COLUMN_TITLES[id.toLowerCase()] || title;

  const handleMagicWand = () => {
    toast.info("AI предложения скоро будут доступны!");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-80 flex-col rounded-lg bg-secondary/30 border border-border">
      <div className="p-3 font-semibold flex justify-between items-center bg-secondary/50 rounded-t-lg border-b border-border">
        <div className="flex items-center gap-2 text-sm text-foreground">
           {displayTitle}
           <span className="bg-background px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground">
             {tasks.length}
           </span>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                         <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Задачи в статусе &quot;{displayTitle}&quot;</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMagicWand}
                        className="h-6 w-6 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
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

      <div ref={setNodeRef} className="flex-1 p-2 min-h-0">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-3 pb-2">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                    />
                ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/5">
                        <p className="text-sm text-muted-foreground">{DICTIONARY.tasks.drag_hint}</p>
                    </div>
                )}
            </div>
        </ScrollArea>
      </div>
    </div>
  );
}
