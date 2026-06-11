import { getSession } from '@/lib/auth'
import { getEmployeeStats } from '@/app/actions/employees'
import { getAttendanceStats, getAllAttendance } from '@/app/actions/attendance'
import { getLeaves } from '@/app/actions/leaves'
import { getTasksByStatus } from '@/app/actions/tasks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, UserCheck, UserPlus, UserMinus, Clock, CalendarDays, ListTodo, CheckCircle } from 'lucide-react'
import { DashboardCharts } from '@/components/dashboard/charts'
import { RecentActivity } from '@/components/dashboard/recent-activity'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) return null

  const isAdminOrHr = ['admin', 'hr'].includes(session.user.role)
  
  const [employeeStats, attendanceStats, pendingLeaves, tasks] = await Promise.all([
    isAdminOrHr ? getEmployeeStats() : null,
    getAttendanceStats(),
    getLeaves('pending'),
    getTasksByStatus()
  ])

  const todayAttendance = isAdminOrHr ? await getAllAttendance() : []

  const myTasks = {
    todo: tasks.todo.length,
    inProgress: tasks['in-progress'].length,
    review: tasks.review.length,
    done: tasks.done.length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stats Cards */}
      {isAdminOrHr && employeeStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {employeeStats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayAttendance.length}</div>
              <p className="text-xs text-muted-foreground">
                Out of {employeeStats.active} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Onboarding</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeStats.onboarding}</div>
              <p className="text-xs text-muted-foreground">
                New employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Offboarding</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employeeStats.offboarding}</div>
              <p className="text-xs text-muted-foreground">
                Exiting employees
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Personal Stats for Employees */}
      {!isAdminOrHr && attendanceStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Days Present</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats.present}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hours Worked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats.totalHours}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Leave Days</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats.onLeave}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tasks Done</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myTasks.done}</div>
              <p className="text-xs text-muted-foreground">
                {myTasks.todo + myTasks.inProgress + myTasks.review} pending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">To Do</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.todo}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/20">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Review</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.review}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">Done</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myTasks.done}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              {isAdminOrHr ? 'Employee activity this month' : 'Your activity this month'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardCharts attendanceStats={attendanceStats} tasks={myTasks} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>
              {pendingLeaves.length} leave requests pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity 
              leaves={pendingLeaves.slice(0, 5)} 
              isAdminOrHr={isAdminOrHr} 
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
