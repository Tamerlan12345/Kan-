import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./TaskCard";
import { Database } from "@/types/database.types";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

type Column = Database["app_projects"]["Tables"]["board_columns"]["Row"];
type Task = Database["app_tasks"]["Tables"]["tasks"]["Row"];

interface ColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (columnId: string) => void;
}

export function KanbanColumn({ column, tasks, onTaskClick, onAddTask }: ColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  return (
    <Card className="flex h-full w-80 flex-col shrink-0 bg-secondary/20 border-0">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
          {column.name} <span className="ml-2 text-muted-foreground font-normal">({tasks.length})</span>
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddTask(column.id)}>
            <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <ScrollArea className="h-full pr-3">
            <div ref={setNodeRef} className="flex flex-col gap-2 min-h-[150px]">
              <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
              </SortableContext>
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
