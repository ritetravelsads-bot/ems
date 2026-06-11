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
import {
  DollarSign,
  Search,
  Calculator,
  FileText,
  Download,
  Eye,
  Plus,
} from "lucide-react";
import {
  getSalaryRecords,
  calculateSalaryByMonth,
  type SalaryRecord,
} from "@/app/actions/salary";
import { getEmployees } from "@/app/actions/employees";
import { useToast } from "@/hooks/use-toast";
import { calculateSalary } from "@/app/actions/salary"; // Import calculateSalary

interface Employee {
  _id?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}
import { format, parseISO } from "date-fns";

const salaryFetcher = async () => {
  const result = await getSalaryRecords();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const employeeFetcher = async () => {
  const result = await getEmployees();
  if (result.success) return result.data;
  throw new Error(result.error);
};

export default function SalaryPage() {
  const { data: salaryRecords, isLoading } = useSWR<SalaryRecord[]>(
    "salary",
    salaryFetcher
  );
  const { data: employees } = useSWR<Employee[]>("employees", employeeFetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [showCalculateDialog, setShowCalculateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(null);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const { toast } = useToast();

  const filteredRecords = salaryRecords?.filter((record) => {
    const matchesSearch =
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = record.month === monthFilter;
    return matchesSearch && matchesMonth;
  });

  const totalGross =
    filteredRecords?.reduce((sum, r) => sum + r.grossSalary, 0) || 0;
  const totalNet =
    filteredRecords?.reduce((sum, r) => sum + r.netSalary, 0) || 0;
  const totalDeductions =
    filteredRecords?.reduce((sum, r) => sum + r.totalDeductions, 0) || 0;

  const handleCalculateSalary = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    setIsCalculating(true);
    const result = await calculateSalaryByMonth(selectedEmployee, monthFilter);
    setIsCalculating(false);

    if (result.success) {
      toast({
        title: "Salary Calculated",
        description: "Salary has been calculated successfully",
      });
      setShowCalculateDialog(false);
      setSelectedEmployee("");
      mutate("salary");
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
      draft: "bg-muted text-muted-foreground",
      pending: "bg-warning/10 text-warning-foreground border-warning/20",
      paid: "bg-success/10 text-success border-success/20",
      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Salary Management
          </h1>
          <p className="text-muted-foreground">
            Calculate, manage, and track employee salaries
          </p>
        </div>
        <Button onClick={() => setShowCalculateDialog(true)}>
          <Calculator className="mr-2 h-4 w-4" />
          Calculate Salary
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gross</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGross)}</div>
            <p className="text-xs text-muted-foreground">For {monthFilter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalDeductions)}
            </div>
            <p className="text-xs text-muted-foreground">
              PF, Tax, Leave deductions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Net Pay</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalNet)}
            </div>
            <p className="text-xs text-muted-foreground">Take home amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredRecords?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Salary processed</p>
          </CardContent>
        </Card>
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
            <Input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Salary Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Records</CardTitle>
          <CardDescription>
            {filteredRecords?.length || 0} records for {monthFilter}
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
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Basic</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No salary records found for this month.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords?.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {record.employeeName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.employeeCode}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(record.basicSalary)}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          +{formatCurrency(record.totalAllowances)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(record.totalDeductions)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(record.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadge(record.status)}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRecord(record);
                                setShowPayslipDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculate Salary Dialog */}
      <Dialog open={showCalculateDialog} onOpenChange={setShowCalculateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calculate Salary</DialogTitle>
            <DialogDescription>
              Calculate salary for an employee for the selected month
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id!}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCalculateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCalculateSalary} disabled={isCalculating}>
              {isCalculating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payslip Details</DialogTitle>
            <DialogDescription>
              {selectedRecord?.employeeName} - {selectedRecord?.month}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee Name</p>
                  <p className="font-medium">{selectedRecord.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employee Code</p>
                  <p className="font-medium">{selectedRecord.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pay Period</p>
                  <p className="font-medium">{selectedRecord.month}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salary Type</p>
                  <p className="font-medium capitalize">
                    {selectedRecord.salaryType}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Earnings */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-4 font-semibold text-success">Earnings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Basic Salary</span>
                      <span>{formatCurrency(selectedRecord.basicSalary)}</span>
                    </div>
                    {selectedRecord.allowances?.map((allowance, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{allowance.name}</span>
                        <span>{formatCurrency(allowance.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Gross Salary</span>
                      <span>{formatCurrency(selectedRecord.grossSalary)}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-lg border p-4">
                  <h4 className="mb-4 font-semibold text-destructive">
                    Deductions
                  </h4>
                  <div className="space-y-2">
                    {selectedRecord.deductions?.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{deduction.name}</span>
                        <span>-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Deductions</span>
                      <span>
                        -{formatCurrency(selectedRecord.totalDeductions)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="rounded-lg bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Pay</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(selectedRecord.netSalary)}
                    </p>
                  </div>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
