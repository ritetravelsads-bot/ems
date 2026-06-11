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
import {
  Laptop,
  Monitor,
  Phone,
  Car,
  Key,
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Package,
} from "lucide-react";
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
} from "@/app/actions/assets";
import { getEmployees } from "@/app/actions/employees";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface Asset {
  _id?: string;
  name: string;
  type: string;
  serialNumber?: string;
  assignedTo?: string;
  status: string;
  purchaseDate?: string;
  purchasePrice?: number;
  condition?: 'new' | 'good' | 'fair' | 'poor';
  notes?: string;
  employee?: { firstName: string; lastName: string };
}

interface Employee {
  _id?: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

const assetsFetcher = async () => {
  const result = await getAssets();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const employeeFetcher = async () => {
  const result = await getEmployees();
  if (result.success) return result.data;
  throw new Error(result.error);
};

const ASSET_TYPES = [
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "monitor", label: "Monitor", icon: Monitor },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "vehicle", label: "Vehicle", icon: Car },
  { id: "access_card", label: "Access Card", icon: CreditCard },
  { id: "keys", label: "Keys", icon: Key },
  { id: "other", label: "Other", icon: Package },
];

export default function AssetsPage() {
  const { data: assets, isLoading } = useSWR<Asset[]>("assets", assetsFetcher);
  const { data: employees } = useSWR<Employee[]>("employees", employeeFetcher);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "other", // Updated default value to be a non-empty string
    serialNumber: "",
    assignedTo: "",
    purchaseDate: "",
    purchasePrice: "",
    condition: "good" as "new" | "good" | "fair" | "poor",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const filteredAssets = assets?.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || asset.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || asset.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const assignedCount = assets?.filter((a) => a.status === "assigned").length || 0;
  const availableCount = assets?.filter((a) => a.status === "available").length || 0;
  const maintenanceCount = assets?.filter((a) => a.status === "maintenance").length || 0;

  const handleAddAsset = async () => {
    if (!newAsset.name || !newAsset.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const result = await createAsset({
      ...newAsset,
      purchasePrice: newAsset.purchasePrice
        ? Number.parseFloat(newAsset.purchasePrice)
        : undefined,
      status: newAsset.assignedTo ? "assigned" : "available",
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Asset Added",
        description: "New asset has been recorded",
      });
      setShowAddDialog(false);
      resetForm();
      mutate("assets");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset) return;

    setIsSubmitting(true);
    const result = await updateAsset(editingAsset._id!, {
      ...newAsset,
      purchasePrice: newAsset.purchasePrice
        ? Number.parseFloat(newAsset.purchasePrice)
        : undefined,
      status: newAsset.assignedTo ? "assigned" : "available",
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: "Asset Updated",
        description: "Asset details have been updated",
      });
      setEditingAsset(null);
      resetForm();
      mutate("assets");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    const result = await deleteAsset(id);
    if (result.success) {
      toast({
        title: "Asset Deleted",
        description: "Asset has been removed from records",
      });
      mutate("assets");
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewAsset({
      name: "",
      type: "other", // Updated default value to be a non-empty string
      serialNumber: "",
      assignedTo: "",
      purchaseDate: "",
      purchasePrice: "",
      condition: "good",
      notes: "",
    });
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setNewAsset({
      name: asset.name,
      type: asset.type,
      serialNumber: asset.serialNumber || "",
      assignedTo: asset.assignedTo || "",
      purchaseDate: asset.purchaseDate || "",
      purchasePrice: asset.purchasePrice?.toString() || "",
      condition: asset.condition || "good",
      notes: asset.notes || "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      available: "bg-success/10 text-success border-success/20",
      assigned: "bg-primary/10 text-primary border-primary/20",
      maintenance: "bg-warning/10 text-warning-foreground border-warning/20",
      retired: "bg-muted text-muted-foreground",
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  const getConditionBadge = (condition: string) => {
    const variants: Record<string, string> = {
      new: "bg-success/10 text-success border-success/20",
      good: "bg-primary/10 text-primary border-primary/20",
      fair: "bg-warning/10 text-warning-foreground border-warning/20",
      poor: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return variants[condition] || "bg-muted text-muted-foreground";
  };

  const getAssetIcon = (type: string) => {
    const assetType = ASSET_TYPES.find((t) => t.id === type);
    return assetType?.icon || Package;
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
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
          <h1 className="text-2xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Track and manage company assets assigned to employees
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assets?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Laptop className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{assignedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-foreground">
              {maintenanceCount}
            </div>
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
                placeholder="Search by name or serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ASSET_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assets Inventory</CardTitle>
          <CardDescription>
            {filteredAssets?.length || 0} assets found
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
                    <TableHead>Asset</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No assets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets?.map((asset) => {
                      const AssetIcon = getAssetIcon(asset.type);
                      const assignee = employees?.find(
                        (e) => e._id === asset.assignedTo
                      );
                      return (
                        <TableRow key={asset._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="rounded-lg bg-muted p-2">
                                <AssetIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{asset.name}</p>
                                <p className="text-xs capitalize text-muted-foreground">
                                  {asset.type.replace("_", " ")}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {asset.serialNumber || "-"}
                          </TableCell>
                          <TableCell>
                            {assignee ? (
                              <span>
                                {assignee.firstName} {assignee.lastName}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getConditionBadge(asset.condition || "good")}
                            >
                              {asset.condition || "good"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadge(asset.status)}
                            >
                              {asset.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(asset.purchasePrice)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(asset)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteAsset(asset._id!)}
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

      {/* Add/Edit Asset Dialog */}
      <Dialog
        open={showAddDialog || !!editingAsset}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingAsset(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? "Edit Asset" : "Add New Asset"}
            </DialogTitle>
            <DialogDescription>
              {editingAsset
                ? "Update asset details"
                : "Record a new company asset"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Name *</Label>
                <Input
                  placeholder="e.g., MacBook Pro 14"
                  value={newAsset.name}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={newAsset.type}
                  onValueChange={(value) =>
                    setNewAsset({ ...newAsset, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  placeholder="e.g., ABC123XYZ"
                  value={newAsset.serialNumber}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, serialNumber: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select
                  value={newAsset.condition}
                  onValueChange={(value: "new" | "good" | "fair" | "poor") =>
                    setNewAsset({ ...newAsset, condition: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={newAsset.purchaseDate}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, purchaseDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newAsset.purchasePrice}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, purchasePrice: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select
                value={newAsset.assignedTo}
                onValueChange={(value) =>
                  setNewAsset({ ...newAsset, assignedTo: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees?.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id!}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes about this asset"
                value={newAsset.notes}
                onChange={(e) =>
                  setNewAsset({ ...newAsset, notes: e.target.value })
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingAsset(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingAsset ? handleUpdateAsset : handleAddAsset}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : editingAsset ? (
                "Update Asset"
              ) : (
                "Add Asset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
