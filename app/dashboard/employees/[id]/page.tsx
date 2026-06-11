import { getSession, checkMongoConnection } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getEmployee } from '@/app/actions/employees'
import { getDepartments, getTeams } from '@/app/actions/teams'
import { getShifts } from '@/app/actions/shifts'
import { getAssetsByEmployee } from '@/app/actions/assets'
import { EmployeeDetailClient } from '@/components/employees/employee-detail-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Check if MongoDB is configured
  if (!checkMongoConnection()) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Database Not Connected
            </CardTitle>
            <CardDescription>
              Please add your MONGODB_URI to your environment variables to access employee data.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const { id } = await params
  
  try {
    const session = await getSession()
    if (!session) redirect('/login')
    
    if (!['admin', 'hr'].includes(session.user.role)) {
      redirect('/dashboard')
    }

    const [employee, departmentsResult, teamsResult, shifts, assets] = await Promise.all([
      getEmployee(id),
      getDepartments(),
      getTeams(),
      getShifts(),
      getAssetsByEmployee(id)
    ])

    if (!employee) {
      notFound()
    }

    // Extract data from results safely
    const departments = departmentsResult.success ? departmentsResult.data : []
    const teams = teamsResult.success ? teamsResult.data : []

    return (
      <EmployeeDetailClient
        employee={employee}
        departments={departments}
        teams={teams}
        shifts={shifts}
        assets={assets}
      />
    )
  } catch (error) {
    console.error('Error loading employee:', error)
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Loading Employee
            </CardTitle>
            <CardDescription>
              There was an error loading the employee data. Please check your database connection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}
