'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Play, Square, Clock, MapPin, Loader2 } from 'lucide-react'
import { checkIn, checkOut, getTodayAttendance } from '@/app/actions/attendance'
import { toast } from 'sonner'

interface AttendanceRecord {
  checkIn?: { time: Date | string }
  checkOut?: { time: Date | string }
  totalHours?: number
}

export function TimeTracker() {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [action, setAction] = useState<'in' | 'out'>('in')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const loadAttendance = useCallback(async () => {
    try {
      const record = await getTodayAttendance()
      setAttendance(record)
    } catch (error) {
      console.error('Error loading attendance:', error)
    } finally {
      setInitialLoading(false)
    }
  }, [])

  const getLocation = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
        }
      )
    }
  }, [])

  useEffect(() => {
    loadAttendance()
    getLocation()
  }, [loadAttendance, getLocation])

  // Timer effect - calculates elapsed time from check-in
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (attendance?.checkIn && !attendance?.checkOut) {
      const updateElapsed = () => {
        const checkInTime = new Date(attendance.checkIn!.time).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - checkInTime) / 1000))
      }

      updateElapsed()
      interval = setInterval(updateElapsed, 1000)
    } else if (attendance?.checkOut && attendance?.checkIn) {
      // If checked out, show the final elapsed time
      const checkInTime = new Date(attendance.checkIn.time).getTime()
      const checkOutTime = new Date(attendance.checkOut.time).getTime()
      setElapsedTime(Math.floor((checkOutTime - checkInTime) / 1000))
    } else {
      setElapsedTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [attendance])

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function handleClick(type: 'in' | 'out') {
    setAction(type)
    setShowDialog(true)
  }

  async function handleConfirm() {
    if (!location) {
      toast.error('Location is required for attendance')
      return
    }

    setLoading(true)
    try {
      if (action === 'in') {
        const result = await checkIn(location.latitude, location.longitude)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Checked in successfully!')
          loadAttendance()
        }
      } else {
        const result = await checkOut(location.latitude, location.longitude)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`Checked out! Total hours: ${result.totalHours?.toFixed(2)}`)
          loadAttendance()
        }
      }
    } finally {
      setLoading(false)
      setShowDialog(false)
    }
  }

  const isCheckedIn = attendance?.checkIn && !attendance?.checkOut
  const isCheckedOut = attendance?.checkOut

  if (initialLoading) {
    return (
      <Card className="bg-sidebar-accent/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-sidebar-foreground/50" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-sidebar-accent/50 border-sidebar-border">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-sidebar-foreground/70" />
            <span className="text-xs font-medium text-sidebar-foreground/70">Time Tracker</span>
          </div>

          {/* Timer Display */}
          <div className="text-center py-2">
            <div className="font-mono text-2xl font-bold text-sidebar-foreground tabular-nums">
              {formatTime(elapsedTime)}
            </div>
            {isCheckedIn && (
              <Badge 
                variant="outline" 
                className="mt-1 bg-success/10 text-success border-success/20 text-xs"
              >
                Working
              </Badge>
            )}
            {isCheckedOut && (
              <Badge 
                variant="outline" 
                className="mt-1 bg-muted text-muted-foreground text-xs"
              >
                Day Complete
              </Badge>
            )}
            {!attendance?.checkIn && (
              <p className="mt-1 text-xs text-sidebar-foreground/50">Not started</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            {!attendance?.checkIn && (
              <Button 
                size="sm" 
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
                onClick={() => handleClick('in')}
              >
                <Play className="mr-1 h-3 w-3" />
                Start
              </Button>
            )}
            
            {isCheckedIn && (
              <Button 
                size="sm" 
                variant="destructive"
                className="flex-1"
                onClick={() => handleClick('out')}
              >
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
            )}

            {isCheckedOut && (
              <div className="flex-1 text-center">
                <p className="text-xs text-sidebar-foreground/70">
                  Total: {attendance.totalHours?.toFixed(2) || (elapsedTime / 3600).toFixed(2)} hrs
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'in' ? 'Start Work' : 'End Work'} Confirmation
            </DialogTitle>
            <DialogDescription>
              Your location and time will be recorded for attendance tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                Current time: {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
            {location ? (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">
                  Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <MapPin className="h-4 w-4" />
                <span>Unable to get location. Please enable location services.</span>
              </div>
            )}
            {action === 'out' && attendance?.checkIn && (
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Session Duration</p>
                <p className="font-mono text-lg font-semibold">{formatTime(elapsedTime)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={loading || !location}
              className={action === 'in' ? 'bg-success text-success-foreground hover:bg-success/90' : ''}
              variant={action === 'out' ? 'destructive' : 'default'}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === 'in' ? 'Start Work' : 'End Work'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
