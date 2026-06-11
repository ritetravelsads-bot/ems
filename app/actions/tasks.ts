'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Task } from '@/lib/types'

export async function createTask(data: {
  title: string
  description?: string
  priority?: Task['priority']
  status?: Task['status']
  assigneeId?: string
  teamId?: string
  dueDate?: string
  tags?: string[]
}) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured. Please add MONGODB_URI to environment variables.' }
  }

  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const { title, description, priority, status, assigneeId, teamId, dueDate, tags } = data

  if (!title) {
    return { success: false, error: 'Title is required' }
  }

  try {
    const tasks = await getCollection<Task>('tasks')
    
    // Get max order for the status
    const targetStatus = status || 'backlog'
    const maxOrderTask = await tasks.findOne(
      { status: targetStatus },
      { sort: { order: -1 } }
    )
    const order = (maxOrderTask?.order || 0) + 1

    const result = await tasks.insertOne({
      title,
      description,
      status: targetStatus,
      priority: priority || 'medium',
      assigneeId: assigneeId ? new ObjectId(assigneeId) : undefined,
      assignedBy: session.user._id!,
      teamId: teamId ? new ObjectId(teamId) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: tags || [],
      order,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    revalidatePath('/dashboard/tasks')
    return { success: true, id: result.insertedId.toString() }
  } catch (error) {
    console.error('Error creating task:', error)
    return { success: false, error: 'Failed to create task' }
  }
}

export async function createTaskFromFormData(formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as Task['priority']
  const assigneeId = formData.get('assigneeId') as string
  const teamId = formData.get('teamId') as string
  const dueDate = formData.get('dueDate') as string
  const tags = formData.get('tags') as string

  if (!title) {
    return { error: 'Title is required' }
  }

  const tasks = await getCollection<Task>('tasks')
  
  // Get max order for todo status
  const maxOrderTask = await tasks.findOne(
    { status: 'todo' },
    { sort: { order: -1 } }
  )
  const order = (maxOrderTask?.order || 0) + 1

  const result = await tasks.insertOne({
    title,
    description,
    status: 'todo',
    priority: priority || 'medium',
    assigneeId: assigneeId ? new ObjectId(assigneeId) : undefined,
    assignedBy: session.user._id!,
    teamId: teamId ? new ObjectId(teamId) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    order,
    createdAt: new Date(),
    updatedAt: new Date()
  })

  revalidatePath('/dashboard/tasks')
  return { success: true, id: result.insertedId.toString() }
}

export async function updateTask(id: string, formData: FormData) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const priority = formData.get('priority') as Task['priority']
  const assigneeId = formData.get('assigneeId') as string
  const dueDate = formData.get('dueDate') as string
  const tags = formData.get('tags') as string

  const tasks = await getCollection<Task>('tasks')
  
  await tasks.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        title,
        description,
        priority,
        assigneeId: assigneeId ? new ObjectId(assigneeId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        updatedAt: new Date()
      }
    }
  )

  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function updateTaskStatus(id: string, status: Task['status'], newOrder?: number) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const tasks = await getCollection<Task>('tasks')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    status,
    updatedAt: new Date()
  }

  if (newOrder !== undefined) {
    updateData.order = newOrder
  }

  await tasks.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  )

  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function reorderTasks(taskIds: string[], status: Task['status']) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const tasks = await getCollection<Task>('tasks')
  
  const bulkOps = taskIds.map((id, index) => ({
    updateOne: {
      filter: { _id: new ObjectId(id) },
      update: { $set: { order: index, status, updatedAt: new Date() } }
    }
  }))

  await tasks.bulkWrite(bulkOps)

  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function deleteTask(id: string) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const tasks = await getCollection<Task>('tasks')
  await tasks.deleteOne({ _id: new ObjectId(id) })

  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function addTaskComment(taskId: string, text: string) {
  const session = await getSession()
  if (!session) {
    return { error: 'Unauthorized' }
  }

  const tasks = await getCollection<Task>('tasks')
  
  await tasks.updateOne(
    { _id: new ObjectId(taskId) },
    {
      $push: {
        comments: {
          userId: session.user._id,
          text,
          createdAt: new Date()
        }
      } as never,
      $set: { updatedAt: new Date() }
    }
  )

  revalidatePath('/dashboard/tasks')
  return { success: true }
}

export async function getTasks(filters?: {
  status?: Task['status']
  assigneeId?: string
  teamId?: string
  priority?: Task['priority']
}) {
  try {
    if (!isMongoConfigured()) {
      return { success: false, error: 'Database not configured', data: [] }
    }

    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized', data: [] }

    const tasks = await getCollection<Task>('tasks')
    const employees = await getCollection('employees')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {}

    // Non-admin/hr users only see their tasks or tasks they created
    if (!['admin', 'hr'].includes(session.user.role)) {
      query.$or = [
        { assigneeId: session.user._id },
        { assignedBy: session.user._id }
      ]
    }

    if (filters?.status) query.status = filters.status
    if (filters?.assigneeId) query.assigneeId = new ObjectId(filters.assigneeId)
    if (filters?.teamId) query.teamId = new ObjectId(filters.teamId)
    if (filters?.priority) query.priority = filters.priority

    const result = await tasks.find(query).sort({ order: 1 }).toArray()
    const employeeList = await employees.find({}).toArray()
    const employeeMap = new Map(employeeList.map(e => [e.userId?.toString(), e]))

    return {
      success: true,
      data: result.map(t => ({
        ...t,
        _id: t._id?.toString(),
        assigneeId: t.assigneeId?.toString(),
        assignedBy: t.assignedBy?.toString(),
        teamId: t.teamId?.toString(),
        assignee: employeeMap.get(t.assigneeId?.toString())
      }))
    }
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return { success: false, error: 'Failed to fetch tasks', data: [] }
  }
}

export async function getTasksByStatus() {
  const session = await getSession()
  if (!session) return { backlog: [], todo: [], 'in-progress': [], review: [], done: [] }
  
  const result = await getTasks()
  const allTasks = result.success ? result.data : []
  
  return {
    backlog: allTasks.filter(t => t.status === 'backlog'),
    todo: allTasks.filter(t => t.status === 'todo'),
    'in-progress': allTasks.filter(t => t.status === 'in-progress'),
    review: allTasks.filter(t => t.status === 'review'),
    done: allTasks.filter(t => t.status === 'done')
  }
}
