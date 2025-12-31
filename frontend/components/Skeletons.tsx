import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const ProjectListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="h-[200px]">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const KanbanBoardSkeleton = () => {
  return (
    <div className="flex gap-4 overflow-x-auto p-4 h-full">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="w-80 flex-shrink-0 flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <div className="flex-1 bg-muted/20 rounded-md p-2 space-y-2">
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
