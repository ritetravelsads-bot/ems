'use server'

import { redirect } from 'next/navigation'
import { getCollection, ObjectId } from '@/lib/mongodb'
import { hashPassword, verifyPassword, createSession, destroySession, getSession, generateEmployeeCode } from '@/lib/auth'
import type { User, Employee } from '@/lib/types'

export async function registerAdmin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const companyName = formData.get('companyName') as string

  if (!email || !password || !name) {
    return { error: 'All fields are required' }
  }

  const users = await getCollection<User>('users')
  
  // Check if any admin exists
  const existingAdmin = await users.findOne({ role: 'admin' })
  if (existingAdmin) {
    return { error: 'Admin already exists. Please login.' }
  }

  // Check if email exists
  const existingUser = await users.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    return { error: 'Email already registered' }
  }

  const hashedPassword = await hashPassword(password)
  const employeeCode = generateEmployeeCode('ADM', 0)

  const result = await users.insertOne({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role: 'admin',
    employeeCode,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Create settings collection with company name
  const settings = await getCollection('settings')
  await settings.updateOne(
    { key: 'company' },
    { $set: { key: 'company', name: companyName || 'Company', updatedAt: new Date() } },
    { upsert: true }
  )

  await createSession(result.insertedId)
  redirect('/dashboard')
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const latitude = formData.get('latitude') as string
  const longitude = formData.get('longitude') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const users = await getCollection<User>('users')
  const user = await users.findOne({ email: email.toLowerCase() })

  if (!user) {
    return { error: 'Invalid email or password' }
  }

  if (user.status !== 'active') {
    return { error: 'Your account is not active. Please contact admin.' }
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return { error: 'Invalid email or password' }
  }

  // Create attendance record for non-admin users
  if (user.role !== 'admin' && latitude && longitude) {
    const attendance = await getCollection('attendance')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingAttendance = await attendance.findOne({
      userId: user._id,
      date: today
    })

    if (!existingAttendance) {
      await attendance.insertOne({
        userId: user._id,
        date: today,
        checkIn: {
          time: new Date(),
          location: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
          }
        },
        status: 'present',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }

  await createSession(user._id!)
  redirect('/dashboard')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}

export async function createUser(formData: FormData) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as User['role']
  const teamId = formData.get('teamId') as string
  const departmentId = formData.get('departmentId') as string

  if (!email || !password || !name || !role) {
    return { error: 'All fields are required' }
  }

  // HR can only create employees
  if (session.user.role === 'hr' && role !== 'employee') {
    return { error: 'HR can only create employees' }
  }

  const users = await getCollection<User>('users')
  
  const existingUser = await users.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    return { error: 'Email already registered' }
  }

  const hashedPassword = await hashPassword(password)
  
  // Generate employee code based on role
  const prefix = role === 'admin' ? 'ADM' : role === 'hr' ? 'HR' : 'EMP'
  const count = await users.countDocuments({ role })
  const employeeCode = generateEmployeeCode(prefix, count)

  const result = await users.insertOne({
    email: email.toLowerCase(),
    password: hashedPassword,
    name,
    role,
    employeeCode,
    teamId: teamId ? new ObjectId(teamId) : undefined,
    departmentId: departmentId ? new ObjectId(departmentId) : undefined,
    status: 'onboarding',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Create employee record
  const employees = await getCollection<Employee>('employees')
  await employees.insertOne({
    userId: result.insertedId,
    employeeCode,
    firstName: name.split(' ')[0],
    lastName: name.split(' ').slice(1).join(' ') || '',
    email: email.toLowerCase(),
    phone: '',
    joiningDate: new Date(),
    designation: role === 'hr' ? 'HR Executive' : 'Employee',
    teamId: teamId ? new ObjectId(teamId) : undefined,
    departmentId: departmentId ? new ObjectId(departmentId) : undefined,
    salaryType: 'fixed',
    salary: 0,
    status: 'onboarding',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  // Create leave balance for new employee
  const leaveBalances = await getCollection('leaveBalances')
  await leaveBalances.insertOne({
    userId: result.insertedId,
    year: new Date().getFullYear(),
    sick: 12,
    casual: 12,
    earned: 15,
    maternity: 180,
    paternity: 15,
    usedSick: 0,
    usedCasual: 0,
    usedEarned: 0,
    usedMaternity: 0,
    usedPaternity: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return { success: true, employeeCode }
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session) return null
  
  const { password: _, ...user } = session.user
  return user
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getSession()
  if (!session) return { error: 'Not logged in' }

  if (!currentPassword || !newPassword) {
    return { error: 'Both current and new password are required' }
  }

  if (newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters' }
  }

  const users = await getCollection<User>('users')
  const user = await users.findOne({ _id: session.user._id })
  if (!user) return { error: 'User not found' }

  const isValid = await verifyPassword(currentPassword, user.password)
  if (!isValid) {
    return { error: 'Current password is incorrect' }
  }

  const hashedPassword = await hashPassword(newPassword)
  await users.updateOne(
    { _id: session.user._id },
    { $set: { password: hashedPassword, updatedAt: new Date() } }
  )

  return { success: true }
}

export async function checkoutUser() {
  const session = await getSession()
  if (!session) return { error: 'Not logged in' }
  
  if (session.user.role === 'admin') {
    return { success: true }
  }

  const attendance = await getCollection('attendance')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await attendance.updateOne(
    { userId: session.user._id, date: today },
    {
      $set: {
        'checkOut.time': new Date(),
        updatedAt: new Date()
      }
    }
  )

  if (result.modifiedCount === 0) {
    return { error: 'No check-in record found for today' }
  }

  // Calculate total hours
  const record = await attendance.findOne({ userId: session.user._id, date: today })
  if (record?.checkIn?.time && record?.checkOut?.time) {
    const hours = (new Date(record.checkOut.time).getTime() - new Date(record.checkIn.time).getTime()) / (1000 * 60 * 60)
    await attendance.updateOne(
      { _id: record._id },
      { $set: { totalHours: Math.round(hours * 100) / 100 } }
    )
  }

  return { success: true }
}
