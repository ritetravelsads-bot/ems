"use client";

import React from "react"

import { useState } from "react";
import useSWR, { mutate } from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Plus,
  Edit,
  Trash2,
  Sun,
  Moon,
  Sunrise,
  Users,
} from "lucide-react";
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} from "@/app/actions/shifts";
import type { Shift } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const shiftsFetcher = async () => {
  const result = await getShifts();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const SHIFT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  morning: Sunrise,
  day: Sun,
  evening: Sun,
  night: Moon,
  rotational: Clock,
};

export default function ShiftsPage() {
  const { data: shifts, isLoading } = useSWR<Shift[]>("shifts", shiftsFetcher);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [newShift, setNewShift] = useState({
    name: "",
    type: "day" as "morning" | "day" | "evening" | "night" | "rotational",
    startTime: "",
    endTime: "",
    breakDuration: "60",
    graceMinutes: "15",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddShift = async () => {
    if (!newShift.name || !newShift.startTime || !newShift.endTime) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createShift({
      ...newShift,
      breakDuration: Number.parseInt(newShift.breakDuration),
      graceMinutes: Number.parseInt(newShift.graceMinutes),
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Shift Created",
        description: "New shift has been added",
      });
      setShowAddDialog(false);
      resetForm();
      mutate("shifts");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleUpdateShift = async () => {
    if (!editingShift) return;

    setIsSubmitting(true);
    const result = await updateShift(editingShift._id!, {
      ...newShift,
      breakDuration: Number.parseInt(newShift.breakDuration),
      graceMinutes: Number.parseInt(newShift.graceMinutes),
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Shift Updated",
        description: "Shift details have been updated",
      });
      setEditingShift(null);
      resetForm();
      mutate("shifts");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift?")) return;

    const result = await deleteShift(id);
    if (result.success) {
      toast({
        title: "Shift Deleted",
        description: "Shift has been removed",
      });
      mutate("shifts");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewShift({
      name: "",
      type: "day",
      startTime: "",
      endTime: "",
      breakDuration: "60",
      graceMinutes: "15",
      isActive: true,
    });
  };

  const openEditDialog = (shift: Shift) => {
    setEditingShift(shift);
    setNewShift({
      name: shift.name,
      type: shift.type,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration.toString(),
      graceMinutes: shift.graceMinutes.toString(),
      isActive: shift.isActive,
    });
  };

  const calculateHours = (start: string, end: string, breakMinutes: number) => {
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    let totalMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight shifts
    totalMinutes -= breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getShiftTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      morning: "bg-warning/10 text-warning-foreground border-warning/20",
      day: "bg-success/10 text-success border-success/20",
      evening: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      night: "bg-chart-5/10 text-chart-5 border-chart-5/20",
      rotational: "bg-primary/10 text-primary border-primary/20",
    };
    return variants[type] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">
            Configure and manage employee work shifts
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Shift
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Sun className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {shifts?.filter((s) => s.isActive).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Night Shifts</CardTitle>
            <Moon className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-5">
              {shifts?.filter((s) => s.type === "night").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rotational</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {shifts?.filter((s) => s.type === "rotational").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift List</CardTitle>
          <CardDescription>
            All configured work shifts for employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Grace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        No shifts configured yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shifts?.map((shift) => {
                      const ShiftIcon = SHIFT_ICONS[shift.type] || Clock;
                      return (
                        <TableRow key={shift._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ShiftIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{shift.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getShiftTypeBadge(shift.type)}
                            >
                              {shift.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {shift.startTime}
                          </TableCell>
                          <TableCell className="font-mono">
                            {shift.endTime}
                          </TableCell>
                          <TableCell>
                            {calculateHours(
                              shift.startTime,
                              shift.endTime,
                              shift.breakDuration
                            )}
                          </TableCell>
                          <TableCell>{shift.breakDuration} min</TableCell>
                          <TableCell>{shift.graceMinutes} min</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                shift.isActive
                                  ? "bg-success/10 text-success border-success/20"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {shift.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(shift)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteShift(shift._id!)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Shift Dialog */}
      <Dialog
        open={showAddDialog || !!editingShift}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingShift(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShift ? "Edit Shift" : "Add New Shift"}
            </DialogTitle>
            <DialogDescription>
              {editingShift
                ? "Update shift configuration"
                : "Configure a new work shift"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift Name *</Label>
                <Input
                  placeholder="e.g., Morning Shift"
                  value={newShift.name}
                  onChange={(e) =>
                    setNewShift({ ...newShift, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Shift Type *</Label>
                <Select
                  value={newShift.type}
                  onValueChange={(
                    value: "morning" | "day" | "evening" | "night" | "rotational"
                  ) => setNewShift({ ...newShift, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                    <SelectItem value="rotational">Rotational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) =>
                    setNewShift({ ...newShift, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) =>
                    setNewShift({ ...newShift, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Break Duration (minutes)</Label>
                <Input
                  type="number"
                  value={newShift.breakDuration}
                  onChange={(e) =>
                    setNewShift({ ...newShift, breakDuration: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Grace Period (minutes)</Label>
                <Input
                  type="number"
                  value={newShift.graceMinutes}
                  onChange={(e) =>
                    setNewShift({ ...newShift, graceMinutes: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={newShift.isActive}
                onChange={(e) =>
                  setNewShift({ ...newShift, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="isActive" className="text-sm font-normal">
                Shift is active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingShift(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingShift ? handleUpdateShift : handleAddShift}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : editingShift ? (
                "Update Shift"
              ) : (
                "Add Shift"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
