import { ObjectId } from 'mongodb'

export type UserRole = 'admin' | 'hr' | 'employee'
export type EmployeeStatus = 'active' | 'inactive' | 'onboarding' | 'offboarding'
export type SalaryType = 'fixed' | 'hourly'
export type LeaveStatus = 'pending' | 'approved' | 'rejected'
export type TaskStatus = 'backlog' | 'todo' | 'in-progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ShiftType = 'morning' | 'day' | 'evening' | 'night' | 'rotational'

export interface User {
  _id?: ObjectId
  email: string
  password: string
  name: string
  role: UserRole
  employeeCode?: string
  teamId?: ObjectId
  departmentId?: ObjectId
  status: EmployeeStatus
  createdAt: Date
  updatedAt: Date
}

export interface Team {
  _id?: ObjectId
  name: string
  departmentId: ObjectId
  description?: string
  leadId?: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface Department {
  _id?: ObjectId
  name: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface Employee {
  _id?: ObjectId
  userId: ObjectId
  employeeCode: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth?: Date
  gender?: string
  address?: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
  }
  emergencyContact?: {
    name: string
    phone: string
    relationship: string
  }
  joiningDate: Date
  designation: string
  teamId?: ObjectId
  departmentId?: ObjectId
  reportingTo?: ObjectId
  salaryType: SalaryType
  salary: number
  hourlyRate?: number
  bankDetails?: {
    bankName: string
    accountNumber: string
    ifscCode: string
    accountHolderName: string
  }
  documents?: {
    name: string
    url: string
    uploadedAt: Date
  }[]
  profileImage?: string
  status: EmployeeStatus
  shiftId?: ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface Attendance {
  _id?: ObjectId
  userId: ObjectId
  date: Date
  checkIn?: {
    time: Date
    location?: {
      latitude: number
      longitude: number
      address?: string
    }
    photo?: string
  }
  checkOut?: {
    time: Date
    location?: {
      latitude: number
      longitude: number
      address?: string
    }
    photo?: string
  }
  totalHours?: number
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Leave {
  _id?: ObjectId
  userId: ObjectId
  leaveType: 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity' | 'unpaid'
  startDate: Date
  endDate: Date
  days: number
  reason: string
  status: LeaveStatus
  approvedBy?: ObjectId
  approvedAt?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

export interface LeaveBalance {
  _id?: ObjectId
  userId: ObjectId
  year: number
  sick: number
  casual: number
  earned: number
  maternity: number
  paternity: number
  usedSick: number
  usedCasual: number
  usedEarned: number
  usedMaternity: number
  usedPaternity: number
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  _id?: ObjectId
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: ObjectId
  assignedBy: ObjectId
  teamId?: ObjectId
  dueDate?: Date
  tags?: string[]
  attachments?: {
    name: string
    url: string
    uploadedAt: Date
  }[]
  comments?: {
    userId: ObjectId
    text: string
    createdAt: Date
  }[]
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface Salary {
  _id?: ObjectId
  userId: ObjectId
  month: number
  year: number
  basicSalary: number
  hourlyRate?: number
  hoursWorked?: number
  overtimeHours?: number
  overtimeRate?: number
  allowances?: {
    name: string
    amount: number
  }[]
  deductions?: {
    name: string
    amount: number
  }[]
  grossSalary: number
  netSalary: number
  leavesDeducted: number
  leaveDeductionAmount: number
  status: 'draft' | 'processed' | 'paid'
  paidAt?: Date
  payslipUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface Shift {
  _id?: ObjectId
  name: string
  type: ShiftType
  startTime: string
  endTime: string
  breakDuration: number
  graceMinutes: number
  workingDays: number[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Asset {
  _id?: ObjectId
  name: string
  type: 'laptop' | 'phone' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'other'
  serialNumber?: string
  purchaseDate?: Date
  purchasePrice?: number
  condition?: 'new' | 'good' | 'fair' | 'poor'
  assignedTo?: ObjectId
  assignedAt?: Date
  status: 'available' | 'assigned' | 'maintenance' | 'retired'
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  _id?: ObjectId
  userId: ObjectId
  token: string
  expiresAt: Date
  userAgent?: string
  ipAddress?: string
  createdAt: Date
}

export interface AuditLog {
  _id?: ObjectId
  userId: ObjectId
  action: string
  entity: string
  entityId?: ObjectId
  details?: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}
