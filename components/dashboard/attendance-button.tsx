'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Clock, MapPin, LogIn, LogOut, Loader2 } from 'lucide-react'
import { checkIn, checkOut, getTodayAttendance } from '@/app/actions/attendance'
import { toast } from 'sonner'

export function AttendanceButton() {
  const [loading, setLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [action, setAction] = useState<'in' | 'out'>('in')
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [attendance, setAttendance] = useState<{
    checkIn?: { time: Date }
    checkOut?: { time: Date }
  } | null>(null)

  useEffect(() => {
    loadAttendance()
    getLocation()
  }, [])

  async function loadAttendance() {
    const record = await getTodayAttendance()
    setAttendance(record)
  }

  function getLocation() {
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
          toast.success(`Checked out! Total hours: ${result.totalHours}`)
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

  return (
    <>
      <div className="flex items-center gap-2">
        {isCheckedIn && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
            <Clock className="mr-1 h-3 w-3" />
            Working
          </Badge>
        )}
        {isCheckedOut && (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Day Complete
          </Badge>
        )}
        
        {!attendance?.checkIn && (
          <Button size="sm" onClick={() => handleClick('in')}>
            <LogIn className="mr-2 h-4 w-4" />
            Check In
          </Button>
        )}
        
        {isCheckedIn && (
          <Button size="sm" variant="outline" onClick={() => handleClick('out')}>
            <LogOut className="mr-2 h-4 w-4" />
            Check Out
          </Button>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'in' ? 'Check In' : 'Check Out'} Confirmation
            </DialogTitle>
            <DialogDescription>
              Your location will be recorded for attendance tracking.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {location ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-success" />
                <span>Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <MapPin className="h-4 w-4" />
                <span>Unable to get location. Please enable location services.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={loading || !location}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {action === 'in' ? 'Check In' : 'Check Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
