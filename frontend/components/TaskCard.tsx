import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { Database } from "@/types/database.types";

type Task = Database["app_tasks"]["Tables"]["tasks"]["Row"];

interface TaskCardProps {
  task: Task;
  onClick: (task: Task) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing hover:border-primary/50"
      onClick={() => onClick(task)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-medium leading-tight">
            {task.title}
          </CardTitle>
          {task.priority && (
            <Badge variant={task.priority === 'P1' ? 'destructive' : 'secondary'} className="text-[10px] px-1 h-5">
              {task.priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
               {/* Assignee Avatar Placeholder */}
               <Avatar className="h-6 w-6">
                 <AvatarFallback className="text-[10px]">UN</AvatarFallback>
               </Avatar>
            </div>
            <div className="flex items-center text-muted-foreground text-xs">
                 {/* Chat icon indicator if comments exist - simplified for now */}
                 <Button variant="ghost" size="icon" className="h-6 w-6">
                     <MessageSquare className="h-3 w-3" />
                 </Button>
            </div>
        </div>
        {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.map(tag => (
                    <span key={tag} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                        {tag}
                    </span>
                ))}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
