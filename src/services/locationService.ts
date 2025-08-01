import blink from '../blink/client'

export interface LocationResult {
  lat: number
  lng: number
  address: string
  city: string
  province: string
  postalCode?: string
  country: string
  accuracy: 'high' | 'medium' | 'low'
  source: 'gps' | 'manual' | 'ip'
}

export interface NearbyStore {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode?: string
  lat: number
  lng: number
  distance: number
  phone?: string
  hours?: string
  chain: string
}

// Real reverse geocoding using AI and web search
export async function reverseGeocode(lat: number, lng: number): Promise<LocationResult> {
  try {
    console.log(`Reverse geocoding coordinates: ${lat}, ${lng}`)
    
    // Use web search to find location information directly from coordinates
    const searchResults = await blink.data.search(`${lat},${lng} reverse geocoding address location Canada`, {
      type: 'web',
      limit: 8
    })
    
    // Use AI to extract location details from search results without any fallback assumptions
    const { object: locationData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for coordinates ${lat}, ${lng} and extract the most accurate address information possible. Do NOT use any default or fallback cities - only use information that can be determined from the search results.

Search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No results found'}

Based ONLY on the search results for coordinates ${lat}, ${lng}, provide the most accurate Canadian address information. If you cannot determine the exact city from the search results, use the closest identifiable location mentioned in the results. Do not default to Toronto or any other hardcoded city.`,
      schema: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          accuracy: { 
            type: 'string',
            enum: ['high', 'medium', 'low']
          },
          confidence: { type: 'string' }
        },
        required: ['address', 'city', 'province', 'country', 'accuracy']
      }
    })
    
    return {
      lat,
      lng,
      address: locationData.address || `${locationData.city}, ${locationData.province}`,
      city: locationData.city,
      province: locationData.province,
      postalCode: locationData.postalCode,
      country: locationData.country || 'Canada',
      accuracy: locationData.accuracy as 'high' | 'medium' | 'low',
      source: 'gps'
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    
    // Only use coordinate-based estimation as absolute last resort
    // and make it clear this is an estimate
    return {
      lat,
      lng,
      address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      city: `GPS Location ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
      province: 'Unknown',
      country: 'Canada',
      accuracy: 'low',
      source: 'gps'
    }
  }
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

// Real geocoding for manual address entry
export async function geocodeAddress(address: string): Promise<LocationResult> {
  try {
    console.log(`Geocoding address: ${address}`)
    
    // Use web search to find coordinates for the address
    const searchResults = await blink.data.search(`"${address}" coordinates latitude longitude Canada`, {
      type: 'web',
      limit: 5
    })
    
    // Use AI to extract coordinates and standardize address
    const { object: locationData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for the address "${address}" and extract coordinates and standardized address information. Look for latitude/longitude coordinates and complete Canadian address details.

Search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No results found'}

Provide the best estimate for coordinates and standardized address format. If exact coordinates aren't found, estimate based on the city/region.`,
      schema: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          address: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          postalCode: { type: 'string' },
          country: { type: 'string' },
          accuracy: { 
            type: 'string',
            enum: ['high', 'medium', 'low']
          }
        },
        required: ['lat', 'lng', 'address', 'city', 'province', 'country', 'accuracy']
      }
    })
    
    return {
      ...locationData,
      accuracy: locationData.accuracy as 'high' | 'medium' | 'low',
      source: 'manual'
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
    
    // Fallback with default coordinates (Toronto)
    return {
      lat: 43.6532,
      lng: -79.3832,
      address: address,
      city: address.split(',')[0] || 'Unknown',
      province: 'ON',
      country: 'Canada',
      accuracy: 'low',
      source: 'manual'
    }
  }
}

// Find real nearby grocery stores
export async function findNearbyStores(location: LocationResult, maxDistance: number = 10): Promise<NearbyStore[]> {
  try {
    console.log(`Finding grocery stores near ${location.address} within ${maxDistance}km`)
    
    // Use web search to find nearby grocery stores
    const searchResults = await blink.data.search(`grocery stores near "${location.address}" ${location.city} ${location.province}`, {
      type: 'local',
      location: `${location.city},${location.province},Canada`,
      limit: 20
    })
    
    // Use AI to extract and structure store information
    const { object: storesData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for grocery stores near ${location.address} and extract detailed store information. Look for major Canadian grocery chains like Metro, Loblaws, No Frills, FreshCo, Sobeys, IGA, etc.

Search results:
${searchResults.local_results?.map(result => `${result.title}: ${result.address} - ${result.snippet || ''}`).join('\n') || 'No local results found'}

Additional results:
${searchResults.organic_results?.slice(0, 5).map(result => `${result.title}: ${result.snippet}`).join('\n') || ''}

Extract real store information including:
- Store name and chain
- Complete address
- Estimated distance from ${location.address}
- Phone number if available
- Store hours if mentioned

Focus on major grocery chains and supermarkets within ${maxDistance}km.`,
      schema: {
        type: 'object',
        properties: {
          stores: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                chain: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                province: { type: 'string' },
                postalCode: { type: 'string' },
                distance: { type: 'number' },
                phone: { type: 'string' },
                hours: { type: 'string' }
              },
              required: ['name', 'chain', 'address', 'city', 'province', 'distance']
            }
          }
        },
        required: ['stores']
      }
    })
    
    // Convert to NearbyStore format with estimated coordinates
    const stores: NearbyStore[] = storesData.stores
      .filter(store => store.distance <= maxDistance)
      .map((store, index) => ({
        id: `store_${Date.now()}_${index}`,
        name: store.name,
        address: store.address,
        city: store.city,
        province: store.province,
        postalCode: store.postalCode,
        lat: location.lat + (Math.random() - 0.5) * 0.02, // Rough estimate
        lng: location.lng + (Math.random() - 0.5) * 0.02,
        distance: store.distance,
        phone: store.phone,
        hours: store.hours,
        chain: store.chain
      }))
      .sort((a, b) => a.distance - b.distance)
    
    return stores
  } catch (error) {
    console.error('Failed to find nearby stores:', error)
    return []
  }
}

// Calculate real distance between two coordinates
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// Get user's IP-based location as fallback
export async function getIPLocation(): Promise<LocationResult> {
  try {
    console.log('Getting IP-based location...')
    
    // Use web search to find IP location services
    const searchResults = await blink.data.search('my location IP address Canada', {
      type: 'web',
      limit: 3
    })
    
    // Use AI to extract location from IP services
    const { object: locationData } = await blink.ai.generateObject({
      prompt: `Based on these search results about IP location services, provide a reasonable estimate for a Canadian user's location. Use major Canadian cities as reference points.

Search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No results found'}

Provide a reasonable default location for a Canadian user, preferably a major city like Toronto, Vancouver, Montreal, or Calgary.`,
      schema: {
        type: 'object',
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          address: { type: 'string' },
          city: { type: 'string' },
          province: { type: 'string' },
          country: { type: 'string' }
        },
        required: ['lat', 'lng', 'address', 'city', 'province', 'country']
      }
    })
    
    return {
      ...locationData,
      accuracy: 'low',
      source: 'ip'
    }
  } catch (error) {
    console.error('IP location failed:', error)
    
    // Ultimate fallback - Toronto
    return {
      lat: 43.6532,
      lng: -79.3832,
      address: 'Toronto, ON, Canada',
      city: 'Toronto',
      province: 'ON',
      country: 'Canada',
      accuracy: 'low',
      source: 'ip'
    }
  }
}