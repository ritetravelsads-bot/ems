'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Clock,
  ListTodo,
  DollarSign,
  FileText,
  Laptop,
  Calendar,
  Settings,
  LogOut,
  UserCircle,
  BarChart3,
  UserPlus,
} from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TimeTracker } from './time-tracker'

interface User {
  _id?: string
  name: string
  email: string
  role: 'admin' | 'hr' | 'employee'
  employeeCode?: string
}

interface DashboardSidebarProps {
  user: User
}

const mainNavItems = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['admin', 'hr'] },
  { title: 'Teams', href: '/dashboard/teams', icon: Building2, roles: ['admin', 'hr'] },
  { title: 'Attendance', href: '/dashboard/attendance', icon: Clock },
  { title: 'Leaves', href: '/dashboard/leaves', icon: CalendarDays },
  { title: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
  { title: 'Payslips', href: '/dashboard/payslips', icon: FileText },
]

const managementNavItems = [
  { title: 'Salary', href: '/dashboard/salary', icon: DollarSign, roles: ['admin', 'hr'] },
  { title: 'Assets', href: '/dashboard/assets', icon: Laptop, roles: ['admin', 'hr'] },
  { title: 'Shifts', href: '/dashboard/shifts', icon: Calendar, roles: ['admin', 'hr'] },
  { title: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin', 'hr'] },
  { title: 'Onboarding', href: '/dashboard/onboarding', icon: UserPlus, roles: ['admin', 'hr'] },
]

const settingsNavItems = [
  { title: 'My Profile', href: '/dashboard/profile', icon: UserCircle },
  { title: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin'] },
]

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()

  const filterByRole = (items: typeof mainNavItems) => {
    return items.filter(item => !item.roles || item.roles.includes(user.role))
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">Infobirth</span>
            <span className="text-xs text-sidebar-foreground/70">Infobirth Innovations</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Time Tracker Section - Only show for non-admin users */}
        {user.role !== 'admin' && (
          <SidebarGroup>
            <SidebarGroupContent className="px-2">
              <TimeTracker />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(mainNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(managementNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(settingsNavItems).map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-sidebar-foreground">{user.name}</span>
            <span className="text-xs text-sidebar-foreground/70 capitalize">{user.role}</span>
          </div>
          <form action={handleLogout}>
            <button
              type="submit"
              className="rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
