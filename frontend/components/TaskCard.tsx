import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Database } from '@/types/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bug, Lightbulb, Zap, ArrowRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { memo } from 'react';

type Task = Database['app_tasks']['Tables']['tasks']['Row'] & {
    assigned_to_user?: Database['app_auth']['Tables']['users']['Row']
};

interface TaskCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onMove?: (taskId: string, targetColumnId: string) => void;
}

function TaskCard({ task, onTaskClick, onMove }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { ...task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityConfig = {
    P1: { color: 'border-red-500', badge: 'bg-red-100 text-red-800 border-red-200' },
    P2: { color: 'border-yellow-500', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    P3: { color: 'border-blue-400', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
    P4: { color: 'border-gray-300', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
  }[task.priority || 'P3'] || { color: 'border-gray-300', badge: 'bg-gray-100 text-gray-800' };

  const isRisk = task.ai_predicted_hours && task.estimated_hours &&
                 task.ai_predicted_hours > task.estimated_hours * 1.2;

  // Determine Task Type Icon (Logic based on title or tags usually, but defaulting to logic or generic here if not specified in DB)
  // Assuming no explicit 'type' column, we can guess from tags or just show a default.
  // Ideally, there would be a 'type' field. For now, let's use tags or title keywords.
  const getTaskTypeIcon = () => {
      const lowerTitle = task.title.toLowerCase();
      if (lowerTitle.includes('bug') || lowerTitle.includes('fix')) return <Bug className="h-3 w-3 text-red-500" />;
      if (lowerTitle.includes('feat') || lowerTitle.includes('add')) return <Zap className="h-3 w-3 text-yellow-500" />;
      return <Lightbulb className="h-3 w-3 text-blue-500" />;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick?.(task)}
      className={`group relative cursor-grab active:cursor-grabbing rounded-lg bg-card p-3 shadow-sm hover:shadow-md transition-all border border-l-4 ${priorityConfig.color} ${isRisk ? 'border-red-200 bg-red-50/50' : 'border-border/50'} overflow-hidden`}
    >
      <div className="space-y-2">
        {/* Header: Type, Title and Actions */}
        <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-2">
                <div className="mt-0.5 opacity-70">
                    {getTaskTypeIcon()}
                </div>
                <h4 className="font-medium text-sm text-foreground leading-snug break-words line-clamp-2">{task.title}</h4>
            </div>

            {/* Mobile Actions Menu (Prevent DnD propagation) */}
            <div className="md:hidden" onPointerDown={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <button className="text-muted-foreground hover:text-foreground p-1">
                             <MoreHorizontal className="h-4 w-4" />
                         </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         {/* We can populate this if we pass move handler */}
                         {onMove && (
                             <>
                                <DropdownMenuItem onClick={() => onMove(task.id, 'todo')}>
                                    <ArrowRight className="mr-2 h-4 w-4" /> To Do
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onMove(task.id, 'in_progress')}>
                                    <ArrowRight className="mr-2 h-4 w-4" /> In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onMove(task.id, 'done')}>
                                    <ArrowRight className="mr-2 h-4 w-4" /> Done
                                </DropdownMenuItem>
                             </>
                         )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Tags */}
         {task.tags && task.tags.length > 0 && (
             <div className="flex gap-1 flex-wrap">
                 {task.tags.map(tag => (
                     <span key={tag} className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium border border-border/50">#{tag}</span>
                 ))}
             </div>
         )}

        {/* Footer: Date, Risk, Assignee */}
        <div className="flex justify-between items-end pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                 {task.due_date && (
                     <div className={`${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                         {new Date(task.due_date).toLocaleDateString("ru-RU", { month: 'short', day: 'numeric' })}
                     </div>
                 )}

                 <div className="flex items-center gap-1">
                    {isRisk ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center text-red-600 font-medium bg-red-100 px-1.5 rounded border border-red-200">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {task.estimated_hours}ч
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Риск! Прогноз AI: {task.ai_predicted_hours}ч</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        task.estimated_hours && <span>{task.estimated_hours}ч</span>
                    )}
                </div>

                 {/* Priority Badge (Small) */}
                 <Badge variant="outline" className={`text-[10px] h-4 px-1 rounded-sm border-0 ${priorityConfig.badge}`}>
                     {task.priority || 'P3'}
                 </Badge>
            </div>

            {/* Avatar */}
             <div className="flex items-center">
                {task.assigned_to_user ? (
                   <TooltipProvider>
                       <Tooltip>
                           <TooltipTrigger>
                               <Avatar className="w-5 h-5 border border-background shadow-sm">
                                   <AvatarImage src={task.assigned_to_user.avatar_url || undefined} alt={task.assigned_to_user.full_name} />
                                   <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                       {task.assigned_to_user.full_name.substring(0, 2).toUpperCase()}
                                   </AvatarFallback>
                               </Avatar>
                           </TooltipTrigger>
                           <TooltipContent>
                               <p>{task.assigned_to_user.full_name}</p>
                           </TooltipContent>
                       </Tooltip>
                   </TooltipProvider>
                ) : (
                   <div className="w-5 h-5 rounded-full bg-muted border border-border border-dashed flex items-center justify-center text-[10px] text-muted-foreground">?</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

export default memo(TaskCard);
