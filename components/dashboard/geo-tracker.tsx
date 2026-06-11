"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Camera, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { checkIn, checkOut } from "@/app/actions/attendance";
import { useToast } from "@/hooks/use-toast";

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface GeoTrackerProps {
  userId: string;
  isAdmin?: boolean;
  currentStatus?: "checked-in" | "checked-out";
  onStatusChange?: (status: "checked-in" | "checked-out") => void;
}

export function GeoTracker({
  userId,
  isAdmin = false,
  currentStatus = "checked-out",
  onStatusChange,
}: GeoTrackerProps) {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [status, setStatus] = useState(currentStatus);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Get current location
  const getCurrentLocation = useCallback((): Promise<GeoLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: GeoLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          // Try to get address using reverse geocoding
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`
            );
            const data = await response.json();
            if (data.display_name) {
              loc.address = data.display_name;
            }
          } catch {
            // Address lookup failed, continue without it
          }

          resolve(loc);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Start camera for photo capture
  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsCapturing(false);
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedPhoto(photoData);
        // Stop camera
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
        setIsCapturing(false);
      }
    }
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (isAdmin) {
      toast({
        title: "Admin Notice",
        description: "Geo-tracking is disabled for admin users.",
      });
      return;
    }

    setIsLoading(true);
    setLocationError(null);

    try {
      const loc = await getCurrentLocation();
      setLocation(loc);

      const result = await checkIn(userId, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
      }, capturedPhoto || undefined);

      if (result.success) {
        setStatus("checked-in");
        onStatusChange?.("checked-in");
        toast({
          title: "Checked In",
          description: `Successfully checked in at ${new Date().toLocaleTimeString()}`,
        });
        setCapturedPhoto(null);
      } else {
        toast({
          title: "Check-in Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get location";
      setLocationError(message);
      toast({
        title: "Location Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (isAdmin) {
      toast({
        title: "Admin Notice",
        description: "Geo-tracking is disabled for admin users.",
      });
      return;
    }

    setIsLoading(true);
    setLocationError(null);

    try {
      const loc = await getCurrentLocation();
      setLocation(loc);

      const result = await checkOut(userId, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
      });

      if (result.success) {
        setStatus("checked-out");
        onStatusChange?.("checked-out");
        toast({
          title: "Checked Out",
          description: `Successfully checked out at ${new Date().toLocaleTimeString()}`,
        });
      } else {
        toast({
          title: "Check-out Failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to get location";
      setLocationError(message);
      toast({
        title: "Location Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update location on mount
  useEffect(() => {
    if (!isAdmin) {
      getCurrentLocation()
        .then(setLocation)
        .catch((error) => setLocationError(error.message));
    }
  }, [getCurrentLocation, isAdmin]);

  if (isAdmin) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Geo-Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Geo-tracking is disabled for admin users.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Attendance Tracker
          </CardTitle>
          <Badge
            variant="outline"
            className={
              status === "checked-in"
                ? "bg-success/10 text-success border-success/20"
                : "bg-muted text-muted-foreground"
            }
          >
            {status === "checked-in" ? "Checked In" : "Checked Out"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location Display */}
        {location && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="font-medium">Current Location</p>
                {location.address ? (
                  <p className="text-muted-foreground line-clamp-2">{location.address}</p>
                ) : (
                  <p className="font-mono text-xs text-muted-foreground">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Accuracy: {Math.round(location.accuracy)}m
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Location Error */}
        {locationError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>{locationError}</p>
          </div>
        )}

        {/* Camera Capture */}
        {isCapturing && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-black"
            />
            <Button onClick={capturePhoto} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Capture Photo
            </Button>
          </div>
        )}

        {/* Captured Photo Preview */}
        {capturedPhoto && !isCapturing && (
          <div className="relative">
            <img
              src={capturedPhoto || "/placeholder.svg"}
              alt="Captured"
              className="w-full rounded-lg"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setCapturedPhoto(null)}
            >
              Remove
            </Button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* Action Buttons */}
        <div className="flex gap-2">
          {status === "checked-out" ? (
            <>
              {!capturedPhoto && !isCapturing && (
                <Button
                  variant="outline"
                  onClick={startCamera}
                  disabled={isLoading}
                  className="flex-1 bg-transparent"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture Photo
                </Button>
              )}
              <Button
                onClick={handleCheckIn}
                disabled={isLoading}
                className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Check In
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCheckOut}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Check Out
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
