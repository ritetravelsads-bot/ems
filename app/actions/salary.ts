'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Salary, Employee, Attendance, Leave } from '@/lib/types'

export async function calculateSalary(userId: string, month: number, year: number) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const employees = await getCollection<Employee>('employees')
  const attendance = await getCollection<Attendance>('attendance')
  const leaves = await getCollection<Leave>('leaves')
  const salaries = await getCollection<Salary>('salaries')

  const employee = await employees.findOne({ userId: new ObjectId(userId) })
  if (!employee) {
    return { error: 'Employee not found' }
  }

  // Check if salary already exists
  const existingSalary = await salaries.findOne({
    userId: new ObjectId(userId),
    month,
    year
  })
  if (existingSalary && existingSalary.status === 'paid') {
    return { error: 'Salary already paid for this month' }
  }

  // Get attendance for the month
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  const attendanceRecords = await attendance.find({
    userId: new ObjectId(userId),
    date: { $gte: startDate, $lte: endDate }
  }).toArray()

  // Get approved unpaid leaves
  const unpaidLeaves = await leaves.find({
    userId: new ObjectId(userId),
    leaveType: 'unpaid',
    status: 'approved',
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  }).toArray()

  // Calculate working days and hours
  const workingDays = attendanceRecords.filter(a => 
    ['present', 'late'].includes(a.status)
  ).length
  const totalHours = attendanceRecords.reduce((sum, a) => sum + (a.totalHours || 0), 0)
  
  // Calculate unpaid leave days
  let unpaidLeaveDays = 0
  for (const leave of unpaidLeaves) {
    const leaveStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()))
    const leaveEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()))
    unpaidLeaveDays += Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  // Calculate salary based on type
  let basicSalary = 0
  let grossSalary = 0

  if (employee.salaryType === 'fixed') {
    basicSalary = employee.salary || 0
    // Deduct for unpaid leaves (assuming 30 days month)
    const perDaySalary = basicSalary / 30
    const leaveDeductionAmount = perDaySalary * unpaidLeaveDays
    grossSalary = basicSalary - leaveDeductionAmount
  } else {
    // Hourly calculation
    const hourlyRate = employee.hourlyRate || 0
    basicSalary = totalHours * hourlyRate
    grossSalary = basicSalary
  }

  // Standard deductions (can be customized)
  const deductions = [
    { name: 'PF (12%)', amount: grossSalary * 0.12 },
    { name: 'Professional Tax', amount: grossSalary > 15000 ? 200 : 0 }
  ]

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const netSalary = grossSalary - totalDeductions

  const salaryData: Partial<Salary> = {
    userId: new ObjectId(userId),
    month,
    year,
    basicSalary,
    hourlyRate: employee.hourlyRate,
    hoursWorked: totalHours,
    deductions,
    grossSalary,
    netSalary,
    leavesDeducted: unpaidLeaveDays,
    leaveDeductionAmount: employee.salaryType === 'fixed' ? (employee.salary / 30) * unpaidLeaveDays : 0,
    status: 'draft',
    updatedAt: new Date()
  }

  if (existingSalary) {
    await salaries.updateOne(
      { _id: existingSalary._id },
      { $set: salaryData }
    )
  } else {
    await salaries.insertOne({
      ...salaryData,
      createdAt: new Date()
    } as Salary)
  }

  revalidatePath('/dashboard/salary')
  return { 
    success: true, 
    salary: {
      basicSalary,
      grossSalary,
      netSalary,
      deductions,
      hoursWorked: totalHours,
      leavesDeducted: unpaidLeaveDays
    }
  }
}

export async function processSalary(id: string) {
  if (!isMongoConfigured()) return { error: 'Database not configured' }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const salaries = await getCollection<Salary>('salaries')
  
  await salaries.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'processed', updatedAt: new Date() } }
  )

  revalidatePath('/dashboard/salary')
  return { success: true }
}

export async function markSalaryPaid(id: string) {
  if (!isMongoConfigured()) return { error: 'Database not configured' }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { error: 'Unauthorized' }
  }

  const salaries = await getCollection<Salary>('salaries')
  
  await salaries.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'paid', paidAt: new Date(), updatedAt: new Date() } }
  )

  revalidatePath('/dashboard/salary')
  return { success: true }
}

