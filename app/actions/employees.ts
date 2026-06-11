'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Employee, User } from '@/lib/types'

export async function getEmployees(filters?: {
  teamId?: string
  departmentId?: string
  status?: string
  search?: string
}) {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'Database not configured', data: [] }
    }
    const employees = await getCollection<Employee>('employees')
    const users = await getCollection<User>('users')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {}
    
    if (filters?.teamId) {
      query.teamId = new ObjectId(filters.teamId)
    }
    if (filters?.departmentId) {
      query.departmentId = new ObjectId(filters.departmentId)
    }
    if (filters?.status) {
      query.status = filters.status
    }
    if (filters?.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { employeeCode: { $regex: filters.search, $options: 'i' } }
      ]
    }

    const result = await employees.find(query).sort({ createdAt: -1 }).toArray()
    
    // Get user roles
    const userIds = result.map(e => e.userId)
    const userList = await users.find({ _id: { $in: userIds } }).toArray()
    const userMap = new Map(userList.map(u => [u._id?.toString(), u]))

    return { 
      success: true, 
      data: result.map(e => ({
        ...e,
        _id: e._id?.toString(),
        userId: e.userId?.toString(),
        teamId: e.teamId?.toString(),
        departmentId: e.departmentId?.toString(),
        reportingTo: e.reportingTo?.toString(),
        shiftId: e.shiftId?.toString(),
        role: userMap.get(e.userId?.toString())?.role || 'employee'
      }))
    }
  } catch (error) {
    console.error('Error fetching employees:', error)
    return { success: false, error: 'Failed to fetch employees', data: [] }
  }
}

export async function getEmployee(id: string) {
  if (!isMongoConfigured()) {
    return null
  }
  const employees = await getCollection<Employee>('employees')
  const employee = await employees.findOne({ _id: new ObjectId(id) })
  
  if (!employee) return null

  return {
    ...employee,
    _id: employee._id?.toString(),
    userId: employee.userId?.toString(),
    teamId: employee.teamId?.toString(),
    departmentId: employee.departmentId?.toString(),
    reportingTo: employee.reportingTo?.toString(),
    shiftId: employee.shiftId?.toString()
  }
}

export async function updateEmployee(id: string, formData: FormData) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phone = formData.get('phone') as string
  const designation = formData.get('designation') as string
  const teamId = formData.get('teamId') as string
  const departmentId = formData.get('departmentId') as string
  const salaryType = formData.get('salaryType') as 'fixed' | 'hourly'
  const salary = formData.get('salary') as string
  const hourlyRate = formData.get('hourlyRate') as string
  const shiftId = formData.get('shiftId') as string
  const status = formData.get('status') as Employee['status']

  // Address fields
  const street = formData.get('street') as string
  const city = formData.get('city') as string
  const state = formData.get('state') as string
  const country = formData.get('country') as string
  const zipCode = formData.get('zipCode') as string

  // Bank details
  const bankName = formData.get('bankName') as string
  const accountNumber = formData.get('accountNumber') as string
  const ifscCode = formData.get('ifscCode') as string
  const accountHolderName = formData.get('accountHolderName') as string

  // Emergency contact
  const emergencyName = formData.get('emergencyName') as string
  const emergencyPhone = formData.get('emergencyPhone') as string
  const emergencyRelationship = formData.get('emergencyRelationship') as string

  const employees = await getCollection<Employee>('employees')
  
  const updateData: Partial<Employee> = {
    firstName,
    lastName,
    phone,
    designation,
    salaryType,
    salary: parseFloat(salary) || 0,
    hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
    updatedAt: new Date()
  }

  if (teamId) updateData.teamId = new ObjectId(teamId)
  if (departmentId) updateData.departmentId = new ObjectId(departmentId)
  if (shiftId) updateData.shiftId = new ObjectId(shiftId)
  if (status) updateData.status = status

  if (street || city || state || country || zipCode) {
    updateData.address = { street, city, state, country, zipCode }
  }

  if (bankName || accountNumber || ifscCode || accountHolderName) {
    updateData.bankDetails = { bankName, accountNumber, ifscCode, accountHolderName }
  }

  if (emergencyName || emergencyPhone || emergencyRelationship) {
    updateData.emergencyContact = {
      name: emergencyName,
      phone: emergencyPhone,
      relationship: emergencyRelationship
    }
  }

  await employees.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  )

  // Update user status if changed
  if (status) {
    const employee = await employees.findOne({ _id: new ObjectId(id) })
    if (employee) {
      const users = await getCollection<User>('users')
      await users.updateOne(
        { _id: employee.userId },
        { $set: { status, teamId: teamId ? new ObjectId(teamId) : undefined, departmentId: departmentId ? new ObjectId(departmentId) : undefined } }
      )
    }
  }

  revalidatePath('/dashboard/employees')
  revalidatePath(`/dashboard/employees/${id}`)
  return { success: true }
}

export async function updateEmployeeStatus(id: string, status: Employee['status']) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const employees = await getCollection<Employee>('employees')
  const employee = await employees.findOne({ _id: new ObjectId(id) })
  
  if (!employee) {
    return { error: 'Employee not found' }
  }

  await employees.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } }
  )

  const users = await getCollection<User>('users')
  await users.updateOne(
    { _id: employee.userId },
    { $set: { status } }
  )

  revalidatePath('/dashboard/employees')
  return { success: true }
}

export async function uploadEmployeeDocument(employeeId: string, name: string, url: string) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const employees = await getCollection<Employee>('employees')
  
  await employees.updateOne(
    { _id: new ObjectId(employeeId) },
    {
      $push: {
        documents: {
          name,
          url,
          uploadedAt: new Date()
        }
      } as never,
      $set: { updatedAt: new Date() }
    }
  )

  revalidatePath(`/dashboard/employees/${employeeId}`)
  return { success: true }
}

export async function updateEmployeeProfileImage(employeeId: string, url: string) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const employees = await getCollection<Employee>('employees')
  
  await employees.updateOne(
    { _id: new ObjectId(employeeId) },
    { $set: { profileImage: url, updatedAt: new Date() } }
  )

  revalidatePath(`/dashboard/employees/${employeeId}`)
  return { success: true }
}

export async function getEmployeeStats() {
  const employees = await getCollection<Employee>('employees')
  
  const total = await employees.countDocuments()
  const active = await employees.countDocuments({ status: 'active' })
  const onboarding = await employees.countDocuments({ status: 'onboarding' })
  const offboarding = await employees.countDocuments({ status: 'offboarding' })

  return { total, active, onboarding, offboarding }
}
