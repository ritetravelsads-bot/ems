'use client'

import React from "react"

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  CreditCard, 
  Clock,
  Upload,
  Save,
  Lock
} from 'lucide-react'
import { getCurrentUser, changePassword } from '@/app/actions/auth'
import { getEmployee, updateEmployee, updateEmployeeProfileImage } from '@/app/actions/employees'
import { getTodayAttendance, getAttendanceStats } from '@/app/actions/attendance'
import { getLeaveBalance } from '@/app/actions/leaves'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: ''
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const { data: todayAttendance } = useSWR('todayAttendance', getTodayAttendance)
  const { data: attendanceStats } = useSWR('attendanceStats', getAttendanceStats)
  const { data: leaveBalance } = useSWR('leaveBalance', getLeaveBalance)

  useEffect(() => {
    async function loadProfile() {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        // Try to find employee record
        const employees = await import('@/app/actions/employees')
        const result = await employees.getEmployees({ search: currentUser.email })
        if (result.success && result.data.length > 0) {
          const emp = result.data[0]
          setEmployee(emp)
          setFormData({
            phone: emp.phone || '',
            street: emp.address?.street || '',
            city: emp.address?.city || '',
            state: emp.address?.state || '',
            country: emp.address?.country || '',
            zipCode: emp.address?.zipCode || '',
            emergencyName: emp.emergencyContact?.name || '',
            emergencyPhone: emp.emergencyContact?.phone || '',
            emergencyRelationship: emp.emergencyContact?.relationship || ''
          })
        }
      }
    }
    loadProfile()
  }, [])

  const handleSave = async () => {
    if (!employee) return
    setIsSaving(true)
    
    const form = new FormData()
    form.append('firstName', employee.firstName)
    form.append('lastName', employee.lastName)
    form.append('phone', formData.phone)
    form.append('designation', employee.designation)
    form.append('salaryType', employee.salaryType)
    form.append('salary', employee.salary?.toString() || '0')
    form.append('street', formData.street)
    form.append('city', formData.city)
    form.append('state', formData.state)
    form.append('country', formData.country)
    form.append('zipCode', formData.zipCode)
    form.append('emergencyName', formData.emergencyName)
    form.append('emergencyPhone', formData.emergencyPhone)
    form.append('emergencyRelationship', formData.emergencyRelationship)

    const result = await updateEmployee(employee._id, form)
    
    if (result.success) {
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully'
      })
      setIsEditing(false)
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }
    setIsSaving(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !employee) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (data.url) {
        await updateEmployeeProfileImage(employee._id, data.url)
        setEmployee({ ...employee, profileImage: data.url })
        toast({
          title: 'Image Uploaded',
          description: 'Profile image updated successfully'
        })
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image',
        variant: 'destructive'
      })
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all password fields',
        variant: 'destructive'
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Validation Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Validation Error',
        description: 'New password must be at least 6 characters',
        variant: 'destructive'
      })
      return
    }

    setIsChangingPassword(true)
    const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
    setIsChangingPassword(false)

    if (result.success) {
      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully'
      })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            View and manage your profile information
          </p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee?.profileImage || "/placeholder.svg"} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Upload className="h-4 w-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{employee?.designation || user.role}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{user.employeeCode}</Badge>
                <Badge className="capitalize">{user.role}</Badge>
                <Badge variant={employee?.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {employee?.status || 'Active'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold text-primary">{attendanceStats?.workingDays || 0}</p>
                <p className="text-sm text-muted-foreground">Days Present</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(attendanceStats?.totalHours || 0)}h</p>
                <p className="text-sm text-muted-foreground">Hours Worked</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{leaveBalance ? (leaveBalance.casual - leaveBalance.usedCasual) : 0}</p>
                <p className="text-sm text-muted-foreground">Leaves Left</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{attendanceStats?.late || 0}</p>
                <p className="text-sm text-muted-foreground">Late Days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic personal details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  {isEditing ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="font-medium">{employee?.phone || 'Not set'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Designation</p>
                  <p className="font-medium">{employee?.designation || user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joining Date</p>
                  <p className="font-medium">
                    {employee?.joiningDate 
                      ? new Date(employee.joiningDate).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{"Today's Status"}</p>
                  <Badge variant={todayAttendance?.checkIn ? 'default' : 'secondary'}>
                    {todayAttendance?.checkIn 
                      ? `Checked in at ${new Date(todayAttendance.checkIn.time).toLocaleTimeString()}`
                      : 'Not checked in'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Your residential address</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Street Address</Label>
                {isEditing ? (
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Enter street address"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.address?.street || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>City</Label>
                {isEditing ? (
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.address?.city || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>State</Label>
                {isEditing ? (
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.address?.state || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>Country</Label>
                {isEditing ? (
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Enter country"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.address?.country || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>ZIP Code</Label>
                {isEditing ? (
                  <Input
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.address?.zipCode || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Person to contact in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Contact Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    placeholder="Enter contact name"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.emergencyContact?.name || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>Contact Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="Enter contact phone"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.emergencyContact?.phone || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label>Relationship</Label>
                {isEditing ? (
                  <Input
                    value={formData.emergencyRelationship}
                    onChange={(e) => setFormData({ ...formData, emergencyRelationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent"
                  />
                ) : (
                  <p className="mt-1 font-medium">{employee?.emergencyContact?.relationship || 'Not set'}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Your bank account information for salary</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{employee?.bankDetails?.bankName || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p className="font-medium">
                    {employee?.bankDetails?.accountNumber 
                      ? `****${employee.bankDetails.accountNumber.slice(-4)}`
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IFSC Code</p>
                  <p className="font-medium">{employee?.bankDetails?.ifscCode || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Holder</p>
                  <p className="font-medium">{employee?.bankDetails?.accountHolderName || 'Not set'}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Contact HR to update your bank details
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                <Lock className="mr-2 h-4 w-4" />
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
