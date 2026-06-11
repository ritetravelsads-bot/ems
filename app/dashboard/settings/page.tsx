'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Settings, 
  Building2, 
  Users, 
  Clock, 
  DollarSign,
  Shield,
  Bell,
  Save,
  Plus,
  Trash2
} from 'lucide-react'
import { seedDefaultTeams } from '@/app/actions/teams'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [companySettings, setCompanySettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  })
  const [workSettings, setWorkSettings] = useState({
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    overtimeRate: 1.5,
    lateGracePeriod: 15
  })
  const [leaveSettings, setLeaveSettings] = useState({
    sickLeave: 12,
    casualLeave: 12,
    earnedLeave: 15,
    maternityLeave: 180,
    paternityLeave: 15
  })
  const [notifications, setNotifications] = useState({
    emailOnLeaveApply: true,
    emailOnLeaveApproval: true,
    emailOnSalaryProcessed: true,
    emailOnTaskAssigned: true
  })

  const handleSeedTeams = async () => {
    const result = await seedDefaultTeams()
    if (result.success) {
      toast({
        title: 'Teams Created',
        description: 'Default teams and departments have been created'
      })
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.company) {
            setCompanySettings(prev => ({ ...prev, ...data.company }))
          }
          if (data.work) {
            setWorkSettings(prev => ({ ...prev, ...data.work }))
          }
          if (data.leaves) {
            setLeaveSettings(prev => ({ ...prev, ...data.leaves }))
          }
          if (data.notifications) {
            setNotifications(prev => ({ ...prev, ...data.notifications }))
          }
        }
      } catch {
        // Settings not loaded, use defaults
      }
    }
    loadSettings()
  }, [])

  const saveSettings = async (type: string, data: Record<string, unknown>) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...data })
      })
      if (res.ok) {
        toast({
          title: 'Settings Saved',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} settings have been updated`
        })
      } else {
        throw new Error('Failed')
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      })
    }
    setIsSaving(false)
  }

  const handleSaveCompany = () => saveSettings('company', companySettings)
  const handleSaveWork = () => saveSettings('work', workSettings)
  const handleSaveLeaves = () => saveSettings('leaves', leaveSettings)
  const handleSavePayroll = () => saveSettings('payroll', {})
  const handleSaveNotifications = () => saveSettings('notifications', notifications)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="company">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="company">
            <Building2 className="mr-2 h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="work">
            <Clock className="mr-2 h-4 w-4" />
            Work Hours
          </TabsTrigger>
          <TabsTrigger value="leaves">
            <Users className="mr-2 h-4 w-4" />
            Leaves
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <DollarSign className="mr-2 h-4 w-4" />
            Payroll
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companySettings.name}
                  onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  placeholder="Enter company address"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={companySettings.website}
                  onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleSaveCompany} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Setup</CardTitle>
              <CardDescription>Initialize default teams and departments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Create Default Teams</p>
                  <p className="text-sm text-muted-foreground">
                    Creates IT (Web Dev, Graphic Design, SEO, Digital Marketing), Real Estate (Sales, Pre-Sales), and HR departments
                  </p>
                </div>
                <Button onClick={handleSeedTeams}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Teams
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Work Hour Settings</CardTitle>
              <CardDescription>Configure working hours and overtime settings</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="workDays">Working Days per Week</Label>
                <Input
                  id="workDays"
                  type="number"
                  min={1}
                  max={7}
                  value={workSettings.workingDaysPerWeek}
                  onChange={(e) => setWorkSettings({ ...workSettings, workingDaysPerWeek: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div>
                <Label htmlFor="workHours">Working Hours per Day</Label>
                <Input
                  id="workHours"
                  type="number"
                  min={1}
                  max={24}
                  value={workSettings.workingHoursPerDay}
                  onChange={(e) => setWorkSettings({ ...workSettings, workingHoursPerDay: parseInt(e.target.value) || 8 })}
                />
              </div>
              <div>
                <Label htmlFor="overtime">Overtime Rate Multiplier</Label>
                <Input
                  id="overtime"
                  type="number"
                  step={0.1}
                  min={1}
                  value={workSettings.overtimeRate}
                  onChange={(e) => setWorkSettings({ ...workSettings, overtimeRate: parseFloat(e.target.value) || 1.5 })}
                />
              </div>
              <div>
                <Label htmlFor="grace">Late Grace Period (minutes)</Label>
                <Input
                  id="grace"
                  type="number"
                  min={0}
                  value={workSettings.lateGracePeriod}
                  onChange={(e) => setWorkSettings({ ...workSettings, lateGracePeriod: parseInt(e.target.value) || 15 })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleSaveWork} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Work Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaves" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Allocation</CardTitle>
              <CardDescription>Set default leave allocation per year</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label htmlFor="sick">Sick Leave (days)</Label>
                <Input
                  id="sick"
                  type="number"
                  min={0}
                  value={leaveSettings.sickLeave}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, sickLeave: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="casual">Casual Leave (days)</Label>
                <Input
                  id="casual"
                  type="number"
                  min={0}
                  value={leaveSettings.casualLeave}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, casualLeave: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="earned">Earned Leave (days)</Label>
                <Input
                  id="earned"
                  type="number"
                  min={0}
                  value={leaveSettings.earnedLeave}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, earnedLeave: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="maternity">Maternity Leave (days)</Label>
                <Input
                  id="maternity"
                  type="number"
                  min={0}
                  value={leaveSettings.maternityLeave}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, maternityLeave: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="paternity">Paternity Leave (days)</Label>
                <Input
                  id="paternity"
                  type="number"
                  min={0}
                  value={leaveSettings.paternityLeave}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, paternityLeave: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Button onClick={handleSaveLeaves} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Leave Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Configuration</CardTitle>
              <CardDescription>Configure salary deductions and allowances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-4 font-medium">Standard Deductions</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Provident Fund (PF)</p>
                      <p className="text-sm text-muted-foreground">12% of basic salary</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Professional Tax</p>
                      <p className="text-sm text-muted-foreground">Rs. 200/month if salary greater than 15000</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">ESI</p>
                      <p className="text-sm text-muted-foreground">0.75% of gross salary</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">TDS</p>
                      <p className="text-sm text-muted-foreground">As per income slab</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
              <Button onClick={handleSavePayroll} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Payroll Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Configure email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Leave Application</p>
                  <p className="text-sm text-muted-foreground">Notify when an employee applies for leave</p>
                </div>
                <Switch
                  checked={notifications.emailOnLeaveApply}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnLeaveApply: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Leave Approval</p>
                  <p className="text-sm text-muted-foreground">Notify employee when leave is approved/rejected</p>
                </div>
                <Switch
                  checked={notifications.emailOnLeaveApproval}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnLeaveApproval: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Salary Processed</p>
                  <p className="text-sm text-muted-foreground">Notify when salary is processed</p>
                </div>
                <Switch
                  checked={notifications.emailOnSalaryProcessed}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnSalaryProcessed: checked })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Task Assignment</p>
                  <p className="text-sm text-muted-foreground">Notify when a task is assigned</p>
                </div>
                <Switch
                  checked={notifications.emailOnTaskAssigned}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, emailOnTaskAssigned: checked })}
                />
              </div>
              <Button onClick={handleSaveNotifications} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
