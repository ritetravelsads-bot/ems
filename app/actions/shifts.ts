'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Shift } from '@/lib/types'

interface ShiftInput {
  name: string
  type: Shift['type']
  startTime: string
  endTime: string
  breakDuration: number
  graceMinutes: number
  workingDays: number[]
  isActive?: boolean
}

export async function createShift(data: ShiftInput) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!data.name || !data.startTime || !data.endTime) {
    return { success: false, error: 'Name, start time, and end time are required' }
  }

  try {
    const shifts = await getCollection<Shift>('shifts')
    
    await shifts.insertOne({
      name: data.name,
      type: data.type || 'morning',
      startTime: data.startTime,
      endTime: data.endTime,
      breakDuration: data.breakDuration || 60,
      graceMinutes: data.graceMinutes || 15,
      workingDays: data.workingDays?.length > 0 ? data.workingDays : [1, 2, 3, 4, 5],
      isActive: data.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    revalidatePath('/dashboard/shifts')
    return { success: true }
  } catch (error) {
    console.error('Error creating shift:', error)
    return { success: false, error: 'Failed to create shift' }
  }
}

export async function updateShift(id: string, data: ShiftInput) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const shifts = await getCollection<Shift>('shifts')
    
    await shifts.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: data.name,
          type: data.type,
          startTime: data.startTime,
          endTime: data.endTime,
          breakDuration: data.breakDuration,
          graceMinutes: data.graceMinutes,
          workingDays: data.workingDays,
          isActive: data.isActive !== false,
          updatedAt: new Date()
        }
      }
    )

    revalidatePath('/dashboard/shifts')
    return { success: true }
  } catch (error) {
    console.error('Error updating shift:', error)
    return { success: false, error: 'Failed to update shift' }
  }
}

export async function deleteShift(id: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Check if shift is assigned to employees
    const employees = await getCollection('employees')
    const hasEmployees = await employees.findOne({ shiftId: new ObjectId(id) })
    if (hasEmployees) {
      return { success: false, error: 'Cannot delete shift assigned to employees' }
    }

    const shifts = await getCollection<Shift>('shifts')
    await shifts.deleteOne({ _id: new ObjectId(id) })

    revalidatePath('/dashboard/shifts')
    return { success: true }
  } catch (error) {
    console.error('Error deleting shift:', error)
    return { success: false, error: 'Failed to delete shift' }
  }
}

export async function getShifts() {
  if (!isMongoConfigured()) {
    return { success: true, data: [] }
  }

  try {
    const shifts = await getCollection<Shift>('shifts')
    const result = await shifts.find({}).sort({ name: 1 }).toArray()
    
    const data = result.map(s => ({
      ...s,
      _id: s._id?.toString()
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return { success: false, error: 'Failed to fetch shifts', data: [] }
  }
}

export async function assignShift(employeeId: string, shiftId: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const employees = await getCollection('employees')
    
    await employees.updateOne(
      { _id: new ObjectId(employeeId) },
      { $set: { shiftId: new ObjectId(shiftId), updatedAt: new Date() } }
    )

    revalidatePath('/dashboard/employees')
    return { success: true }
  } catch (error) {
    console.error('Error assigning shift:', error)
    return { success: false, error: 'Failed to assign shift' }
  }
}
