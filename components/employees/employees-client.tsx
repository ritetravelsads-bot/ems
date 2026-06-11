'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, MoreHorizontal, Eye, UserPlus, UserMinus, UserCheck, Loader2, Users } from 'lucide-react'
import { createUser } from '@/app/actions/auth'
import { updateEmployeeStatus } from '@/app/actions/employees'
import { toast } from 'sonner'

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
  role?: string
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

interface EmployeesClientProps {
  employees: Employee[]
  departments: Department[]
  teams: Team[]
  userRole: string
}

export function EmployeesClient({ employees, departments, teams, userRole }: EmployeesClientProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [selectedDept, setSelectedDept] = useState<string>('')

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredTeams = selectedDept 
    ? teams.filter(t => t.departmentId === selectedDept)
    : teams

  async function handleCreateUser(formData: FormData) {
    setLoading(true)
    const result = await createUser(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Employee created with code: ${result.employeeCode}`)
      setShowAddDialog(false)
    }
    setLoading(false)
  }

  async function handleStatusChange(id: string, status: 'active' | 'inactive' | 'onboarding' | 'offboarding') {
    const result = await updateEmployeeStatus(id, status)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Status updated')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      active: { variant: 'default', className: 'bg-success text-success-foreground' },
      inactive: { variant: 'secondary', className: '' },
      onboarding: { variant: 'outline', className: 'border-chart-1 text-chart-1' },
      offboarding: { variant: 'outline', className: 'border-warning text-warning' }
    }
    const config = variants[status] || variants.inactive
    return <Badge variant={config.variant} className={config.className}>{status}</Badge>
  }

  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return '-'
    return departments.find(d => d._id === deptId)?.name || '-'
  }

  const getTeamName = (teamId?: string) => {
    if (!teamId) return '-'
    return teams.find(t => t._id === teamId)?.name || '-'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="offboarding">Offboarding</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Employee Table */}
      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No employees found</h3>
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first employee to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {employee.profileImage && <AvatarImage src={employee.profileImage || "/placeholder.svg"} />}
                        <AvatarFallback>
                          {employee.firstName[0]}{employee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{employee.employeeCode}</TableCell>
                  <TableCell>{getDepartmentName(employee.departmentId)}</TableCell>
                  <TableCell>{getTeamName(employee.teamId)}</TableCell>
                  <TableCell className="capitalize">{employee.role || 'employee'}</TableCell>
                  <TableCell>{getStatusBadge(employee.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/employees/${employee._id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        {employee.status === 'onboarding' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(employee._id, 'active')}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Complete Onboarding
                          </DropdownMenuItem>
                        )}
                        {employee.status === 'active' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(employee._id, 'offboarding')}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Start Offboarding
                          </DropdownMenuItem>
                        )}
                        {employee.status === 'offboarding' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(employee._id, 'inactive')}>
                            <UserMinus className="mr-2 h-4 w-4" />
                            Complete Offboarding
                          </DropdownMenuItem>
                        )}
                        {employee.status === 'inactive' && (
                          <DropdownMenuItem onClick={() => handleStatusChange(employee._id, 'active')}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Reactivate Employee
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account. They will receive login credentials.
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="john@company.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Create password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="employee">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  {userRole === 'admin' && <SelectItem value="hr">HR</SelectItem>}
                  {userRole === 'admin' && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <Select name="departmentId" onValueChange={setSelectedDept}>
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
              <Select name="teamId">
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
