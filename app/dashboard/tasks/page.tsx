"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Filter, Search, Calendar, User } from "lucide-react";
import { getTasks, createTask, updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { getTeams } from "@/app/actions/teams";
import { getEmployees } from "@/app/actions/employees";
import { TaskColumn } from "@/components/tasks/task-column";
import { TaskCard } from "@/components/tasks/task-card";
import { useToast } from "@/hooks/use-toast";
interface Task {
  _id?: string;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  assignedBy?: string;
  teamId?: string;
  dueDate?: Date;
  tags?: string[];
  order: number;
  assignee?: Employee;
}

interface Team {
  _id?: string;
  name: string;
  departmentId?: string;
}

interface Employee {
  _id?: string;
  firstName: string;
  lastName: string;
  userId?: string;
}

const taskFetcher = async () => {
  const result = await getTasks();
  if (result.success) return result.data;
  return [];
};

const teamFetcher = async () => {
  const result = await getTeams();
  if (result.success) return result.data;
  return [];
};

const employeeFetcher = async () => {
  const result = await getEmployees();
  if (result.success) return result.data;
  return [];
};

const TASK_STATUSES = [
  { id: "backlog", label: "Backlog", color: "bg-muted" },
  { id: "todo", label: "To Do", color: "bg-chart-4" },
  { id: "in-progress", label: "In Progress", color: "bg-primary" },
  { id: "review", label: "Review", color: "bg-chart-5" },
  { id: "done", label: "Done", color: "bg-success" },
];

export default function TasksPage() {
  const { data: tasks, isLoading: tasksLoading } = useSWR<Task[]>("tasks", taskFetcher);
  const { data: teams } = useSWR<Team[]>("teams", teamFetcher);
  const { data: employees } = useSWR<Employee[]>("employees", employeeFetcher);
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    teamId: "",
    assigneeId: "",
    dueDate: "",
  });
  const [editTask, setEditTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    teamId: "",
    assigneeId: "",
    dueDate: "",
  });
  const { toast } = useToast();

  // Task action handlers
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setEditTask({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      teamId: task.teamId || "",
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setShowEditDialog(true);
  };

  const handleAssignTask = (task: Task) => {
    setSelectedTask(task);
    setEditTask({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      teamId: task.teamId || "",
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
    });
    setShowAssignDialog(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    // Optimistic update
    mutate(
      "tasks",
      tasks?.filter((t) => t._id !== taskId),
      false
    );

    const result = await deleteTask(taskId);
    if (result.success) {
      toast({
        title: "Task Deleted",
        description: "The task has been removed",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to delete task",
        variant: "destructive",
      });
      mutate("tasks"); // Revert on error
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTask?._id) return;
    
    const formData = new FormData();
    formData.append('title', editTask.title);
    formData.append('description', editTask.description);
    formData.append('priority', editTask.priority);
    formData.append('assigneeId', editTask.assigneeId);
    formData.append('dueDate', editTask.dueDate);
    
    // Optimistic update
    mutate(
      "tasks",
      tasks?.map((t) =>
        t._id === selectedTask._id
          ? { ...t, ...editTask }
          : t
      ),
      false
    );

    const { updateTask } = await import("@/app/actions/tasks");
    const result = await updateTask(selectedTask._id, formData);
    
    if (result.success) {
      toast({
        title: "Task Updated",
        description: "The task has been updated successfully",
      });
      setShowEditDialog(false);
      setShowAssignDialog(false);
      setSelectedTask(null);
      mutate("tasks");
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update task",
        variant: "destructive",
      });
      mutate("tasks"); // Revert on error
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTasks = tasks?.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = teamFilter === "all" || task.teamId === teamFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesTeam && matchesPriority;
  });

  const getTasksByStatus = (status: string) =>
    filteredTasks?.filter((task) => task.status === status) || [];

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks?.find((t) => t._id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    
    // Check if dropped on a column
    if (TASK_STATUSES.some((s) => s.id === newStatus)) {
      const task = tasks?.find((t) => t._id === taskId);
      if (task && task.status !== newStatus) {
        // Optimistic update
        mutate(
          "tasks",
          tasks?.map((t) =>
            t._id === taskId ? { ...t, status: newStatus } : t
          ),
          false
        );

        const result = await updateTaskStatus(taskId, newStatus);
        if (!result.success) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          mutate("tasks"); // Revert on error
        }
      }
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    const result = await createTask({
      ...newTask,
      status: "backlog",
    });

    if (result.success) {
      toast({
        title: "Task Created",
        description: "New task has been added to backlog",
      });
      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        teamId: "",
        assigneeId: "",
        dueDate: "",
      });
      mutate("tasks");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
          <p className="text-muted-foreground">
            Manage and track tasks across all teams
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Add a new task to the board. It will be added to the backlog.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Team</Label>
                  <Select
                    value={newTask.teamId}
                    onValueChange={(value) => setNewTask({ ...newTask, teamId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map((team) => (
                        <SelectItem key={team._id} value={team._id!}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={newTask.assigneeId}
                    onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id!}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTask}>Create Task</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={teamFilter} onValueChange={setTeamFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                {teams?.map((team) => (
                  <SelectItem key={team._id} value={team._id!}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task Board */}
      {tasksLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid flex-1 gap-4 overflow-x-auto pb-4 md:grid-cols-5">
            {TASK_STATUSES.map((status) => (
              <TaskColumn
                key={status.id}
                id={status.id}
                title={status.label}
                color={status.color}
                count={getTasksByStatus(status.id).length}
              >
                <SortableContext
                  items={getTasksByStatus(status.id).map((t) => t._id!)}
                  strategy={verticalListSortingStrategy}
                >
                  {getTasksByStatus(status.id).map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      teams={teams}
                      employees={employees}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onAssign={handleAssignTask}
                    />
                  ))}
                </SortableContext>
              </TaskColumn>
            ))}
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCard
                task={activeTask}
                teams={teams}
                employees={employees}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter task title"
                value={editTask.title}
                onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter task description"
                value={editTask.description}
                onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editTask.priority}
                  onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                    setEditTask({ ...editTask, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editTask.dueDate}
                  onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={editTask.assigneeId}
                onValueChange={(value) => setEditTask({ ...editTask, assigneeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id!}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
            <DialogDescription>
              Select an employee to assign this task to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Task</Label>
              <p className="text-sm text-muted-foreground">{selectedTask?.title}</p>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={editTask.assigneeId}
                onValueChange={(value) => setEditTask({ ...editTask, assigneeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id!}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
