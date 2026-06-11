import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getEmployees } from '@/app/actions/employees'
import { getDepartments, getTeams } from '@/app/actions/teams'
import { EmployeesClient } from '@/components/employees/employees-client'

export default async function EmployeesPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  if (!['admin', 'hr'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [employeesResult, departmentsResult, teamsResult] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getTeams()
  ])

  const employees = employeesResult.success ? employeesResult.data : []
  const departments = departmentsResult.success ? departmentsResult.data : []
  const teams = teamsResult.success ? teamsResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">
          Manage employee information and onboarding
        </p>
      </div>

      <EmployeesClient 
        employees={employees as never[]} 
        departments={departments as never[]}
        teams={teams as never[]}
        userRole={session.user.role}
      />
    </div>
  )
}
