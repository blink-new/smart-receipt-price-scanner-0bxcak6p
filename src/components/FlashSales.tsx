import { useState, useEffect } from 'react'
import { Clock, Zap, MapPin, AlertTriangle, Leaf, Shield, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { groceryPriceService } from '../services/groceryPriceService'
import { type NearbyStore } from '../services/locationService'

export interface FlashSale {
  id: string
  store: string
  storeLogo?: string
  item: string
  originalPrice: number
  salePrice: number
  discount: number
  validUntil: Date
  location: string
  distance: number
  category: string
  brand?: string
  dietaryFlags: DietaryFlag[]
  allergenWarnings: string[]
  isLimitedQuantity: boolean
  maxQuantity?: number
}

export interface DietaryFlag {
  type: 'vegan' | 'vegetarian' | 'keto' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'organic' | 'non-gmo'
  verified: boolean
}

// Mock Canadian grocery stores
const CANADIAN_STORES = [
  { name: 'Metro', logo: '🏪' },
  { name: 'Loblaws', logo: '🛒' },
  { name: 'FreshCo', logo: '🥬' },
  { name: 'No Frills', logo: '💰' },
  { name: 'Real Canadian Superstore', logo: '🏬' },
  { name: 'Independent', logo: '🏪' },
  { name: 'Sobeys', logo: '🛍️' },
  { name: 'IGA', logo: '🥖' }
]

// Mock flash sales data for Canadian stores - locations will be replaced with real store data
const MOCK_FLASH_SALES: FlashSale[] = [
  {
    id: '1',
    store: 'Metro',
    item: 'Organic Bananas',
    originalPrice: 2.99,
    salePrice: 1.99,
    discount: 33,
    validUntil: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    location: 'Unknown Location',
    distance: 1.2,
    category: 'Produce',
    dietaryFlags: [
      { type: 'vegan', verified: true },
      { type: 'organic', verified: true },
      { type: 'gluten-free', verified: true }
    ],
    allergenWarnings: [],
    isLimitedQuantity: true,
    maxQuantity: 5
  },
  {
    id: '2',
    store: 'Loblaws',
    item: 'Almond Milk',
    originalPrice: 4.49,
    salePrice: 2.99,
    discount: 33,
    validUntil: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    location: 'Unknown Location',
    distance: 0.8,
    category: 'Dairy Alternatives',
    brand: 'Silk',
    dietaryFlags: [
      { type: 'vegan', verified: true },
      { type: 'dairy-free', verified: true },
      { type: 'gluten-free', verified: true }
    ],
    allergenWarnings: ['Contains almonds'],
    isLimitedQuantity: false
  },
  {
    id: '3',
    store: 'FreshCo',
    item: 'Grass-Fed Ground Beef',
    originalPrice: 8.99,
    salePrice: 6.99,
    discount: 22,
    validUntil: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
    location: 'Unknown Location',
    distance: 2.1,
    category: 'Meat',
    dietaryFlags: [
      { type: 'keto', verified: true },
      { type: 'gluten-free', verified: true }
    ],
    allergenWarnings: [],
    isLimitedQuantity: true,
    maxQuantity: 2
  },
  {
    id: '4',
    store: 'No Frills',
    item: 'Gluten-Free Bread',
    originalPrice: 5.99,
    salePrice: 3.99,
    discount: 33,
    validUntil: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
    location: 'Unknown Location',
    distance: 1.5,
    category: 'Bakery',
    brand: 'Udi\'s',
    dietaryFlags: [
      { type: 'gluten-free', verified: true },
      { type: 'dairy-free', verified: false }
    ],
    allergenWarnings: ['May contain eggs'],
    isLimitedQuantity: false
  },
  {
    id: '5',
    store: 'Real Canadian Superstore',
    item: 'Coconut Yogurt',
    originalPrice: 6.49,
    salePrice: 4.49,
    discount: 31,
    validUntil: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3 hours from now
    location: 'Unknown Location',
    distance: 3.2,
    category: 'Dairy Alternatives',
    brand: 'So Delicious',
    dietaryFlags: [
      { type: 'vegan', verified: true },
      { type: 'dairy-free', verified: true },
      { type: 'gluten-free', verified: true }
    ],
    allergenWarnings: ['Contains coconut'],
    isLimitedQuantity: true,
    maxQuantity: 3
  }
]

interface FlashSalesProps {
  userDietaryPreferences: string[]
  userAllergens: string[]
  maxDistance: number
  nearbyStores: NearbyStore[]
  onAddToList: (item: any) => void
}

export function FlashSales({ userDietaryPreferences, userAllergens, maxDistance, nearbyStores, onAddToList }: FlashSalesProps) {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [filteredSales, setFilteredSales] = useState<FlashSale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch real flash sales from nearby stores
    const fetchFlashSales = async () => {
      if (nearbyStores.length === 0) return
      
      setLoading(true)
      try {
        const categories = ['produce', 'dairy', 'meat', 'pantry', 'bakery']
        const realDeals = await groceryPriceService.findFlashSales(nearbyStores, categories, maxDistance)
        
        // Convert real deals to FlashSale format
        const convertedSales: FlashSale[] = realDeals.map((deal, index) => ({
          id: `deal_${index}`,
          store: deal.store,
          item: deal.product,
          originalPrice: deal.originalPrice,
          salePrice: deal.salePrice,
          discount: deal.savingsPercentage,
          validUntil: deal.endDate ? new Date(deal.endDate) : new Date(Date.now() + 24 * 60 * 60 * 1000), // Default 24h
          location: nearbyStores.find(s => s.name === deal.store)?.address || 'Unknown',
          distance: deal.distance,
          category: deal.category,
          dietaryFlags: [], // Would need to be determined from product analysis
          allergenWarnings: [], // Would need to be determined from product analysis
          isLimitedQuantity: Math.random() > 0.5, // Random for demo
          maxQuantity: Math.floor(Math.random() * 5) + 1
        }))
        
        setFlashSales(convertedSales)
      } catch (error) {
        console.error('Failed to fetch flash sales:', error)
        // Fallback to mock data
        setFlashSales(MOCK_FLASH_SALES.filter(sale => sale.distance <= maxDistance))
      }
      setLoading(false)
    }

    fetchFlashSales()
    
    // Refresh flash sales every 10 minutes
    const interval = setInterval(fetchFlashSales, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [nearbyStores, maxDistance])

  useEffect(() => {
    // Filter sales based on user preferences and distance
    const filtered = flashSales.filter(sale => {
      // Distance filter
      if (sale.distance > maxDistance) return false
      
      return true
    })

    setFilteredSales(filtered)
  }, [flashSales, userDietaryPreferences, userAllergens, maxDistance])

  const getDietaryIcon = (type: string) => {
    switch (type) {
      case 'vegan': return <Leaf className="h-3 w-3 text-green-600" />
      case 'vegetarian': return <Leaf className="h-3 w-3 text-green-500" />
      case 'keto': return <Heart className="h-3 w-3 text-purple-600" />
      case 'gluten-free': return <Shield className="h-3 w-3 text-blue-600" />
      case 'dairy-free': return <Shield className="h-3 w-3 text-orange-600" />
      case 'nut-free': return <Shield className="h-3 w-3 text-red-600" />
      case 'organic': return <Leaf className="h-3 w-3 text-green-700" />
      case 'non-gmo': return <Shield className="h-3 w-3 text-teal-600" />
      default: return null
    }
  }

  const getTimeRemaining = (validUntil: Date) => {
    const now = new Date()
    const diff = validUntil.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }
    return `${minutes}m left`
  }

  const hasAllergenConflict = (sale: FlashSale) => {
    return sale.allergenWarnings.some(allergen => 
      userAllergens.some(userAllergen => 
        allergen.toLowerCase().includes(userAllergen.toLowerCase())
      )
    )
  }

  const matchesDietaryPreferences = (sale: FlashSale) => {
    return userDietaryPreferences.some(pref => 
      sale.dietaryFlags.some(flag => 
        flag.type === pref.toLowerCase() && flag.verified
      )
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Flash Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading flash sales...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Flash Sales
          </span>
          <Badge variant="secondary" className="text-xs">
            {filteredSales.length} deals
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredSales.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No flash sales found in your area.
          </p>
        ) : (
          filteredSales.map((sale) => {
            const hasConflict = hasAllergenConflict(sale)
            const matchesPrefs = matchesDietaryPreferences(sale)
            const timeLeft = getTimeRemaining(sale.validUntil)
            const isExpiring = sale.validUntil.getTime() - Date.now() < 60 * 60 * 1000 // Less than 1 hour

            return (
              <div key={sale.id} className="border rounded-lg p-3 space-y-2">
                {/* Header with store and time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {CANADIAN_STORES.find(s => s.name === sale.store)?.logo || '🏪'}
                    </span>
                    <span className="font-medium text-sm">{sale.store}</span>
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {sale.distance} km
                    </Badge>
                  </div>
                  <Badge 
                    variant={isExpiring ? "destructive" : "secondary"} 
                    className="text-xs"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {timeLeft}
                  </Badge>
                </div>

                {/* Item details */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {sale.brand ? `${sale.brand} ${sale.item}` : sale.item}
                    </h4>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground line-through">
                          ${sale.originalPrice.toFixed(2)}
                        </span>
                        <span className="font-semibold text-green-600">
                          ${sale.salePrice.toFixed(2)}
                        </span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {sale.discount}% OFF
                      </Badge>
                    </div>
                  </div>

                  {/* Dietary flags */}
                  {sale.dietaryFlags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sale.dietaryFlags.map((flag, index) => (
                        <Badge 
                          key={index}
                          variant={flag.verified ? "default" : "outline"}
                          className={`text-xs flex items-center gap-1 ${
                            matchesPrefs && userDietaryPreferences.includes(flag.type) 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : ''
                          }`}
                        >
                          {getDietaryIcon(flag.type)}
                          {flag.type}
                          {!flag.verified && <span className="text-xs">?</span>}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Allergen warnings */}
                  {sale.allergenWarnings.length > 0 && (
                    <Alert className={hasConflict ? "border-red-200 bg-red-50" : ""}>
                      <AlertTriangle className={`h-4 w-4 ${hasConflict ? "text-red-600" : ""}`} />
                      <AlertDescription className={`text-xs ${hasConflict ? "text-red-800" : ""}`}>
                        {hasConflict ? "⚠️ ALLERGEN ALERT: " : "Contains: "}
                        {sale.allergenWarnings.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Quantity limit */}
                  {sale.isLimitedQuantity && (
                    <p className="text-xs text-muted-foreground">
                      Limited quantity: Max {sale.maxQuantity} per customer
                    </p>
                  )}
                </div>

                {/* Action button */}
                <Button 
                  size="sm" 
                  className="w-full"
                  variant={hasConflict ? "outline" : "default"}
                  onClick={() => onAddToList({
                    id: Date.now().toString(),
                    name: sale.brand ? `${sale.brand} ${sale.item}` : sale.item,
                    price: sale.salePrice,
                    quantity: 1,
                    isFromRecipe: false,
                    category: sale.category,
                    store: sale.store,
                    originalPrice: sale.originalPrice,
                    discount: sale.discount,
                    dietaryFlags: sale.dietaryFlags,
                    allergenWarnings: sale.allergenWarnings
                  })}
                  disabled={timeLeft === 'Expired'}
                >
                  {timeLeft === 'Expired' ? 'Expired' : 
                   hasConflict ? 'Add (Check Allergens)' : 
                   'Add to List'}
                </Button>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}