import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  column_id: string;
  assigned_to?: string;
}

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
    P1: 'bg-red-100 text-red-800',
    P2: 'bg-orange-100 text-orange-800',
    P3: 'bg-blue-100 text-blue-800',
    P4: 'bg-green-100 text-green-800',
  }[task.priority] || 'bg-gray-100 text-gray-800';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing rounded-md bg-white p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:bg-gray-900 dark:border-gray-700"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.title}</h4>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
        {task.description}
      </p>
      <div className="flex justify-between items-center">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColor}`}>
          {task.priority}
        </span>
        {/* Placeholder for assignee avatar */}
        {task.assigned_to && <div className="w-5 h-5 bg-gray-300 rounded-full" />}
      </div>
    </div>
  );
}
