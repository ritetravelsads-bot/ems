'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Users, Trash2, Pencil, Loader2, Sparkles } from 'lucide-react'
import { createDepartment, createTeam, deleteDepartment, deleteTeam, seedDefaultTeams, updateDepartment, updateTeam } from '@/app/actions/teams'
import { toast } from 'sonner'

interface Department {
  _id: string
  name: string
  description?: string
}

interface Team {
  _id: string
  name: string
  departmentId: string
  description?: string
}

interface TeamsClientProps {
  departments: Department[]
  teams: Team[]
  userRole: string
}

export function TeamsClient({ departments, teams, userRole }: TeamsClientProps) {
  const [showDeptDialog, setShowDeptDialog] = useState(false)
  const [showTeamDialog, setShowTeamDialog] = useState(false)
  const [editDept, setEditDept] = useState<Department | null>(null)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleCreateDepartment(formData: FormData) {
    setLoading(true)
    const result = editDept 
      ? await updateDepartment(editDept._id, formData)
      : await createDepartment(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editDept ? 'Department updated' : 'Department created')
      setShowDeptDialog(false)
      setEditDept(null)
    }
    setLoading(false)
  }

  async function handleCreateTeam(formData: FormData) {
    setLoading(true)
    const result = editTeam
      ? await updateTeam(editTeam._id, formData)
      : await createTeam(formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editTeam ? 'Team updated' : 'Team created')
      setShowTeamDialog(false)
      setEditTeam(null)
    }
    setLoading(false)
  }

  async function handleDeleteDepartment(id: string) {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    const result = await deleteDepartment(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Department deleted')
    }
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm('Are you sure you want to delete this team?')) return
    
    const result = await deleteTeam(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Team deleted')
    }
  }

  async function handleSeedTeams() {
    setSeeding(true)
    const result = await seedDefaultTeams()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Default teams created')
    }
    setSeeding(false)
  }

  const getTeamsForDepartment = (deptId: string) => {
    return teams.filter(t => t.departmentId === deptId)
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {userRole === 'admin' && (
          <Button onClick={() => setShowDeptDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        )}
        <Button variant="outline" onClick={() => setShowTeamDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Team
        </Button>
        {userRole === 'admin' && departments.length === 0 && (
          <Button variant="secondary" onClick={handleSeedTeams} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Setup Default Teams
          </Button>
        )}
      </div>

      {/* Departments & Teams */}
      {departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No departments yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first department to organize teams
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-4" defaultValue={departments.map(d => d._id)}>
          {departments.map((dept) => (
            <AccordionItem key={dept._id} value={dept._id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{dept.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getTeamsForDepartment(dept._id).length} teams
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pb-4 space-y-4">
                  {dept.description && (
                    <p className="text-sm text-muted-foreground">{dept.description}</p>
                  )}
                  
                  {userRole === 'admin' && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditDept(dept)
                          setShowDeptDialog(true)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDepartment(dept._id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {getTeamsForDepartment(dept._id).map((team) => (
                      <Card key={team._id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{team.name}</CardTitle>
                            <Badge variant="secondary">
                              <Users className="mr-1 h-3 w-3" />
                              Team
                            </Badge>
                          </div>
                          {team.description && (
                            <CardDescription>{team.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditTeam(team)
                                setShowTeamDialog(true)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTeam(team._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {getTeamsForDepartment(dept._id).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No teams in this department yet
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={(open) => {
        setShowDeptDialog(open)
        if (!open) setEditDept(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDept ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editDept ? 'Update department details' : 'Create a new department for your organization'}
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreateDepartment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., IT, Sales, HR"
                defaultValue={editDept?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of the department"
                defaultValue={editDept?.description}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDeptDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editDept ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={(open) => {
        setShowTeamDialog(open)
        if (!open) setEditTeam(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTeam ? 'Edit Team' : 'Add Team'}</DialogTitle>
            <DialogDescription>
              {editTeam ? 'Update team details' : 'Create a new team within a department'}
            </DialogDescription>
          </DialogHeader>
          <form action={handleCreateTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                name="name"
                placeholder="e.g., Web Development, Sales"
                defaultValue={editTeam?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <Select name="departmentId" defaultValue={editTeam?.departmentId} required>
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
              <Label htmlFor="teamDescription">Description (Optional)</Label>
              <Textarea
                id="teamDescription"
                name="description"
                placeholder="Brief description of the team"
                defaultValue={editTeam?.description}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTeamDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editTeam ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
