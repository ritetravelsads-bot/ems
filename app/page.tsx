'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Building2,
  Users,
  Clock,
  CalendarDays,
  ListTodo,
  DollarSign,
  MapPin,
  Shield,
  ArrowRight,
  CheckCircle,
  Laptop,
  FileText,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Team Management',
    description: 'Organize teams with departments like IT, Real Estate, Sales, and custom team creation',
  },
  {
    icon: Clock,
    title: 'Attendance Tracking',
    description: 'Track employee attendance with login/logout times and detailed history',
  },
  {
    icon: MapPin,
    title: 'Geo-Location Tracking',
    description: 'Capture employee location during check-in/check-out for field verification',
  },
  {
    icon: ListTodo,
    title: 'Task Management',
    description: 'Kanban-style task board with drag-and-drop across status columns',
  },
  {
    icon: DollarSign,
    title: 'Salary & Payslips',
    description: 'Calculate salaries (fixed/hourly), generate payslips, and manage deductions',
  },
  {
    icon: CalendarDays,
    title: 'Leave Management',
    description: 'Apply for leaves, track balances, and manage approval workflows',
  },
  {
    icon: Laptop,
    title: 'Asset Management',
    description: 'Track company assets assigned to employees with complete records',
  },
  {
    icon: FileText,
    title: 'Reports & Analytics',
    description: 'Generate comprehensive reports on attendance, salary, and performance',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated) {
            router.push('/dashboard')
            return
          }
        }
      } catch (error) {
        console.log('[v0] Auth check error:', error)
      }
      setIsCheckingAuth(false)
    }
    checkAuth()
  }, [router])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold">Infobirth</span>
              <span className="ml-1 hidden text-sm text-muted-foreground sm:inline">
                Infobirth Innovations
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Shield className="mr-2 h-4 w-4" />
            Infobirth Innovations - Employee Management
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Employee Management System by Infobirth Innovations
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Streamline your HR operations with Infobirth. Manage teams, track attendance 
            with geo-location, handle salaries, and boost productivity with task management.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Register as Admin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Auth Options Section */}
      <section className="border-y bg-muted/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold">Access Your Account</h2>
            <p className="mt-2 text-muted-foreground">Choose your login type based on your role</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Admin Login */}
            <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary/10" />
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Shield className="h-6 w-6" />
                </div>
                <CardTitle>Admin Portal</CardTitle>
                <CardDescription>
                  Full system access with user management, settings, and all administrative controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Create & manage all users
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Team & department setup
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    System configuration
                  </li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button className="w-full" asChild>
                    <Link href="/login">Admin Login</Link>
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" asChild>
                    <Link href="/register">First Time Setup</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* HR Login */}
            <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-chart-2/20" />
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-2 text-primary-foreground">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>HR Portal</CardTitle>
                <CardDescription>
                  Manage employees, attendance, leaves, salaries, and onboarding processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Employee management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Leave approvals
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Salary processing
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/login">HR Login</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Employee Login */}
            <Card className="relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-chart-3/20" />
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-chart-3 text-primary-foreground">
                  <Clock className="h-6 w-6" />
                </div>
                <CardTitle>Employee Portal</CardTitle>
                <CardDescription>
                  Check-in with location tracking, manage tasks, apply for leaves, and view payslips
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Attendance with geo-tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Task management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    Leave requests
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <Link href="/login">Employee Login</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold">Comprehensive Features</h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to manage your workforce efficiently
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold">Ready to Get Started?</h2>
          <p className="mt-3 text-muted-foreground">
            Set up your Infobirth employee management system in minutes. Register as an admin to begin.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">
                Create Admin Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Already have an account?</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-semibold">Infobirth</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Infobirth Innovations - Employee Management System
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
