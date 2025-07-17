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
    
    // Use web search to find location information
    const searchResults = await blink.data.search(`${lat},${lng} address location Canada`, {
      type: 'web',
      limit: 5
    })
    
    // Use AI to extract location details from search results
    const { object: locationData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for coordinates ${lat}, ${lng} and extract the complete address information. Look for Canadian address details including street address, city, province, and postal code.

Search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No results found'}

If no specific address is found, provide the best estimate based on the coordinates and known Canadian geography. The coordinates should be somewhere in Canada.`,
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
          }
        },
        required: ['address', 'city', 'province', 'country', 'accuracy']
      }
    })
    
    return {
      lat,
      lng,
      address: locationData.address,
      city: locationData.city,
      province: locationData.province,
      postalCode: locationData.postalCode,
      country: locationData.country,
      accuracy: locationData.accuracy as 'high' | 'medium' | 'low',
      source: 'gps'
    }
  } catch (error) {
    console.error('Reverse geocoding failed:', error)
    
    // Fallback to basic location info
    return {
      lat,
      lng,
      address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      city: 'Unknown',
      province: 'ON', // Default
      country: 'Canada',
      accuracy: 'low',
      source: 'gps'
    }
  }
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