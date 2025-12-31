import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/10 h-full min-h-[200px]">
      {Icon && <Icon className="w-12 h-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-sm">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-6" variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
};
