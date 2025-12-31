import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Database } from '@/types/database.types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Task = Database['app_tasks']['Tables']['tasks']['Row'] & {
    assigned_to_user?: Database['app_auth']['Tables']['users']['Row']
};

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
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
    P1: { color: 'bg-red-500', badge: 'bg-red-100 text-red-800 border-red-200' },
    P2: { color: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    P3: { color: 'bg-gray-400', badge: 'bg-gray-100 text-gray-800 border-gray-200' },
    P4: { color: 'bg-green-500', badge: 'bg-green-100 text-green-800 border-green-200' },
  }[task.priority || 'P3'] || { color: 'bg-gray-400', badge: 'bg-gray-100 text-gray-800' };

  const isRisk = task.ai_predicted_hours && task.estimated_hours &&
                 task.ai_predicted_hours > task.estimated_hours * 1.2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab active:cursor-grabbing rounded-lg bg-card p-4 shadow-sm hover:shadow-md transition-all border border-border/50 overflow-hidden"
    >
      {/* Priority Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityConfig.color}`} />

      <div className="pl-2 space-y-3">
        {/* Header: Title and Priority Badge */}
        <div className="flex justify-between items-start gap-2">
          <h4 className="font-medium text-sm text-card-foreground leading-snug">{task.title}</h4>
        </div>

        {/* Tags */}
         {task.tags && task.tags.length > 0 && (
             <div className="flex gap-1 flex-wrap">
                 {task.tags.map(tag => (
                     <span key={tag} className="bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded text-[10px] font-medium">#{tag}</span>
                 ))}
             </div>
         )}

        {/* Footer: Date, Risk, Assignee */}
        <div className="flex justify-between items-end pt-2">
            <div className="flex flex-col gap-1 text-xs">
                 {task.due_date && (
                     <div className={`text-muted-foreground ${new Date(task.due_date) < new Date() ? 'text-red-500 font-medium' : ''}`}>
                         {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                     </div>
                 )}
                 {/* Risk Warning / Time */}
                 <div className="flex items-center">
                    {isRisk ? (
                        <span className="text-red-600 font-bold flex items-center gap-1" title={`Risk! Predicted: ${task.ai_predicted_hours}h`}>
                            ⚠️ {task.estimated_hours}h
                        </span>
                    ) : (
                        task.estimated_hours && <span className="text-muted-foreground">{task.estimated_hours}h</span>
                    )}
                </div>
            </div>

            {/* Avatar */}
             <div className="flex items-center -space-x-2">
                {task.assigned_to_user ? (
                   <Avatar className="w-6 h-6 border-2 border-background shadow-sm">
                       <AvatarImage src={task.assigned_to_user.avatar_url || undefined} alt={task.assigned_to_user.full_name} />
                       <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                           {task.assigned_to_user.full_name.substring(0, 2).toUpperCase()}
                       </AvatarFallback>
                   </Avatar>
                ) : (
                   <div className="w-6 h-6 rounded-full bg-muted border-2 border-background border-dashed flex items-center justify-center text-[10px] text-muted-foreground">?</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
