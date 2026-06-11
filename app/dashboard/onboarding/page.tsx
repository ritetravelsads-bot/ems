"use client";

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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  UserPlus,
  UserMinus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Laptop,
  Key,
  CreditCard,
  Building,
  Calendar,
  User,
} from "lucide-react";
import { getEmployees, updateEmployeeStatus } from "@/app/actions/employees";
import { getTeams } from "@/app/actions/teams";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface Employee {
  _id?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
  status: string;
  designation?: string;
  teamId?: string;
  departmentId?: string;
  joiningDate?: string;
  exitDate?: string;
  onboardingChecklist?: Record<string, boolean>;
  offboardingChecklist?: Record<string, boolean>;
}

interface Team {
  _id?: string;
  name: string;
}

const employeeFetcher = async () => {
  const result = await getEmployees();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const teamsFetcher = async () => {
  const result = await getTeams();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const ONBOARDING_CHECKLIST = [
  { id: "documents", label: "Document Verification", icon: FileText },
  { id: "equipment", label: "Equipment Assigned", icon: Laptop },
  { id: "access", label: "System Access Granted", icon: Key },
  { id: "id_card", label: "ID Card Issued", icon: CreditCard },
  { id: "workspace", label: "Workspace Allocated", icon: Building },
  { id: "orientation", label: "Orientation Complete", icon: User },
];

const OFFBOARDING_CHECKLIST = [
  { id: "resignation", label: "Resignation Accepted", icon: FileText },
  { id: "handover", label: "Knowledge Handover", icon: User },
  { id: "equipment_return", label: "Equipment Returned", icon: Laptop },
  { id: "access_revoked", label: "Access Revoked", icon: Key },
  { id: "clearance", label: "Financial Clearance", icon: CreditCard },
  { id: "exit_interview", label: "Exit Interview", icon: Building },
];

interface OnboardingState {
  employeeId: string;
  checklist: Record<string, boolean>;
  notes: string;
  type: "onboarding" | "offboarding";
}

export default function OnboardingPage() {
  const { data: employees, isLoading } = useSWR<Employee[]>("employees", employeeFetcher);
  const { data: teams } = useSWR<Team[]>("teams", teamsFetcher);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [showOffboardDialog, setShowOffboardDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    employeeId: "",
    checklist: {},
    notes: "",
    type: "onboarding",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const pendingOnboarding = employees?.filter((e) => e.status === "onboarding") || [];
  const activeEmployees = employees?.filter((e) => e.status === "active") || [];
  const offboardingEmployees = employees?.filter((e) => e.status === "offboarding") || [];
  const inactiveEmployees = employees?.filter((e) => e.status === "inactive") || [];

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const startOnboarding = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOnboardingState({
      employeeId: employee._id!,
      checklist: {},
      notes: "",
      type: "onboarding",
    });
    setShowOnboardDialog(true);
  };

  const startOffboarding = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOnboardingState({
      employeeId: employee._id!,
      checklist: {},
      notes: "",
      type: "offboarding",
    });
    setShowOffboardDialog(true);
  };

  const toggleChecklistItem = (itemId: string) => {
    setOnboardingState((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: !prev.checklist[itemId],
      },
    }));
  };

  const calculateProgress = () => {
    const checklist =
      onboardingState.type === "onboarding"
        ? ONBOARDING_CHECKLIST
        : OFFBOARDING_CHECKLIST;
    const completed = Object.values(onboardingState.checklist).filter(Boolean).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const handleCompleteOnboarding = async () => {
    if (!selectedEmployee) return;

    const progress = calculateProgress();
    if (progress < 100) {
      toast({
        title: "Incomplete Checklist",
        description: "Please complete all checklist items before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await updateEmployeeStatus(selectedEmployee._id!, "active");
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Onboarding Complete",
        description: `${selectedEmployee.firstName} has been successfully onboarded`,
      });
      setShowOnboardDialog(false);
      setSelectedEmployee(null);
      mutate("employees");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleCompleteOffboarding = async () => {
    if (!selectedEmployee) return;

    const progress = calculateProgress();
    if (progress < 100) {
      toast({
        title: "Incomplete Checklist",
        description: "Please complete all checklist items before proceeding",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await updateEmployeeStatus(selectedEmployee._id!, "inactive");
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Offboarding Complete",
        description: `${selectedEmployee.firstName} has been successfully offboarded`,
      });
      setShowOffboardDialog(false);
      setSelectedEmployee(null);
      mutate("employees");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const initiateOffboarding = async (employee: Employee) => {
    const result = await updateEmployeeStatus(employee._id!, "offboarding");
    if (result.success) {
      toast({
        title: "Offboarding Initiated",
        description: `${employee.firstName}'s offboarding process has started`,
      });
      mutate("employees");
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
      active: "bg-success/10 text-success border-success/20",
      offboarding: "bg-chart-4/10 text-chart-4 border-chart-4/20",
      inactive: "bg-muted text-muted-foreground",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Onboarding & Offboarding
          </h1>
          <p className="text-muted-foreground">
            Manage employee onboarding and offboarding processes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Onboarding</CardTitle>
            <UserPlus className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">
              {pendingOnboarding.length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting process</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {activeEmployees.length}
            </div>
            <p className="text-xs text-muted-foreground">Currently working</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Offboarding</CardTitle>
            <UserMinus className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-4">
              {offboardingEmployees.length}
            </div>
            <p className="text-xs text-muted-foreground">Exiting process</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveEmployees.length}</div>
            <p className="text-xs text-muted-foreground">Former employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="onboarding" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Onboarding
            {pendingOnboarding.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingOnboarding.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="offboarding" className="gap-2">
            <UserMinus className="h-4 w-4" />
            Offboarding
            {offboardingEmployees.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {offboardingEmployees.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Pending Onboarding</CardTitle>
              <CardDescription>
                New employees waiting to be onboarded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingOnboarding.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No pending onboarding requests
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingOnboarding.map((employee) => (
                    <div
                      key={employee._id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.employeeCode} | {employee.designation}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joining: {employee.joiningDate ? format(parseISO(employee.joiningDate), "MMM dd, yyyy") : "Not set"}
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => startOnboarding(employee)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Start Onboarding
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offboarding">
          <Card>
            <CardHeader>
              <CardTitle>Active Offboarding</CardTitle>
              <CardDescription>
                Employees in the offboarding process
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offboardingEmployees.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-muted-foreground">
                  No active offboarding processes
                </div>
              ) : (
                <div className="space-y-4">
                  {offboardingEmployees.map((employee) => (
                    <div
                      key={employee._id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          {employee.firstName[0]}
                          {employee.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.employeeCode} | {employee.designation}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => startOffboarding(employee)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Continue Offboarding
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Initiate Offboarding for Active Employees */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Initiate Offboarding</CardTitle>
              <CardDescription>
                Start offboarding process for active employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeEmployees.slice(0, 5).map((employee) => (
                  <div
                    key={employee._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {employee.firstName[0]}
                        {employee.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {employee.employeeCode}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => initiateOffboarding(employee)}
                    >
                      Initiate Offboarding
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Employees</CardTitle>
              <CardDescription>
                Complete list with onboarding/offboarding status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="offboarding">Offboarding</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees?.map((employee) => (
                      <TableRow key={employee._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">
                              {employee.firstName[0]}
                              {employee.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {employee.designation}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {employee.employeeCode}
                        </TableCell>
                        <TableCell>
                          {teams?.find((t) => t._id === employee.teamId)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadge(employee.status)}
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => startOnboarding(employee)}
                            >
                              Onboard
                            </Button>
                          )}
                          {employee.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => initiateOffboarding(employee)}
                            >
                              Offboard
                            </Button>
                          )}
                          {employee.status === "offboarding" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => startOffboarding(employee)}
                            >
                              Continue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboardDialog} onOpenChange={setShowOnboardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-success" />
              Onboarding Checklist
            </DialogTitle>
            <DialogDescription>
              Complete all steps to onboard {selectedEmployee?.firstName}{" "}
              {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} />
            </div>

            <div className="space-y-3">
              {ONBOARDING_CHECKLIST.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={item.id}
                      checked={onboardingState.checklist[item.id] || false}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                      {item.label}
                    </Label>
                    {onboardingState.checklist[item.id] && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about the onboarding process..."
                value={onboardingState.notes}
                onChange={(e) =>
                  setOnboardingState((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOnboardDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteOnboarding}
              disabled={isSubmitting || calculateProgress() < 100}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Onboarding
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offboarding Dialog */}
      <Dialog open={showOffboardDialog} onOpenChange={setShowOffboardDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-destructive" />
              Offboarding Checklist
            </DialogTitle>
            <DialogDescription>
              Complete all steps to offboard {selectedEmployee?.firstName}{" "}
              {selectedEmployee?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} />
            </div>

            <div className="space-y-3">
              {OFFBOARDING_CHECKLIST.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={`off-${item.id}`}
                      checked={onboardingState.checklist[item.id] || false}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor={`off-${item.id}`} className="flex-1 cursor-pointer">
                      {item.label}
                    </Label>
                    {onboardingState.checklist[item.id] && (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Add any notes about the offboarding process..."
                value={onboardingState.notes}
                onChange={(e) =>
                  setOnboardingState((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOffboardDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteOffboarding}
              disabled={isSubmitting || calculateProgress() < 100}
              variant="destructive"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  Complete Offboarding
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
