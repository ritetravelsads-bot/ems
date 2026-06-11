'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2, Upload, Building2, CreditCard, Phone, MapPin, Laptop } from 'lucide-react'
import { updateEmployee, updateEmployeeProfileImage, uploadEmployeeDocument } from '@/app/actions/employees'
import { toast } from 'sonner'
import { put } from '@vercel/blob'

interface Employee {
  _id: string
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  designation: string
  status: string
  teamId?: string
  departmentId?: string
  profileImage?: string
  salaryType: 'fixed' | 'hourly'
  salary: number
  hourlyRate?: number
  shiftId?: string
  address?: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
  }
  bankDetails?: {
    bankName: string
    accountNumber: string
    ifscCode: string
    accountHolderName: string
  }
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  documents?: {
    name: string
    url: string
    uploadedAt: Date
  }[]
}

interface Department {
  _id: string
  name: string
}

interface Team {
  _id: string
  name: string
  departmentId: string
}

interface Shift {
  _id: string
  name: string
  startTime: string
  endTime: string
}

interface Asset {
  _id: string
  name: string
  type: string
  serialNumber?: string
  status: string
}

interface EmployeeDetailClientProps {
  employee: Employee
  departments: Department[]
  teams: Team[]
  shifts: Shift[]
  assets: Asset[]
}

export function EmployeeDetailClient({ employee, departments, teams, shifts, assets }: EmployeeDetailClientProps) {
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedDept, setSelectedDept] = useState(employee.departmentId || '')

  const filteredTeams = selectedDept
    ? teams.filter(t => t.departmentId === selectedDept)
    : teams

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    const result = await updateEmployee(employee._id, formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Employee updated successfully')
    }
    setLoading(false)
  }

  async function handleProfileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const blob = await put(`employees/${employee._id}/profile.${file.name.split('.').pop()}`, file, {
        access: 'public'
      })
      await updateEmployeeProfileImage(employee._id, blob.url)
      toast.success('Profile image updated')
    } catch (error) {
      toast.error('Failed to upload image')
    }
    setUploading(false)
  }

  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const blob = await put(`employees/${employee._id}/documents/${file.name}`, file, {
        access: 'public'
      })
      await uploadEmployeeDocument(employee._id, file.name, blob.url)
      toast.success('Document uploaded')
    } catch (error) {
      toast.error('Failed to upload document')
    }
    setUploading(false)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-success text-success-foreground',
      inactive: 'bg-muted text-muted-foreground',
      onboarding: 'border-chart-1 text-chart-1',
      offboarding: 'border-warning text-warning'
    }
    return <Badge className={variants[status] || ''}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-muted-foreground">
            {employee.employeeCode} - {employee.designation}
          </p>
        </div>
        {getStatusBadge(employee.status)}
      </div>

      <form action={handleSubmit}>
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Photo</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  {employee.profileImage && <AvatarImage src={employee.profileImage || "/placeholder.svg"} />}
                  <AvatarFallback className="text-2xl">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="profile" className="cursor-pointer">
                    <Button type="button" variant="outline" disabled={uploading} asChild>
                      <span>
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        Upload Photo
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="profile"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileUpload}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" defaultValue={employee.firstName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" defaultValue={employee.lastName} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={employee.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={employee.phone} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street">Street Address</Label>
                  <Input id="street" name="street" defaultValue={employee.address?.street} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" defaultValue={employee.address?.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" defaultValue={employee.address?.state} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" defaultValue={employee.address?.country} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input id="zipCode" name="zipCode" defaultValue={employee.address?.zipCode} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="emergencyName">Name</Label>
                  <Input id="emergencyName" name="emergencyName" defaultValue={employee.emergencyContact?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Phone</Label>
                  <Input id="emergencyPhone" name="emergencyPhone" defaultValue={employee.emergencyContact?.phone} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyRelationship">Relationship</Label>
                  <Input id="emergencyRelationship" name="emergencyRelationship" defaultValue={employee.emergencyContact?.relationship} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" name="designation" defaultValue={employee.designation} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select name="status" defaultValue={employee.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="offboarding">Offboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select name="departmentId" defaultValue={employee.departmentId} onValueChange={setSelectedDept}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept._id} value={dept._id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamId">Team</Label>
                  <Select name="teamId" defaultValue={employee.teamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTeams.map((team) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shiftId">Shift</Label>
                  <Select name="shiftId" defaultValue={employee.shiftId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts.map((shift) => (
                        <SelectItem key={shift._id} value={shift._id}>
                          {shift.name} ({shift.startTime} - {shift.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Salary Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salaryType">Salary Type</Label>
                  <Select name="salaryType" defaultValue={employee.salaryType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Monthly</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">Monthly Salary</Label>
                  <Input id="salary" name="salary" type="number" defaultValue={employee.salary} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (if applicable)</Label>
                  <Input id="hourlyRate" name="hourlyRate" type="number" defaultValue={employee.hourlyRate} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bank Details
                </CardTitle>
                <CardDescription>
                  Used for salary disbursement
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input id="bankName" name="bankName" defaultValue={employee.bankDetails?.bankName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input id="accountHolderName" name="accountHolderName" defaultValue={employee.bankDetails?.accountHolderName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" name="accountNumber" defaultValue={employee.bankDetails?.accountNumber} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input id="ifscCode" name="ifscCode" defaultValue={employee.bankDetails?.ifscCode} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage employee documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="document" className="cursor-pointer">
                    <Button type="button" variant="outline" disabled={uploading}>
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Upload Document
                    </Button>
                  </Label>
                  <Input
                    id="document"
                    type="file"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                </div>

                {employee.documents && employee.documents.length > 0 ? (
                  <div className="space-y-2">
                    {employee.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm">{doc.name}</span>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5" />
                  Assigned Assets
                </CardTitle>
                <CardDescription>Company assets assigned to this employee</CardDescription>
              </CardHeader>
              <CardContent>
                {assets.length > 0 ? (
                  <div className="space-y-2">
                    {assets.map((asset) => (
                      <div key={asset._id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.type} {asset.serialNumber && `- ${asset.serialNumber}`}
                          </p>
                        </div>
                        <Badge>{asset.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No assets assigned</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </Tabs>
      </form>
    </div>
  )
}
