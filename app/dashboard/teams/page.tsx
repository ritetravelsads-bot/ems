import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDepartments, getTeams } from '@/app/actions/teams'
import { TeamsClient } from '@/components/teams/teams-client'

export default async function TeamsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  
  if (!['admin', 'hr'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const [departmentsResult, teamsResult] = await Promise.all([
    getDepartments(),
    getTeams()
  ])

  const departments = departmentsResult.success ? departmentsResult.data : []
  const teams = teamsResult.success ? teamsResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage departments and teams in your organization
        </p>
      </div>

      <TeamsClient 
        departments={departments as never[]} 
        teams={teams as never[]} 
        userRole={session.user.role}
      />
    </div>
  )
}
