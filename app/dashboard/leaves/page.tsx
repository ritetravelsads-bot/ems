"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Search,
  Plus,
  Check,
  X,
  Clock,
  CalendarDays,
  Palmtree,
  Stethoscope,
  Baby,
} from "lucide-react";
import {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
  type LeaveRequest,
} from "@/app/actions/leaves";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays } from "date-fns";

interface User {
  _id?: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'employee';
}

const leavesFetcher = async () => {
  const result = await getLeaveRequests();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const LEAVE_TYPES = [
  { id: "casual", label: "Casual Leave", icon: CalendarDays, color: "bg-primary" },
  { id: "sick", label: "Sick Leave", icon: Stethoscope, color: "bg-destructive" },
  { id: "annual", label: "Annual Leave", icon: Palmtree, color: "bg-success" },
  { id: "maternity", label: "Maternity/Paternity", icon: Baby, color: "bg-chart-5" },
  { id: "unpaid", label: "Unpaid Leave", icon: Calendar, color: "bg-muted" },
];

export default function LeavesPage() {
  const { data: leaveRequests, isLoading } = useSWR<LeaveRequest[]>(
    "leaves",
    leavesFetcher
  );
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const canManageLeaves = user?.role === 'admin' || user?.role === 'hr';

  const filteredRequests = leaveRequests?.filter((request) => {
    const matchesSearch =
      request.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    const matchesType =
      typeFilter === "all" || request.leaveType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = leaveRequests?.filter((r) => r.status === "pending").length || 0;
  const approvedCount = leaveRequests?.filter((r) => r.status === "approved").length || 0;
  const rejectedCount = leaveRequests?.filter((r) => r.status === "rejected").length || 0;

  const calculateDays = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  };

  const handleApplyLeave = async () => {
    if (!newLeave.leaveType || !newLeave.startDate || !newLeave.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createLeaveRequest(newLeave);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Leave Applied",
        description: "Your leave request has been submitted",
      });
      setShowApplyDialog(false);
      setNewLeave({ leaveType: "", startDate: "", endDate: "", reason: "" });
      mutate("leaves");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleLeaveAction = async (action: "approved" | "rejected") => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    const result = await updateLeaveStatus(selectedRequest._id!, action);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: `Leave ${action === "approved" ? "Approved" : "Rejected"}`,
        description: `The leave request has been ${action}`,
      });
      setShowActionDialog(false);
      setSelectedRequest(null);
      mutate("leaves");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-warning/10 text-warning-foreground border-warning/20",
      approved: "bg-success/10 text-success border-success/20",
      rejected: "bg-destructive/10 text-destructive border-destructive/20",
      cancelled: "bg-muted text-muted-foreground",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  const getLeaveTypeInfo = (typeId: string) => {
    return LEAVE_TYPES.find((t) => t.id === typeId) || LEAVE_TYPES[0];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Apply for and manage employee leave requests
          </p>
        </div>
        <Button onClick={() => setShowApplyDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <X className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {rejectedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Types Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        {LEAVE_TYPES.map((type) => {
          const Icon = type.icon;
          const count =
            leaveRequests?.filter(
              (r) => r.leaveType === type.id && r.status === "approved"
            ).length || 0;
          return (
            <Card key={type.id} className="cursor-pointer hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg p-2 ${type.color}/10`}>
                  <Icon className={`h-5 w-5 ${type.color.replace("bg-", "text-")}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{count} approved</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or employee code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Leave Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {LEAVE_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>
            {filteredRequests?.length || 0} requests found
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
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageLeaves && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No leave requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((request) => {
                      const typeInfo = getLeaveTypeInfo(request.leaveType);
                      const TypeIcon = typeInfo.icon;
                      return (
                        <TableRow key={request._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.employeeName}</p>
                              <p className="text-xs text-muted-foreground">
                                {request.employeeCode}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TypeIcon className="h-4 w-4 text-muted-foreground" />
                              {typeInfo.label}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(parseISO(request.startDate), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(request.endDate), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {calculateDays(request.startDate, request.endDate)} days
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadge(request.status)}
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          {canManageLeaves && (
                          <TableCell>
                            {request.status === "pending" && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-success hover:bg-success/10"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    handleLeaveAction("approved");
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    handleLeaveAction("rejected");
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          )}
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

      {/* Apply Leave Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Submit a new leave request for approval
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={newLeave.leaveType}
                onValueChange={(value) =>
                  setNewLeave({ ...newLeave, leaveType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newLeave.startDate}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={newLeave.endDate}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Enter reason for leave"
                value={newLeave.reason}
                onChange={(e) =>
                  setNewLeave({ ...newLeave, reason: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyLeave} disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
