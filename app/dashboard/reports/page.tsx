"use client";

import { useState } from "react";
import useSWR from "swr";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Download,
  FileText,
  Users,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChartIcon,
} from "lucide-react";
import { getEmployees } from "@/app/actions/employees";
import { getAttendanceRecords } from "@/app/actions/attendance";
import { getSalaryRecords } from "@/app/actions/salary";
import { getLeaveRequests } from "@/app/actions/leaves";
import { getTeams } from "@/app/actions/teams";
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from "date-fns";

interface Employee {
  _id?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  status: string;
  teamId?: string;
}

interface AttendanceRecord {
  _id?: string;
  date: string;
  employeeName: string;
  status: string;
}

interface SalaryRecord {
  _id?: string;
  employeeName: string;
  employeeCode: string;
  month: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  status: string;
  salaryType: string;
}

interface LeaveRequest {
  _id?: string;
  employeeName: string;
  leaveType: string;
  status: string;
  days: number;
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

const attendanceFetcher = async () => {
  const result = await getAttendanceRecords();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const salaryFetcher = async () => {
  const result = await getSalaryRecords();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const leavesFetcher = async () => {
  const result = await getLeaveRequests();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const teamsFetcher = async () => {
  const result = await getTeams();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function ReportsPage() {
  const { data: employees } = useSWR<Employee[]>("employees", employeeFetcher);
  const { data: attendance } = useSWR<AttendanceRecord[]>("attendance", attendanceFetcher);
  const { data: salary } = useSWR<SalaryRecord[]>("salary", salaryFetcher);
  const { data: leaves } = useSWR<LeaveRequest[]>("leaves", leavesFetcher);
  const { data: teams } = useSWR<Team[]>("teams", teamsFetcher);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [reportType, setReportType] = useState("attendance");

  // Team distribution data
  const teamDistribution = teams?.map((team) => ({
    name: team.name,
    value: employees?.filter((e) => e.teamId === team._id).length || 0,
  })) || [];

  // Attendance trends (last 6 months)
  const attendanceTrends = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, "yyyy-MM");
    const monthRecords = attendance?.filter((a) => a.date.startsWith(monthStr)) || [];
    return {
      month: format(date, "MMM"),
      present: monthRecords.filter((r) => r.status === "present").length,
      absent: monthRecords.filter((r) => r.status === "absent").length,
      late: monthRecords.filter((r) => r.status === "late").length,
    };
  });

  // Salary distribution by department
  const salaryByTeam = teams?.map((team) => {
    const teamEmployees = employees?.filter((e) => e.teamId === team._id) || [];
    const teamEmployeeNames = new Set(teamEmployees.map((e) => `${e.firstName} ${e.lastName}`));
    const teamSalaries = salary?.filter((s) =>
      teamEmployeeNames.has(s.employeeName)
    ) || [];
    const totalSalary = teamSalaries.reduce((sum, s) => sum + s.netSalary, 0);
    return {
      name: team.name,
      salary: totalSalary,
    };
  }) || [];

  // Leave statistics
  const leaveStats = [
    { name: "Casual", value: leaves?.filter((l) => l.leaveType === "casual").length || 0 },
    { name: "Sick", value: leaves?.filter((l) => l.leaveType === "sick").length || 0 },
    { name: "Annual", value: leaves?.filter((l) => l.leaveType === "annual").length || 0 },
    { name: "Maternity", value: leaves?.filter((l) => l.leaveType === "maternity").length || 0 },
    { name: "Unpaid", value: leaves?.filter((l) => l.leaveType === "unpaid").length || 0 },
  ];

  // Monthly salary trends
  const salaryTrends = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStr = format(date, "yyyy-MM");
    const monthSalaries = salary?.filter((s) => s.month === monthStr) || [];
    return {
      month: format(date, "MMM"),
      gross: monthSalaries.reduce((sum, s) => sum + s.grossSalary, 0),
      net: monthSalaries.reduce((sum, s) => sum + s.netSalary, 0),
      deductions: monthSalaries.reduce((sum, s) => sum + s.totalDeductions, 0),
    };
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(amount);
  };

  const exportReport = (type: string) => {
    let data: string[][] = [];
    let filename = "";

    switch (type) {
      case "attendance":
        data = [
          ["Date", "Employee", "Status", "Check In", "Check Out"],
          ...(attendance?.map((a) => [
            a.date,
            a.employeeName || "",
            a.status,
            a.checkIn || "",
            a.checkOut || "",
          ]) || []),
        ];
        filename = `attendance-report-${selectedMonth}.csv`;
        break;
      case "salary":
        data = [
          ["Month", "Employee", "Gross", "Deductions", "Net"],
          ...(salary?.map((s) => [
            s.month,
            s.employeeName || "",
            s.grossSalary.toString(),
            s.totalDeductions.toString(),
            s.netSalary.toString(),
          ]) || []),
        ];
        filename = `salary-report-${selectedMonth}.csv`;
        break;
      case "leaves":
        data = [
          ["Employee", "Type", "Start", "End", "Status"],
          ...(leaves?.map((l) => [
            l.employeeName || "",
            l.leaveType,
            l.startDate,
            l.endDate,
            l.status,
          ]) || []),
        ];
        filename = `leaves-report-${selectedMonth}.csv`;
        break;
      case "employees":
        data = [
          ["Code", "Name", "Email", "Department", "Status"],
          ...(employees?.map((e) => [
            e.employeeCode,
            `${e.firstName} ${e.lastName}`,
            e.email,
            teams?.find((t) => t._id === e.teamId)?.name || "",
            e.status,
          ]) || []),
        ];
        filename = `employees-report.csv`;
        break;
    }

    const csv = data.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate insights and export data reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {employees?.filter((e) => e.status === "active").length || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {attendance && attendance.length > 0
                ? Math.round(
                    (attendance.filter((a) => a.status === "present").length /
                      attendance.length) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                salary
                  ?.filter((s) => s.month === selectedMonth)
                  .reduce((sum, s) => sum + s.netSalary, 0) || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">For {selectedMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">
              {leaves?.filter((l) => l.status === "pending").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Team Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Team Distribution
                </CardTitle>
                <CardDescription>Employees by team/department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teamDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {teamDistribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Attendance Trends
                </CardTitle>
                <CardDescription>Last 6 months attendance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="present" fill="var(--success)" name="Present" />
                      <Bar dataKey="absent" fill="var(--destructive)" name="Absent" />
                      <Bar dataKey="late" fill="var(--warning)" name="Late" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Salary by Department */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Salary by Department
                </CardTitle>
                <CardDescription>Total salary distribution by team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salaryByTeam} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="salary" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Leave Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Leave Statistics
                </CardTitle>
                <CardDescription>Leave requests by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {leaveStats.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>
                  Detailed attendance records for {selectedMonth}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportReport("attendance")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="present"
                      stroke="var(--success)"
                      strokeWidth={2}
                      name="Present"
                    />
                    <Line
                      type="monotone"
                      dataKey="absent"
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      name="Absent"
                    />
                    <Line
                      type="monotone"
                      dataKey="late"
                      stroke="var(--warning)"
                      strokeWidth={2}
                      name="Late"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Salary Report</CardTitle>
                <CardDescription>
                  Monthly salary trends and distribution
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportReport("salary")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salaryTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      name="Gross Salary"
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="var(--success)"
                      strokeWidth={2}
                      name="Net Salary"
                    />
                    <Line
                      type="monotone"
                      dataKey="deductions"
                      stroke="var(--destructive)"
                      strokeWidth={2}
                      name="Deductions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leaves Report</CardTitle>
                <CardDescription>Leave requests and approvals overview</CardDescription>
              </div>
              <Button variant="outline" onClick={() => exportReport("leaves")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leaveStats}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {leaveStats.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Leave Summary</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span>Total Requests</span>
                      <Badge variant="secondary">{leaves?.length || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span>Approved</span>
                      <Badge className="bg-success/10 text-success">
                        {leaves?.filter((l) => l.status === "approved").length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span>Pending</span>
                      <Badge className="bg-warning/10 text-warning-foreground">
                        {leaves?.filter((l) => l.status === "pending").length || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span>Rejected</span>
                      <Badge className="bg-destructive/10 text-destructive">
                        {leaves?.filter((l) => l.status === "rejected").length || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Quick Export
          </CardTitle>
          <CardDescription>
            Download reports in CSV format for further analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-transparent"
              onClick={() => exportReport("employees")}
            >
              <Users className="h-6 w-6" />
              <span>Employee List</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-transparent"
              onClick={() => exportReport("attendance")}
            >
              <Clock className="h-6 w-6" />
              <span>Attendance Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-transparent"
              onClick={() => exportReport("salary")}
            >
              <DollarSign className="h-6 w-6" />
              <span>Salary Report</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-transparent"
              onClick={() => exportReport("leaves")}
            >
              <Calendar className="h-6 w-6" />
              <span>Leaves Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
