"use client";

import { useState, useEffect } from "react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  MapPin,
  Calendar,
  Search,
  Download,
  Eye,
  Filter,
} from "lucide-react";
import { getAttendanceRecords, type AttendanceRecord } from "@/app/actions/attendance";
import { format, parseISO, differenceInMinutes } from "date-fns";

const fetcher = async () => {
  const result = await getAttendanceRecords();
  if (result.success) return result.data;
  throw new Error(result.error);
};

export default function AttendancePage() {
  const { data: records, isLoading } = useSWR<AttendanceRecord[]>("attendance", fetcher);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [checkInAddress, setCheckInAddress] = useState<string>('');
  const [checkOutAddress, setCheckOutAddress] = useState<string>('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      return data.address || 'Address not available';
    } catch {
      return 'Failed to load address';
    }
  };

  const openLocationDialog = async (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setCheckInAddress('');
    setCheckOutAddress('');
    setShowLocationDialog(true);
    setLoadingAddress(true);

    const promises: Promise<void>[] = [];

    if (record.checkInLocation) {
      promises.push(
        reverseGeocode(record.checkInLocation.latitude, record.checkInLocation.longitude)
          .then(addr => setCheckInAddress(addr))
      );
    }
    if (record.checkOutLocation) {
      promises.push(
        reverseGeocode(record.checkOutLocation.latitude, record.checkOutLocation.longitude)
          .then(addr => setCheckOutAddress(addr))
      );
    }

    await Promise.all(promises);
    setLoadingAddress(false);
  };

  const filteredRecords = records?.filter((record) => {
    const matchesSearch =
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesDate = !dateFilter || record.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const calculateHours = (checkIn?: string, checkOut?: string) => {
    if (!checkIn || !checkOut) return "-";
    const start = parseISO(`2024-01-01T${checkIn}`);
    const end = parseISO(`2024-01-01T${checkOut}`);
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-success/10 text-success border-success/20",
      absent: "bg-destructive/10 text-destructive border-destructive/20",
      late: "bg-warning/10 text-warning-foreground border-warning/20",
      "half-day": "bg-chart-4/10 text-chart-4 border-chart-4/20",
      "on-leave": "bg-chart-5/10 text-chart-5 border-chart-5/20",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  const exportToCSV = () => {
    if (!filteredRecords) return;
    const headers = ["Date", "Employee", "Code", "Check In", "Check Out", "Hours", "Status"];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.employeeName,
      r.employeeCode,
      r.checkIn || "-",
      r.checkOut || "-",
      calculateHours(r.checkIn, r.checkOut),
      r.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Records</h1>
          <p className="text-muted-foreground">
            Track and manage employee attendance with geo-location data
          </p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today Present</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {records?.filter((r) => r.date === format(new Date(), "yyyy-MM-dd") && r.status === "present").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">
              {records?.filter((r) => r.date === format(new Date(), "yyyy-MM-dd") && r.status === "late").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {records?.filter((r) => r.date === format(new Date(), "yyyy-MM-dd") && r.status === "absent").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-5">
              {records?.filter((r) => r.date === format(new Date(), "yyyy-MM-dd") && r.status === "on-leave").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
                <SelectItem value="on-leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-44"
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Log</CardTitle>
          <CardDescription>
            {filteredRecords?.length || 0} records found
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
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords?.map((record) => (
                      <TableRow key={record._id}>
                        <TableCell className="font-medium">
                          {format(parseISO(record.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>{record.employeeName}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.employeeCode}
                        </TableCell>
                        <TableCell>
                          {record.checkIn ? (
                            <span className="text-success">{record.checkIn}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? (
                            <span className="text-destructive">{record.checkOut}</span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {calculateHours(record.checkIn, record.checkOut)}
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
                          {record.checkInLocation ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openLocationDialog(record)}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          ) : (
                            "-"
                          )}
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

      {/* Location Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Location Details
            </DialogTitle>
            <DialogDescription>
              Geo-location data captured during check-in/check-out
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium text-success">Check-In Location</h4>
                {selectedRecord.checkInLocation ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <div>
                        {loadingAddress && !checkInAddress ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Loading address...
                          </div>
                        ) : (
                          <p className="leading-relaxed">{checkInAddress || 'Address not available'}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedRecord.checkInLocation.latitude},${selectedRecord.checkInLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not captured</p>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="mb-2 font-medium text-destructive">Check-Out Location</h4>
                {selectedRecord.checkOutLocation ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div>
                        {loadingAddress && !checkOutAddress ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Loading address...
                          </div>
                        ) : (
                          <p className="leading-relaxed">{checkOutAddress || 'Address not available'}</p>
                        )}
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedRecord.checkOutLocation.latitude},${selectedRecord.checkOutLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Google Maps
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not captured</p>
                )}
              </div>
              {selectedRecord.checkInPhoto && (
                <div className="rounded-lg border p-4">
                  <h4 className="mb-2 font-medium">Check-In Photo</h4>
                  <img
                    src={selectedRecord.checkInPhoto || "/placeholder.svg"}
                    alt="Check-in capture"
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
