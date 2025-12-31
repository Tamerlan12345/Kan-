import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Database } from '@/types/database.types';

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

  const priorityColor = {
    P1: 'bg-red-500',
    P2: 'bg-orange-500',
    P3: 'bg-blue-500',
    P4: 'bg-green-500',
  }[task.priority || 'P4'] || 'bg-gray-500';

  const isRisk = task.ai_predicted_hours && task.estimated_hours &&
                 task.ai_predicted_hours > task.estimated_hours * 1.2;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative cursor-grab active:cursor-grabbing rounded-md bg-white p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:bg-gray-900 dark:border-gray-700 overflow-hidden"
    >
      {/* Priority Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColor}`} />

      <div className="pl-2">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.title}</h4>
        </div>

        {/* Details on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs space-y-1 mb-2">
             {task.tags && task.tags.length > 0 && (
                 <div className="flex gap-1 flex-wrap">
                     {task.tags.map(tag => (
                         <span key={tag} className="bg-gray-100 text-gray-600 px-1 rounded text-[10px]">#{tag}</span>
                     ))}
                 </div>
             )}
             {task.due_date && (
                 <div className="text-gray-500">
                     Due: {new Date(task.due_date).toLocaleDateString()}
                 </div>
             )}
        </div>

        <div className="flex justify-between items-center mt-2">
          {/* Risk Warning / Time */}
          <div className="text-xs">
              {isRisk ? (
                  <span className="text-red-600 font-bold flex items-center gap-1" title={`Risk! Predicted: ${task.ai_predicted_hours}h`}>
                      ⚠️ {task.estimated_hours}h
                  </span>
              ) : (
                  task.estimated_hours && <span className="text-gray-400">{task.estimated_hours}h</span>
              )}
          </div>

          {/* Avatar */}
          {task.assigned_to_user ? (
               task.assigned_to_user.avatar_url ? (
                   // eslint-disable-next-line @next/next/no-img-element
                   <img src={task.assigned_to_user.avatar_url} alt={task.assigned_to_user.full_name} className="w-6 h-6 rounded-full border border-white shadow-sm" />
               ) : (
                   <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] border border-white shadow-sm">
                       {task.assigned_to_user.full_name.charAt(0)}
                   </div>
               )
          ) : (
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-white shadow-sm border-dashed">?</div>
          )}
        </div>
      </div>
    </div>
  );
}
