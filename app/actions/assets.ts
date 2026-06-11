'use server'

import { revalidatePath } from 'next/cache'
import { getCollection, ObjectId, isMongoConfigured } from '@/lib/mongodb'
import { getSession } from '@/lib/auth'
import type { Asset } from '@/lib/types'

interface AssetInput {
  name: string
  type: Asset['type']
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  condition?: Asset['condition']
  status?: Asset['status']
  notes?: string
}

export async function createAsset(data: AssetInput) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  if (!data.name || !data.type) {
    return { success: false, error: 'Name and type are required' }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    
    await assets.insertOne({
      name: data.name,
      type: data.type,
      serialNumber: data.serialNumber,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchasePrice: data.purchasePrice,
      condition: data.condition || 'new',
      status: 'available',
      notes: data.notes,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    revalidatePath('/dashboard/assets')
    return { success: true }
  } catch (error) {
    console.error('Error creating asset:', error)
    return { success: false, error: 'Failed to create asset' }
  }
}

export async function updateAsset(id: string, data: AssetInput) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    
    await assets.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: data.name,
          type: data.type,
          serialNumber: data.serialNumber,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
          purchasePrice: data.purchasePrice,
          condition: data.condition,
          status: data.status || 'available',
          notes: data.notes,
          updatedAt: new Date()
        }
      }
    )

    revalidatePath('/dashboard/assets')
    return { success: true }
  } catch (error) {
    console.error('Error updating asset:', error)
    return { success: false, error: 'Failed to update asset' }
  }
}

export async function deleteAsset(id: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    const asset = await assets.findOne({ _id: new ObjectId(id) })
    
    if (asset?.status === 'assigned') {
      return { success: false, error: 'Cannot delete assigned asset. Unassign first.' }
    }

    await assets.deleteOne({ _id: new ObjectId(id) })

    revalidatePath('/dashboard/assets')
    return { success: true }
  } catch (error) {
    console.error('Error deleting asset:', error)
    return { success: false, error: 'Failed to delete asset' }
  }
}

export async function assignAsset(assetId: string, employeeId: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    
    await assets.updateOne(
      { _id: new ObjectId(assetId) },
      {
        $set: {
          assignedTo: new ObjectId(employeeId),
          assignedAt: new Date(),
          status: 'assigned' as const,
          updatedAt: new Date()
        }
      }
    )

    revalidatePath('/dashboard/assets')
    return { success: true }
  } catch (error) {
    console.error('Error assigning asset:', error)
    return { success: false, error: 'Failed to assign asset' }
  }
}

export async function unassignAsset(assetId: string) {
  if (!isMongoConfigured()) {
    return { success: false, error: 'Database not configured' }
  }

  const session = await getSession()
  if (!session || !['admin', 'hr'].includes(session.user.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    
    await assets.updateOne(
      { _id: new ObjectId(assetId) },
      {
        $set: {
          status: 'available' as const,
          updatedAt: new Date()
        },
        $unset: {
          assignedTo: '',
          assignedAt: ''
        }
      }
    )

    revalidatePath('/dashboard/assets')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning asset:', error)
    return { success: false, error: 'Failed to unassign asset' }
  }
}

export async function getAssets(filters?: { status?: Asset['status'], type?: Asset['type'] }) {
  if (!isMongoConfigured()) {
    return { success: true, data: [] }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    const employees = await getCollection('employees')
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {}
    if (filters?.status) query.status = filters.status
    if (filters?.type) query.type = filters.type

    const result = await assets.find(query).sort({ createdAt: -1 }).toArray()
    const employeeList = await employees.find({}).toArray()
    const employeeMap = new Map(employeeList.map(e => [e._id?.toString(), e]))

    const data = result.map(a => ({
      ...a,
      _id: a._id?.toString(),
      assignedTo: a.assignedTo?.toString(),
      employee: a.assignedTo ? employeeMap.get(a.assignedTo?.toString()) : undefined
    }))

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching assets:', error)
    return { success: false, error: 'Failed to fetch assets', data: [] }
  }
}

export async function getAssetsByEmployee(employeeId: string) {
  if (!isMongoConfigured()) {
    return []
  }

  const session = await getSession()
  if (!session) return []

  try {
    const assets = await getCollection<Asset>('assets')
    
    const result = await assets.find({ assignedTo: new ObjectId(employeeId) }).toArray()

    return result.map(a => ({
      ...a,
      _id: a._id?.toString(),
      assignedTo: a.assignedTo?.toString()
    }))
  } catch (error) {
    console.error('Error fetching employee assets:', error)
    return []
  }
}

export async function getAssetStats() {
  if (!isMongoConfigured()) {
    return { total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 }
  }

  try {
    const assets = await getCollection<Asset>('assets')
    
    const total = await assets.countDocuments()
    const available = await assets.countDocuments({ status: 'available' })
    const assigned = await assets.countDocuments({ status: 'assigned' })
    const maintenance = await assets.countDocuments({ status: 'maintenance' })
    const retired = await assets.countDocuments({ status: 'retired' })

    return { total, available, assigned, maintenance, retired }
  } catch (error) {
    console.error('Error fetching asset stats:', error)
    return { total: 0, available: 0, assigned: 0, maintenance: 0, retired: 0 }
  }
}
