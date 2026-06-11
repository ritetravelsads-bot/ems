'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Check, X } from 'lucide-react'
import { approveLeave, rejectLeave } from '@/app/actions/leaves'
import { toast } from 'sonner'
import { useState } from 'react'

interface LeaveRequest {
  _id: string
  leaveType: string
  startDate: Date
  endDate: Date
  days: number
  reason: string
  status: string
  employee?: {
    firstName: string
    lastName: string
  }
}

interface RecentActivityProps {
  leaves: LeaveRequest[]
  isAdminOrHr: boolean
}

export function RecentActivity({ leaves, isAdminOrHr }: RecentActivityProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setProcessing(id)
    const result = await approveLeave(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Leave approved')
    }
    setProcessing(null)
  }

  async function handleReject(id: string) {
    setProcessing(id)
    const result = await rejectLeave(id, 'Rejected by admin')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Leave rejected')
    }
    setProcessing(null)
  }

  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">No pending leave requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {leaves.map((leave) => (
        <div key={leave._id} className="flex items-start gap-4 rounded-lg border p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">
              {leave.employee?.firstName} {leave.employee?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              {leave.leaveType} leave - {leave.days} day(s)
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {leave.reason}
            </p>
            <Badge variant="outline" className="text-xs capitalize">
              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
            </Badge>
          </div>
          {isAdminOrHr && (
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                onClick={() => handleApprove(leave._id)}
                disabled={processing === leave._id}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleReject(leave._id)}
                disabled={processing === leave._id}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
