'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Team, Department } from '@/lib/types'

export async function getDepartments() {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'Database not configured', data: [] }
    }
    const departments = await getCollection<Department>('departments')
    const result = await departments.find({}).sort({ name: 1 }).toArray()
    return { success: true, data: result.map(d => ({ ...d, _id: d._id?.toString() })) }
  } catch (error) {
    console.error('Error fetching departments:', error)
    return { success: false, error: 'Failed to fetch departments', data: [] }
  }
}

export async function getTeams(departmentId?: string) {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'Database not configured', data: [] }
    }
    const teams = await getCollection<Team>('teams')
    const query = departmentId ? { departmentId: new ObjectId(departmentId) } : {}
    const result = await teams.find(query).sort({ name: 1 }).toArray()
    return { success: true, data: result.map(t => ({ ...t, _id: t._id?.toString(), departmentId: t.departmentId?.toString() })) }
  } catch (error) {
    console.error('Error fetching teams:', error)
    return { success: false, error: 'Failed to fetch teams', data: [] }
  }
}

export async function createDepartment(formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) {
    return { error: 'Department name is required' }
  }

  const departments = await getCollection<Department>('departments')
  
  const existing = await departments.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } })
  if (existing) {
    return { error: 'Department already exists' }
  }

  await departments.insertOne({
    name,
    description,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function createTeam(formData: FormData) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const departmentId = formData.get('departmentId') as string
  const description = formData.get('description') as string
  const leadId = formData.get('leadId') as string

  if (!name || !departmentId) {
    return { error: 'Team name and department are required' }
  }

  const teams = await getCollection<Team>('teams')
  
  const existing = await teams.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    departmentId: new ObjectId(departmentId)
  })
  if (existing) {
    return { error: 'Team already exists in this department' }
  }

  await teams.insertOne({
    name,
    departmentId: new ObjectId(departmentId),
    description,
    leadId: leadId ? new ObjectId(leadId) : undefined,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function updateDepartment(id: string, formData: FormData) {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) {
    return { error: 'Department name is required' }
  }

  const departments = await getCollection<Department>('departments')
  
  await departments.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        name, 
        description,
        updatedAt: new Date()
      } 
    }
  )

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function updateTeam(id: string, formData: FormData) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const leadId = formData.get('leadId') as string

  if (!name) {
    return { error: 'Team name is required' }
  }

  const teams = await getCollection<Team>('teams')
  
  await teams.updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        name, 
        description,
        leadId: leadId ? new ObjectId(leadId) : undefined,
        updatedAt: new Date()
      } 
    }
  )

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function deleteDepartment(id: string) {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  // Check if department has teams
  const teams = await getCollection<Team>('teams')
  const hasTeams = await teams.findOne({ departmentId: new ObjectId(id) })
  if (hasTeams) {
    return { error: 'Cannot delete department with existing teams' }
  }

  const departments = await getCollection<Department>('departments')
  await departments.deleteOne({ _id: new ObjectId(id) })

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function deleteTeam(id: string) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  // Check if team has members
  const users = await getCollection('users')
  const hasMembers = await users.findOne({ teamId: new ObjectId(id) })
  if (hasMembers) {
    return { error: 'Cannot delete team with existing members' }
  }

  const teams = await getCollection<Team>('teams')
  await teams.deleteOne({ _id: new ObjectId(id) })

  revalidatePath('/dashboard/teams')
  return { success: true }
}

export async function seedDefaultTeams() {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return { error: 'Unauthorized' }
  }

  const departments = await getCollection<Department>('departments')
  const teams = await getCollection<Team>('teams')

  // Check if already seeded
  const existingDepts = await departments.countDocuments()
  if (existingDepts > 0) {
    return { error: 'Teams already exist' }
  }

  // Create IT Department
  const itDept = await departments.insertOne({
    name: 'IT',
    description: 'Information Technology Department',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Create Real Estate Department
  const reDept = await departments.insertOne({
    name: 'Real Estate',
    description: 'Real Estate Division',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Create HR Department
  const hrDept = await departments.insertOne({
    name: 'Human Resources',
    description: 'HR Department',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // IT Teams
  const itTeams = ['Web Development', 'Graphic Design', 'SEO', 'Digital Marketing']
  for (const name of itTeams) {
    await teams.insertOne({
      name,
      departmentId: itDept.insertedId,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  // Real Estate Teams
  const reTeams = ['Sales', 'Pre-Sales']
  for (const name of reTeams) {
    await teams.insertOne({
      name,
      departmentId: reDept.insertedId,
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  // HR Team
  await teams.insertOne({
    name: 'HR Operations',
    departmentId: hrDept.insertedId,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  revalidatePath('/dashboard/teams')
  return { success: true }
}
