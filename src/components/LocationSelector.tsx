import { useState, useEffect } from 'react'
import { MapPin, Navigation, Search, Check, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { reverseGeocode, geocodeAddress, getIPLocation, type LocationResult } from '../services/locationService'

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
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        
        try {
          // Use real reverse geocoding service
          const locationResult = await reverseGeocode(latitude, longitude)
          
          const gpsLocation: UserLocation = {
            lat: locationResult.lat,
            lng: locationResult.lng,
            address: locationResult.address,
            city: locationResult.city,
            province: locationResult.province,
            postalCode: locationResult.postalCode,
            accuracy: accuracy < 100 ? 'high' : accuracy < 1000 ? 'medium' : 'low',
            source: 'gps'
          }
          
          onLocationChange(gpsLocation)
          setGpsLoading(false)
        } catch (error) {
          console.error('Reverse geocoding failed:', error)
          
          // Fallback to coordinates only
          const gpsLocation: UserLocation = {
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            city: 'Unknown',
            province: 'ON', // Default
            accuracy: accuracy < 100 ? 'high' : accuracy < 1000 ? 'medium' : 'low',
            source: 'gps'
          }
          
          onLocationChange(gpsLocation)
          setGpsLoading(false)
          setError('Got GPS coordinates but address lookup failed. Using coordinates only.')
        }
      },
      (error) => {
        let errorMessage = 'Failed to get your location.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.'
            break
        }
        
        setError(errorMessage)
        setGpsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
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

        {/* Error Display */}
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
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