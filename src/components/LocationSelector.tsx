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

// Helper function to estimate location based on coordinates with better accuracy
function getLocationEstimate(lat: number, lng: number): { city: string; province: string } {
  // More precise Canadian cities and their coordinate ranges
  const canadianCities = [
    // Ontario
    { city: 'Toronto', province: 'ON', latRange: [43.58, 43.85], lngRange: [-79.64, -79.12] },
    { city: 'Ottawa', province: 'ON', latRange: [45.25, 45.53], lngRange: [-76.35, -75.24] },
    { city: 'Hamilton', province: 'ON', latRange: [43.20, 43.32], lngRange: [-80.13, -79.73] },
    { city: 'London', province: 'ON', latRange: [42.94, 43.03], lngRange: [-81.34, -81.13] },
    { city: 'Windsor', province: 'ON', latRange: [42.27, 42.35], lngRange: [-83.07, -82.88] },
    { city: 'Kitchener', province: 'ON', latRange: [43.42, 43.48], lngRange: [-80.52, -80.45] },
    { city: 'Mississauga', province: 'ON', latRange: [43.46, 43.64], lngRange: [-79.74, -79.52] },
    { city: 'Brampton', province: 'ON', latRange: [43.68, 43.77], lngRange: [-79.81, -79.68] },
    
    // Quebec
    { city: 'Montreal', province: 'QC', latRange: [45.40, 45.70], lngRange: [-73.98, -73.47] },
    { city: 'Quebec City', province: 'QC', latRange: [46.75, 46.87], lngRange: [-71.39, -71.18] },
    { city: 'Laval', province: 'QC', latRange: [45.52, 45.61], lngRange: [-73.81, -73.68] },
    { city: 'Gatineau', province: 'QC', latRange: [45.43, 45.53], lngRange: [-75.93, -75.63] },
    
    // British Columbia
    { city: 'Vancouver', province: 'BC', latRange: [49.20, 49.32], lngRange: [-123.27, -122.99] },
    { city: 'Surrey', province: 'BC', latRange: [49.05, 49.22], lngRange: [-122.85, -122.70] },
    { city: 'Burnaby', province: 'BC', latRange: [49.22, 49.29], lngRange: [-123.03, -122.90] },
    { city: 'Richmond', province: 'BC', latRange: [49.13, 49.20], lngRange: [-123.18, -123.06] },
    { city: 'Victoria', province: 'BC', latRange: [48.40, 48.46], lngRange: [-123.39, -123.32] },
    
    // Alberta
    { city: 'Calgary', province: 'AB', latRange: [50.84, 51.18], lngRange: [-114.31, -113.81] },
    { city: 'Edmonton', province: 'AB', latRange: [53.39, 53.71], lngRange: [-113.70, -113.30] },
    { city: 'Red Deer', province: 'AB', latRange: [52.25, 52.30], lngRange: [-113.85, -113.75] },
    
    // Manitoba
    { city: 'Winnipeg', province: 'MB', latRange: [49.78, 49.95], lngRange: [-97.32, -96.92] },
    
    // Saskatchewan
    { city: 'Saskatoon', province: 'SK', latRange: [52.10, 52.18], lngRange: [-106.72, -106.58] },
    { city: 'Regina', province: 'SK', latRange: [50.40, 50.48], lngRange: [-104.67, -104.52] },
    
    // Nova Scotia
    { city: 'Halifax', province: 'NS', latRange: [44.60, 44.73], lngRange: [-63.74, -63.52] },
    
    // New Brunswick
    { city: 'Moncton', province: 'NB', latRange: [46.06, 46.13], lngRange: [-64.83, -64.72] },
    { city: 'Saint John', province: 'NB', latRange: [45.25, 45.30], lngRange: [-66.10, -66.04] },
    
    // Newfoundland
    { city: 'St. Johns', province: 'NL', latRange: [47.52, 47.59], lngRange: [-52.75, -52.67] }
  ]
  
  // Calculate distance to each city center and find the closest
  let closestCity = { city: 'Toronto', province: 'ON' }
  let minDistance = Infinity
  
  for (const location of canadianCities) {
    const cityLat = (location.latRange[0] + location.latRange[1]) / 2
    const cityLng = (location.lngRange[0] + location.lngRange[1]) / 2
    
    // Calculate distance using Haversine formula
    const distance = calculateDistance(lat, lng, cityLat, cityLng)
    
    if (distance < minDistance) {
      minDistance = distance
      closestCity = { city: location.city, province: location.province }
    }
    
    // If coordinates are within the city bounds, return immediately
    if (lat >= location.latRange[0] && lat <= location.latRange[1] &&
        lng >= location.lngRange[0] && lng <= location.lngRange[1]) {
      return { city: location.city, province: location.province }
    }
  }
  
  // Return the closest city if within reasonable distance (100km)
  if (minDistance <= 100) {
    return closestCity
  }
  
  // Fallback based on general regions for remote areas
  if (lat >= 48.0 && lat <= 60.0 && lng >= -140.0 && lng <= -114.0) {
    return { city: 'Vancouver', province: 'BC' } // BC region
  } else if (lat >= 49.0 && lat <= 60.0 && lng >= -114.0 && lng <= -101.0) {
    return { city: 'Calgary', province: 'AB' } // Alberta region
  } else if (lat >= 49.0 && lat <= 60.0 && lng >= -101.0 && lng <= -95.0) {
    return { city: 'Winnipeg', province: 'MB' } // Manitoba region
  } else if (lat >= 42.0 && lat <= 57.0 && lng >= -95.0 && lng <= -74.0) {
    return { city: 'Toronto', province: 'ON' } // Ontario region
  } else if (lat >= 45.0 && lat <= 62.0 && lng >= -79.0 && lng <= -57.0) {
    return { city: 'Montreal', province: 'QC' } // Quebec region
  } else if (lat >= 43.0 && lat <= 47.0 && lng >= -67.0 && lng <= -53.0) {
    return { city: 'Halifax', province: 'NS' } // Maritime region
  }
  
  // Ultimate fallback
  return { city: 'Toronto', province: 'ON' }
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
        
        // Show success message with city name and accuracy
        setError(`✅ Location found: ${locationResult.city}, ${locationResult.province} (±${Math.round(accuracy)}m accuracy)`)
        // Clear success message after 4 seconds
        setTimeout(() => setError(null), 4000)
      } catch (error) {
        console.error('Reverse geocoding failed:', error)
        
        // Use improved coordinate-based estimation
        const estimatedLocation = getLocationEstimate(latitude, longitude)
        
        const gpsLocation: UserLocation = {
          lat: latitude,
          lng: longitude,
          address: `${estimatedLocation.city}, ${estimatedLocation.province}`,
          city: estimatedLocation.city,
          province: estimatedLocation.province,
          accuracy: accuracy < 100 ? 'high' : accuracy < 1000 ? 'medium' : 'low',
          source: 'gps'
        }
        
        onLocationChange(gpsLocation)
        setGpsLoading(false)
        setError(`✅ GPS location: ${estimatedLocation.city}, ${estimatedLocation.province} (±${Math.round(accuracy)}m, estimated from coordinates)`)
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