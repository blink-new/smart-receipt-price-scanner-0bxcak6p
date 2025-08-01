import { useState, useEffect } from 'react'
import { MapPin, Navigation, Search, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { reverseGeocode, geocodeAddress, getIPLocation, type LocationResult } from '../services/locationService'

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}



export interface UserLocation {
  lat: number
  lng: number
  address: string
  city: string
  province: string
  postalCode?: string
  accuracy: 'high' | 'medium' | 'low'
  source: 'gps' | 'manual' | 'ip'
}

interface LocationSelectorProps {
  currentLocation?: UserLocation
  onLocationChange: (location: UserLocation) => void
}

export function LocationSelector({ currentLocation, onLocationChange }: LocationSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpsSupported, setGpsSupported] = useState(false)

  useEffect(() => {
    setGpsSupported('geolocation' in navigator)
  }, [])

  const handleGPSLocation = async () => {
    if (!navigator.geolocation) {
      setError('GPS is not supported by this browser.')
      return
    }

    setGpsLoading(true)
    setError(null)
    
    // Try to get high accuracy location first, then fallback to lower accuracy
    const tryGetLocation = (options: PositionOptions) => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options)
      })
    }
    
    try {
      let position: GeolocationPosition
      
      try {
        // First attempt: High accuracy with shorter timeout
        position = await tryGetLocation({
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000 // 1 minute
        })
      } catch (highAccuracyError) {
        console.log('High accuracy failed, trying standard accuracy...')
        // Second attempt: Standard accuracy with longer timeout
        position = await tryGetLocation({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        })
      }
      
      const { latitude, longitude, accuracy } = position.coords
      
      console.log(`GPS coordinates: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`)
      
      try {
        // Use real reverse geocoding service
        const locationResult = await reverseGeocode(latitude, longitude)
        
        const gpsLocation: UserLocation = {
          lat: latitude, // Use actual GPS coordinates
          lng: longitude, // Use actual GPS coordinates
          address: locationResult.address,
          city: locationResult.city,
          province: locationResult.province,
          postalCode: locationResult.postalCode,
          accuracy: accuracy < 100 ? 'high' : accuracy < 1000 ? 'medium' : 'low',
          source: 'gps'
        }
        
        onLocationChange(gpsLocation)
        setGpsLoading(false)
        
        // Show success message with city name and accuracy
        setError(`✅ Location found: ${locationResult.city}, ${locationResult.province} (±${Math.round(accuracy)}m accuracy)`)
        // Clear success message after 4 seconds
        setTimeout(() => setError(null), 4000)
      } catch (error) {
        console.error('Reverse geocoding failed:', error)
        
        // Use coordinates directly without any city estimation
        const gpsLocation: UserLocation = {
          lat: latitude, // ALWAYS use actual GPS coordinates
          lng: longitude, // ALWAYS use actual GPS coordinates
          address: `GPS Location ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: `GPS ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          province: 'Unknown',
          accuracy: accuracy < 100 ? 'high' : accuracy < 1000 ? 'medium' : 'low',
          source: 'gps'
        }
        
        onLocationChange(gpsLocation)
        setGpsLoading(false)
        setError(`✅ GPS coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (±${Math.round(accuracy)}m) - Address lookup failed, using coordinates only`)
        // Clear message after 5 seconds
        setTimeout(() => setError(null), 5000)
      }
    } catch (error: any) {
      let errorMessage = 'Failed to get your location.'
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings.'
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Please check your device\'s location services.'
          break
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again or check your internet connection.'
          break
        default:
          errorMessage = `Location error: ${error.message || 'Unknown error'}`
      }
      
      setError(errorMessage)
      setGpsLoading(false)
    }
  }

  const handleManualLocation = async () => {
    if (!searchQuery.trim()) return
    
    setGpsLoading(true)
    setError(null)
    
    try {
      // Use real geocoding service
      const locationResult = await geocodeAddress(searchQuery.trim())
      
      const manualLocation: UserLocation = {
        lat: locationResult.lat,
        lng: locationResult.lng,
        address: locationResult.address,
        city: locationResult.city,
        province: locationResult.province,
        postalCode: locationResult.postalCode,
        accuracy: locationResult.accuracy,
        source: 'manual'
      }
      
      onLocationChange(manualLocation)
      setSearchQuery('')
      setGpsLoading(false)
    } catch (error) {
      console.error('Geocoding failed:', error)
      
      // Fallback to basic location
      const manualLocation: UserLocation = {
        lat: 43.6532, // Default to Toronto
        lng: -79.3832,
        address: searchQuery.trim(),
        city: searchQuery.trim().split(',')[0] || 'Unknown',
        province: 'ON', // Default
        accuracy: 'low',
        source: 'manual'
      }
      
      onLocationChange(manualLocation)
      setSearchQuery('')
      setGpsLoading(false)
      setError('Address lookup failed. Using basic location info.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Display */}
        {currentLocation && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">Current Location</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentLocation.address}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {currentLocation.source === 'gps' ? 'GPS' : 'Manual'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentLocation.accuracy} accuracy
                  </Badge>
                </div>
              </div>
              <Check className="h-5 w-5 text-green-600" />
            </div>
          </div>
        )}

        {/* GPS Location */}
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGPSLocation}
            disabled={gpsLoading || !gpsSupported}
          >
            {gpsLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            ) : gpsSupported ? (
              <Navigation className="h-4 w-4 mr-2" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2" />
            )}
            {gpsLoading ? 'Getting Location...' : 
             gpsSupported ? 'Use GPS Location' : 'GPS Not Available'}
          </Button>
          
          {gpsSupported && (
            <p className="text-xs text-muted-foreground text-center">
              GPS will get your coordinates and attempt to find your address using web search.
            </p>
          )}
        </div>

        {/* Manual Location */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter your city (e.g., Toronto, ON)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
            />
            <Button 
              onClick={handleManualLocation}
              disabled={!searchQuery.trim() || gpsLoading}
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your city manually for basic location-based features
          </p>
        </div>

        {/* Error/Success Display */}
        {error && (
          <Alert className={error.startsWith('✅') ? 'border-green-200 bg-green-50' : ''}>
            <AlertCircle className={`h-4 w-4 ${error.startsWith('✅') ? 'text-green-600' : ''}`} />
            <AlertDescription className={error.startsWith('✅') ? 'text-green-700' : ''}>{error}</AlertDescription>
          </Alert>
        )}

        {/* Limitations Notice */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Limitations:</strong>
            <ul className="mt-2 text-xs space-y-1">
              <li>• GPS provides coordinates only (no address lookup)</li>
              <li>• Store locations and distances are simulated</li>
              <li>• Price comparisons use AI-generated data</li>
              <li>• Real store integration requires additional APIs</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}