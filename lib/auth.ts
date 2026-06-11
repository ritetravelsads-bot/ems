import { cookies } from 'next/headers'
import { getCollection, ObjectId, isMongoConfigured } from './mongodb'
import type { User, Session } from './types'
import bcrypt from 'bcryptjs'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

export function checkMongoConnection(): boolean {
  return isMongoConfigured()
}

function generateToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(userId: ObjectId, userAgent?: string, ipAddress?: string): Promise<string> {
  const sessions = await getCollection<Session>('sessions')
  const token = generateToken()
  
  await sessions.insertOne({
    userId,
    token,
    expiresAt: new Date(Date.now() + SESSION_DURATION),
    userAgent,
    ipAddress,
    createdAt: new Date()
  })
  
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  })
  
  return token
}

export async function getSession(): Promise<{ user: User; session: Session } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (!token) return null
  
  const sessions = await getCollection<Session>('sessions')
  const session = await sessions.findOne({ 
    token, 
    expiresAt: { $gt: new Date() } 
  })
  
  if (!session) return null
  
  const users = await getCollection<User>('users')
  const user = await users.findOne({ _id: session.userId })
  
  if (!user) return null
  
  return { user, session }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  
  if (token) {
    const sessions = await getCollection<Session>('sessions')
    await sessions.deleteOne({ token })
  }
  
  cookieStore.delete('session')
}

export async function requireAuth() {
  const result = await getSession()
  if (!result) {
    throw new Error('Unauthorized')
  }
  return result
}

export async function requireRole(roles: User['role'][]) {
  const result = await requireAuth()
  if (!roles.includes(result.user.role)) {
    throw new Error('Forbidden')
  }
  return result
}

export function generateEmployeeCode(prefix: string, count: number): string {
  return `${prefix}${String(count + 1).padStart(5, '0')}`
}
