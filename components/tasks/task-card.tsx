"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar, MoreHorizontal, MessageSquare, Paperclip, Edit, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";

interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  teamId?: string;
  dueDate?: string;
  comments?: number;
  attachments?: number;
}

interface Team {
  _id?: string;
  name: string;
}

interface Employee {
  _id?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface TaskCardProps {
  task: Task;
  teams?: Team[];
  employees?: Employee[];
  isDragging?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onAssign?: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  high: "bg-warning/10 text-warning-foreground border-warning/20",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
};

export function TaskCard({ task, teams, employees, isDragging, onEdit, onDelete, onAssign }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const team = teams?.find((t) => t._id === task.teamId);
  const assignee = employees?.find((e) => e._id === task.assigneeId);
  
  // Helper to parse date that could be a string or Date object
  const parseDueDate = (dueDate: string | Date | undefined): Date | null => {
    if (!dueDate) return null;
    if (dueDate instanceof Date) return dueDate;
    if (typeof dueDate === 'string') return new Date(dueDate);
    return null;
  };
  
  const dueDateParsed = parseDueDate(task.dueDate as string | Date | undefined);
  const isOverdue = dueDateParsed && isPast(dueDateParsed) && task.status !== "done";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab border bg-card transition-all hover:border-primary/50 hover:shadow-md",
        (isDragging || isSortableDragging) && "rotate-3 scale-105 shadow-xl opacity-90",
        isSortableDragging && "opacity-50"
      )}
    >
      <CardHeader className="p-3 pb-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-sm font-medium leading-tight">
            {task.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(task);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onAssign?.(task);
                }}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Assign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  if (task._id) onDelete?.(task._id);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2">
        {task.description && (
          <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
          {team && (
            <Badge variant="secondary" className="text-xs">
              {team.name}
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {dueDateParsed && (
              <div
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-destructive"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(dueDateParsed, "MMM dd")}
              </div>
            )}
            {task.comments && task.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task.comments}
              </div>
            )}
            {task.attachments && task.attachments > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {task.attachments}
              </div>
            )}
          </div>

          {assignee && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-[10px]">
                {assignee.firstName?.[0]}
                {assignee.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
