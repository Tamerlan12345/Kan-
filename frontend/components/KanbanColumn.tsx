import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Wand2 } from 'lucide-react';
import TaskCard from './TaskCard';
import { Database } from '@/types/database.types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DICTIONARY } from '@/lib/dictionaries';
import { toast } from 'sonner';

type Task = Database['app_tasks']['Tables']['tasks']['Row'] & {
    assigned_to_user?: Database['app_auth']['Tables']['users']['Row']
};

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

export default function KanbanColumn({ id, title, tasks }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  const handleMagicWand = () => {
    toast.info("AI suggestions coming soon!");
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-80 flex-col rounded-lg bg-secondary/30 border border-border">
      <div className="p-3 font-semibold flex justify-between items-center bg-secondary/50 rounded-t-lg border-b border-border">
        <div className="flex items-center gap-2 text-sm text-foreground">
           {title}
           <span className="bg-background px-2 py-0.5 rounded-full text-xs border border-border text-muted-foreground">
             {tasks.length}
           </span>
        </div>
        <Button
            variant="ghost"
            size="icon"
            onClick={handleMagicWand}
            className="h-6 w-6 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            title="AI Suggest"
        >
            <Wand2 size={14} />
        </Button>
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 min-h-0">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-3 pb-2">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
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
