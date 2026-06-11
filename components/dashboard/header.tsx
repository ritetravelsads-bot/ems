'use client'

import { useEffect, useState } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { AttendanceButton } from './attendance-button'
import { getLeaveRequests } from '@/app/actions/leaves'
import { getTasks } from '@/app/actions/tasks'

interface User {
  _id?: string
  name: string
  email: string
  role: 'admin' | 'hr' | 'employee'
}

interface DashboardHeaderProps {
  user: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function fetchNotifications() {
      try {
        let count = 0

        if (['admin', 'hr'].includes(user.role)) {
          // For admin/hr: count pending leave requests
          const leavesResult = await getLeaveRequests()
          if (leavesResult.success && leavesResult.data) {
            count += leavesResult.data.filter(
              (l: { status: string }) => l.status === 'pending'
            ).length
          }
        } else {
          // For employees: count pending tasks assigned to them
          const tasksResult = await getTasks()
          if (tasksResult.success && tasksResult.data) {
            count += tasksResult.data.filter(
              (t: { status: string }) => t.status === 'todo' || t.status === 'in-progress'
            ).length
          }
        }

        setNotificationCount(count)
      } catch {
        // Silently fail if not connected to DB
        setNotificationCount(0)
      }
    }

    fetchNotifications()
  }, [user.role])

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="-ml-2" />
      <Separator orientation="vertical" className="h-6" />
      
      <div className="flex flex-1 items-center gap-2">
        <Badge variant="outline" className="capitalize">
          {user.role}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {user.role !== 'admin' && <AttendanceButton />}

        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  )
}