export async function getSalaries(month?: number, year?: number) {
  if (!isMongoConfigured()) return []

  const session = await getSession()
  if (!session) return []

  const salaries = await getCollection<Salary>('salaries')
  const employees = await getCollection<Employee>('employees')

  const targetMonth = month ?? new Date().getMonth()
  const targetYear = year ?? new Date().getFullYear()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = { month: targetMonth, year: targetYear }

  if (!['admin', 'hr'].includes(session.user.role)) {
    query.userId = session.user._id
  }

  const result = await salaries.find(query).sort({ createdAt: -1 }).toArray()
  const employeeList = await employees.find({}).toArray()
  const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

  return result.map(s => ({
    ...s,
    _id: s._id?.toString(),
    userId: s.userId?.toString(),
    employee: employeeMap.get(s.userId?.toString())
  }))
}

export async function getMySalaries() {
  if (!isMongoConfigured()) return []

  const session = await getSession()
  if (!session) return []

  const salaries = await getCollection<Salary>('salaries')
  
  const result = await salaries.find({ userId: session.user._id })
    .sort({ year: -1, month: -1 })
    .limit(12)
    .toArray()

  return result.map(s => ({
    ...s,
    _id: s._id?.toString(),
    userId: s.userId?.toString()
  }))
}

export interface SalaryRecord {
  _id?: string
  employeeName: string
  employeeCode: string
  month: string
  basicSalary: number
  grossSalary: number
  netSalary: number
  totalAllowances: number
  totalDeductions: number
  status: string
  salaryType: string
  allowances?: { name: string; amount: number }[]
  deductions?: { name: string; amount: number }[]
}

export async function getSalaryRecords(month?: string) {
  if (!isMongoConfigured()) return { success: false, error: 'Database not configured', data: [] }

  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized', data: [] }
  }

  try {
    const salaries = await getCollection<Salary>('salaries')
    const employees = await getCollection<Employee>('employees')

    const targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = { month: monthNum - 1, year }

    if (!['admin', 'hr'].includes(session.user.role)) {
      query.userId = session.user._id
    }

    const result = await salaries.find(query).sort({ createdAt: -1 }).toArray()
    const employeeList = await employees.find({}).toArray()
    const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

    const data: SalaryRecord[] = result.map(s => {
      const emp = employeeMap.get(s.userId?.toString())
      return {
        _id: s._id?.toString(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || 'N/A',
        month: targetMonth,
        basicSalary: s.basicSalary || 0,
        grossSalary: s.grossSalary || 0,
        netSalary: s.netSalary || 0,
        totalAllowances: s.allowances?.reduce((sum, a) => sum + a.amount, 0) || 0,
        totalDeductions: s.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0,
        status: s.status || 'draft',
        salaryType: emp?.salaryType || 'fixed',
        allowances: s.allowances || [],
        deductions: s.deductions || []
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching salary records:', error)
    return { success: false, error: 'Failed to fetch salary records', data: [] }
  }
}

export async function calculateSalaryByMonth(employeeId: string, month: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // employeeId here is the employee record _id, we need to look up the userId
    const employees = await getCollection<Employee>('employees')
    const employee = await employees.findOne({ _id: new ObjectId(employeeId) })
    
    if (!employee) {
      return { success: false, error: 'Employee not found' }
    }

    const [year, monthNum] = month.split('-').map(Number)
    return calculateSalary(employee.userId.toString(), monthNum - 1, year)
  } catch (error) {
    console.error('Error calculating salary by month:', error)
    return { success: false, error: 'Failed to calculate salary' }
  }
}

export async function generatePayslip(salaryId: string) {
  if (!isMongoConfigured()) return { success: false, error: 'Database not configured' }

  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const salaries = await getCollection<Salary>('salaries')
  const employees = await getCollection<Employee>('employees')
  const settings = await getCollection('settings')

  const salary = await salaries.findOne({ _id: new ObjectId(salaryId) })
  if (!salary) {
    return { error: 'Salary record not found' }
  }

  // Check authorization
  if (!['admin', 'hr'].includes(session.user.role) && 
      salary.userId?.toString() !== session.user._id?.toString()) {
    return { error: 'Unauthorized' }
  }

  const employee = await employees.findOne({ userId: salary.userId })
  const company = await settings.findOne({ key: 'company' })

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  return {
    success: true,
    payslip: {
      companyName: company?.name || 'Company',
      employeeName: `${employee?.firstName} ${employee?.lastName}`,
      employeeCode: employee?.employeeCode,
      designation: employee?.designation,
      month: monthNames[salary.month],
      year: salary.year,
      basicSalary: salary.basicSalary,
      grossSalary: salary.grossSalary,
      netSalary: salary.netSalary,
      deductions: salary.deductions,
      allowances: salary.allowances,
      hoursWorked: salary.hoursWorked,
      leavesDeducted: salary.leavesDeducted,
      leaveDeductionAmount: salary.leaveDeductionAmount,
      bankDetails: employee?.bankDetails,
      generatedAt: new Date().toISOString()
    }
  }
}
