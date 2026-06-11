'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Leave, LeaveBalance } from '@/lib/types'

export async function applyLeave(formData: FormData) {
  if (!isMongoConfigured()) return { error: 'Database not configured' }

  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const leaveType = formData.get('leaveType') as Leave['leaveType']
  const startDate = new Date(formData.get('startDate') as string)
  const endDate = new Date(formData.get('endDate') as string)
  const reason = formData.get('reason') as string

  if (!leaveType || !startDate || !endDate || !reason) {
    return { error: 'All fields are required' }
  }

  // Calculate days
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Check leave balance
  const leaveBalances = await getCollection<LeaveBalance>('leaveBalances')
  const balance = await leaveBalances.findOne({
    userId: session.user._id,
    year: new Date().getFullYear()
  })

  if (!balance) {
    return { error: 'Leave balance not found' }
  }

  const available = {
    sick: balance.sick - balance.usedSick,
    casual: balance.casual - balance.usedCasual,
    earned: balance.earned - balance.usedEarned,
    maternity: balance.maternity - balance.usedMaternity,
    paternity: balance.paternity - balance.usedPaternity,
    unpaid: Infinity
  }

  if (leaveType !== 'unpaid' && available[leaveType] < days) {
    return { error: `Insufficient ${leaveType} leave balance. Available: ${available[leaveType]} days` }
  }

  const leaves = await getCollection<Leave>('leaves')
  
  await leaves.insertOne({
    userId: session.user._id!,
    leaveType,
    startDate,
    endDate,
    days,
    reason,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  })

  revalidatePath('/dashboard/leaves')
  return { success: true }
}

export async function approveLeave(id: string) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const leaves = await getCollection<Leave>('leaves')
  const leave = await leaves.findOne({ _id: new ObjectId(id) })

  if (!leave) {
    return { error: 'Leave request not found' }
  }

  if (leave.status !== 'pending') {
    return { error: 'Leave request already processed' }
  }

  // Update leave balance
  if (leave.leaveType !== 'unpaid') {
    const leaveBalances = await getCollection<LeaveBalance>('leaveBalances')
    const fieldMap = {
      sick: 'usedSick',
      casual: 'usedCasual',
      earned: 'usedEarned',
      maternity: 'usedMaternity',
      paternity: 'usedPaternity'
    }
    
    await leaveBalances.updateOne(
      { userId: leave.userId, year: new Date().getFullYear() },
      { $inc: { [fieldMap[leave.leaveType]]: leave.days } as never }
    )
  }

  // Mark attendance as on-leave
  const attendance = await getCollection('attendance')
  const currentDate = new Date(leave.startDate)
  while (currentDate <= leave.endDate) {
    const dateOnly = new Date(currentDate)
    dateOnly.setHours(0, 0, 0, 0)
    
    await attendance.updateOne(
      { userId: leave.userId, date: dateOnly },
      {
        $set: {
          status: 'on-leave',
          notes: `${leave.leaveType} leave`,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: leave.userId,
          date: dateOnly,
          createdAt: new Date()
        }
      },
      { upsert: true }
    )
    currentDate.setDate(currentDate.getDate() + 1)
  }

  await leaves.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'approved',
        approvedBy: session.user._id,
        approvedAt: new Date(),
        updatedAt: new Date()
      }
    }
  )

  revalidatePath('/dashboard/leaves')
  return { success: true }
}

export async function rejectLeave(id: string, reason: string) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const leaves = await getCollection<Leave>('leaves')
  
  await leaves.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'rejected',
        approvedBy: session.user._id,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date()
      }
    }
  )

  revalidatePath('/dashboard/leaves')
  return { success: true }
}

export async function getLeaves(status?: Leave['status']) {
  const session = await getSession()
  if (!session) return []

  const leaves = await getCollection<Leave>('leaves')
  const employees = await getCollection('employees')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = {}
  
  if (['admin', 'hr'].includes(session.user.role)) {
    if (status) query.status = status
  } else {
    query.userId = session.user._id
    if (status) query.status = status
  }

  const result = await leaves.find(query).sort({ createdAt: -1 }).toArray()
  const employeeList = await employees.find({}).toArray()
  const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

  return result.map(l => ({
    ...l,
    _id: l._id?.toString(),
    userId: l.userId?.toString(),
    approvedBy: l.approvedBy?.toString(),
    employee: employeeMap.get(l.userId?.toString())
  }))
}

export async function getLeaveBalance() {
  const session = await getSession()
  if (!session) return null

  const leaveBalances = await getCollection<LeaveBalance>('leaveBalances')
  const balance = await leaveBalances.findOne({
    userId: session.user._id,
    year: new Date().getFullYear()
  })

  if (!balance) return null

  return {
    ...balance,
    _id: balance._id?.toString(),
    userId: balance.userId?.toString()
  }
}

export async function updateLeaveBalance(userId: string, leaveType: string, amount: number) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const leaveBalances = await getCollection<LeaveBalance>('leaveBalances')
  
  await leaveBalances.updateOne(
    { userId: new ObjectId(userId), year: new Date().getFullYear() },
    { $set: { [leaveType]: amount, updatedAt: new Date() } }
  )

  revalidatePath('/dashboard/leaves')
  return { success: true }
}

export interface LeaveRequest {
  _id?: string
  employeeName: string
  employeeCode: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: string
}

export async function getLeaveRequests(status?: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured', data: [] }
  }

  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized', data: [] }
  }

  try {
    const leaves = await getCollection<Leave>('leaves')
    const employees = await getCollection('employees')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = {}

    if (['admin', 'hr'].includes(session.user.role)) {
      if (status && status !== 'all') query.status = status
    } else {
      query.userId = session.user._id
      if (status && status !== 'all') query.status = status
    }

    const result = await leaves.find(query).sort({ createdAt: -1 }).toArray()
    const employeeList = await employees.find({}).toArray()
    const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

    const data: LeaveRequest[] = result.map(l => {
      const emp = employeeMap.get(l.userId?.toString())
      return {
        _id: l._id?.toString(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || 'N/A',
        leaveType: l.leaveType,
        startDate: l.startDate?.toISOString().split('T')[0] || '',
        endDate: l.endDate?.toISOString().split('T')[0] || '',
        days: l.days || 1,
        reason: l.reason,
        status: l.status || 'pending'
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching leave requests:', error)
    return { success: false, error: 'Failed to fetch leave requests', data: [] }
  }
}

export async function createLeaveRequest(data: {
  leaveType: string
  startDate: string
  endDate: string
  reason?: string
}) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const { leaveType, startDate, endDate, reason } = data

  if (!leaveType || !startDate || !endDate) {
    return { success: false, error: 'All fields are required' }
  }

  try {
    const leaves = await getCollection<Leave>('leaves')

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    await leaves.insertOne({
      userId: session.user._id!,
      leaveType: leaveType as Leave['leaveType'],
      startDate: start,
      endDate: end,
      days,
      reason: reason || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    revalidatePath('/dashboard/leaves')
    return { success: true }
  } catch (error) {
    console.error('Error creating leave request:', error)
    return { success: false, error: 'Failed to create leave request' }
  }
}

export async function updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const leaves = await getCollection<Leave>('leaves')
    
    await leaves.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          approvedBy: session.user._id,
          approvedAt: new Date(),
          updatedAt: new Date()
        }
      }
    )

    revalidatePath('/dashboard/leaves')
    return { success: true }
  } catch (error) {
    console.error('Error updating leave status:', error)
    return { success: false, error: 'Failed to update leave status' }
  }
}
