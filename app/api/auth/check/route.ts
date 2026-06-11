import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (session) {
      return NextResponse.json({
        authenticated: true,
        user: {
          _id: session.user._id?.toString(),
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          employeeCode: session.user.employeeCode
        }
      })
    }
    
    return NextResponse.json({ authenticated: false })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ authenticated: false })
  }
}
