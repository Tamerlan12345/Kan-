import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Wand2 } from 'lucide-react';
import TaskCard from './TaskCard';
import { Database } from '@/types/database.types';

// Use same Task type extension or just 'any' for simplicity if types are complex to share without a common file
// But ideally we import the type.
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
    // Placeholder for AI action
    console.log(`Magic Wand triggered for column: ${title}`);
    // In a real implementation, this would call an API to generate tasks
    alert(`AI suggests 3 tasks for ${title}... (Functionality coming soon)`);
  };

  return (
    <div className="flex h-full w-80 flex-col rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
      <div className="p-4 font-semibold text-gray-700 dark:text-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           {title}
           <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
             {tasks.length}
           </span>
        </div>
        <button
            onClick={handleMagicWand}
            className="p-1 hover:bg-purple-100 text-purple-600 rounded transition-colors"
            title="AI Suggest Tasks"
        >
            <Wand2 size={16} />
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
             <div className="h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-400 text-sm">
                Drop here
             </div>
        )}
      </div>
    </div>
  );
}
