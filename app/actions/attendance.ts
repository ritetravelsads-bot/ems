'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Attendance } from '@/lib/types'

export async function checkIn(latitude: number, longitude: number, photo?: string) {
  if (!isMongoConfigured()) {
    return { error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const attendance = await getCollection<Attendance>('attendance')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingAttendance = await attendance.findOne({
    userId: session.user._id,
    date: today
  })

  if (existingAttendance?.checkIn) {
    return { error: 'Already checked in today' }
  }

  if (existingAttendance) {
    await attendance.updateOne(
      { _id: existingAttendance._id },
      {
        $set: {
          checkIn: {
            time: new Date(),
            location: { latitude, longitude },
            photo
          },
          status: 'present',
          updatedAt: new Date()
        }
      }
    )
  } else {
    await attendance.insertOne({
      userId: session.user._id!,
      date: today,
      checkIn: {
        time: new Date(),
        location: { latitude, longitude },
        photo
      },
      status: 'present',
      createdAt: new Date(),
      updatedAt: new Date()
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function checkOut(latitude: number, longitude: number, photo?: string) {
  if (!isMongoConfigured()) {
    return { error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const attendance = await getCollection<Attendance>('attendance')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existingAttendance = await attendance.findOne({
    userId: session.user._id,
    date: today
  })

  if (!existingAttendance?.checkIn) {
    return { error: 'No check-in record found for today' }
  }

  if (existingAttendance.checkOut) {
    return { error: 'Already checked out today' }
  }

  const checkOutTime = new Date()
  const totalHours = (checkOutTime.getTime() - new Date(existingAttendance.checkIn.time).getTime()) / (1000 * 60 * 60)

  await attendance.updateOne(
    { _id: existingAttendance._id },
    {
      $set: {
        checkOut: {
          time: checkOutTime,
          location: { latitude, longitude },
          photo
        },
        totalHours: Math.round(totalHours * 100) / 100,
        updatedAt: new Date()
      }
    }
  )

  revalidatePath('/dashboard')
  return { success: true, totalHours: Math.round(totalHours * 100) / 100 }
}

export async function getTodayAttendance() {
  if (!isMongoConfigured()) {
    return null
  }

  const session = await getSession()
  if (!session) return null
  
  const attendance = await getCollection<Attendance>('attendance')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const record = await attendance.findOne({
    userId: session.user._id,
    date: today
  })

  if (!record) return null

  return {
    ...record,
    _id: record._id?.toString(),
    userId: record.userId?.toString()
  }
}

export async function getAttendanceHistory(userId?: string, startDate?: Date, endDate?: Date) {
  const session = await getSession()
  if (!session) return []

  const targetUserId = userId && ['admin', 'hr'].includes(session.user.role) 
    ? new ObjectId(userId) 
    : session.user._id

  const attendance = await getCollection<Attendance>('attendance')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { userId: targetUserId }
  
  if (startDate || endDate) {
    query.date = {}
    if (startDate) query.date.$gte = startDate
    if (endDate) query.date.$lte = endDate
  }

  const records = await attendance.find(query).sort({ date: -1 }).limit(30).toArray()

  return records.map(r => ({
    ...r,
    _id: r._id?.toString(),
    userId: r.userId?.toString()
  }))
}

export async function getAllAttendance(date?: Date) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return []
  }

  const attendance = await getCollection<Attendance>('attendance')
  const employees = await getCollection('employees')
  
  const targetDate = date || new Date()
  targetDate.setHours(0, 0, 0, 0)

  const records = await attendance.find({ date: targetDate }).toArray()
  const employeeList = await employees.find({}).toArray()
  const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

  return records.map(r => ({
    ...r,
    _id: r._id?.toString(),
    userId: r.userId?.toString(),
    employee: employeeMap.get(r.userId?.toString())
  }))
}

export async function getAttendanceStats(month?: number, year?: number) {
  const session = await getSession()
  if (!session) return null

  const targetMonth = month ?? new Date().getMonth()
  const targetYear = year ?? new Date().getFullYear()

  const startDate = new Date(targetYear, targetMonth, 1)
  const endDate = new Date(targetYear, targetMonth + 1, 0)

  const attendance = await getCollection<Attendance>('attendance')
  
  const records = await attendance.find({
    userId: session.user._id,
    date: { $gte: startDate, $lte: endDate }
  }).toArray()

  const present = records.filter(r => r.status === 'present').length
  const absent = records.filter(r => r.status === 'absent').length
  const late = records.filter(r => r.status === 'late').length
  const halfDay = records.filter(r => r.status === 'half-day').length
  const onLeave = records.filter(r => r.status === 'on-leave').length
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0)

  return {
    present,
    absent,
    late,
    halfDay,
    onLeave,
    totalHours: Math.round(totalHours * 100) / 100,
    workingDays: present + late + halfDay
  }
}

export async function updateAttendanceStatus(id: string, status: Attendance['status'], notes?: string) {
  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const attendance = await getCollection<Attendance>('attendance')
  
  await attendance.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, notes, updatedAt: new Date() } }
  )

  revalidatePath('/dashboard/attendance')
  return { success: true }
}

export interface AttendanceRecord {
  _id?: string
  date: string
  employeeName: string
  employeeCode: string
  checkIn?: string
  checkOut?: string
  status: string
  checkInLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
  checkOutLocation?: {
    latitude: number
    longitude: number
    address?: string
  }
  checkInPhoto?: string
  checkOutPhoto?: string
}

export async function getAttendanceRecords(startDate?: string, endDate?: string) {
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized', data: [] }
  }

  try {
    const attendance = await getCollection<Attendance>('attendance')
    const employees = await getCollection('employees')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {}
    
    // Non-admin/hr users only see their own records
    if (!['admin', 'hr'].includes(session.user.role)) {
      query.userId = session.user._id
    }

    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }

    const records = await attendance.find(query).sort({ date: -1 }).limit(100).toArray()
    const employeeList = await employees.find({}).toArray()
    const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

    const data: AttendanceRecord[] = records.map(r => {
      const emp = employeeMap.get(r.userId?.toString())
      return {
        _id: r._id?.toString(),
        date: r.date?.toISOString().split('T')[0] || '',
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || 'N/A',
        checkIn: r.checkIn?.time ? new Date(r.checkIn.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
        checkOut: r.checkOut?.time ? new Date(r.checkOut.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
        status: r.status || 'present',
        checkInLocation: r.checkIn?.location,
        checkOutLocation: r.checkOut?.location,
        checkInPhoto: r.checkIn?.photo,
        checkOutPhoto: r.checkOut?.photo
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    return { success: false, error: 'Failed to fetch attendance records', data: [] }
  }
}
