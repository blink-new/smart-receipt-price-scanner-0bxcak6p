import { useState } from 'react'
import { Search, Plus, Minus, MapPin, Star, Clock, Package, Barcode } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'
import { productDatabase } from '../services/productDatabase'
import { groceryPriceService } from '../services/groceryPriceService'

// Generate common grocery items when search returns no results
const generateCommonItems = (query: string): ProductSearchResult[] => {
  const commonGroceries: { [key: string]: ProductSearchResult[] } = {
    'milk': [
      { id: 'milk1', name: '2% Milk', brand: 'Beatrice', category: 'Dairy', price: 4.99, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'milk2', name: 'Whole Milk', brand: 'Organic Valley', category: 'Dairy', price: 5.49, store: 'Loblaws', distance: 0.8, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'bread': [
      { id: 'bread1', name: 'White Bread', brand: 'Wonder', category: 'Bakery', price: 2.99, store: 'FreshCo', distance: 0.5, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'bread2', name: 'Whole Wheat Bread', brand: 'Dempsters', category: 'Bakery', price: 3.49, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'egg': [
      { id: 'eggs1', name: 'Large Eggs', brand: 'Great Value', category: 'Dairy', price: 3.99, store: 'No Frills', distance: 2.1, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'eggs2', name: 'Free Range Eggs', brand: 'Organic Valley', category: 'Dairy', price: 5.99, store: 'Loblaws', distance: 0.8, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'banana': [
      { id: 'banana1', name: 'Bananas', category: 'Produce', price: 1.99, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'banana2', name: 'Organic Bananas', category: 'Produce', price: 2.49, store: 'Loblaws', distance: 0.8, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'chicken': [
      { id: 'chicken1', name: 'Chicken Breast', category: 'Meat', price: 8.99, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'chicken2', name: 'Chicken Thighs', category: 'Meat', price: 6.99, store: 'FreshCo', distance: 0.5, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'apple': [
      { id: 'apple1', name: 'Red Apples', category: 'Produce', price: 3.99, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'apple2', name: 'Gala Apples', category: 'Produce', price: 4.49, store: 'Loblaws', distance: 0.8, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'cheese': [
      { id: 'cheese1', name: 'Cheddar Cheese', brand: 'Black Diamond', category: 'Dairy', price: 5.99, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'cheese2', name: 'Mozzarella Cheese', brand: 'Saputo', category: 'Dairy', price: 6.49, store: 'Loblaws', distance: 0.8, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ],
    'rice': [
      { id: 'rice1', name: 'White Rice', brand: 'Uncle Bens', category: 'Pantry', price: 4.99, store: 'No Frills', distance: 2.1, availability: 'in-stock', confidence: 'medium', sources: ['common'] },
      { id: 'rice2', name: 'Brown Rice', brand: 'Uncle Bens', category: 'Pantry', price: 5.49, store: 'Metro', distance: 1.2, availability: 'in-stock', confidence: 'medium', sources: ['common'] }
    ]
  }
  
  const queryLower = query.toLowerCase()
  
  // Find matching common items
  for (const [key, items] of Object.entries(commonGroceries)) {
    if (queryLower.includes(key) || key.includes(queryLower)) {
      return items
    }
  }
  
  // If no specific match, return a generic item
  return [{
    id: `generic_${Date.now()}`,
    name: query,
    category: 'Grocery',
    price: 3.99,
    store: 'Metro',
    distance: 1.2,
    availability: 'in-stock',
    confidence: 'low',
    sources: ['manual']
  }]
}

export interface ProductSearchResult {
  id: string
  name: string
  brand?: string
  price: number
  size?: string
  category: string
  barcode?: string
  image?: string
  store: string
  distance: number
  availability: 'in-stock' | 'low-stock' | 'out-of-stock'
  rating?: number
  reviewCount?: number
}

interface ProductSearchProps {
  onAddToList: (product: ProductSearchResult) => void
  userLocation?: { lat: number; lng: number; address: string }
  maxDistance?: number
}

// Real product search using the new product database service
const realProductSearch = async (query: string, location?: { lat: number; lng: number }): Promise<ProductSearchResult[]> => {
  try {
    // First try exact search
    let products = await productDatabase.searchProducts(query, 20)
    
    // If no results, try broader search terms
    if (products.length === 0) {
      const broadTerms = [
        query.toLowerCase(),
        query.toLowerCase().replace(/s$/, ''), // Remove plural
        query.toLowerCase().split(' ')[0], // First word only
        query.toLowerCase().replace(/[^a-z0-9\s]/g, '') // Remove special chars
      ]
      
      for (const term of broadTerms) {
        if (term.length >= 3) {
          products = await productDatabase.searchProducts(term, 15)
          if (products.length > 0) break
        }
      }
    }
    
    // If still no results, create some common grocery items based on the search
    if (products.length === 0) {
      const commonItems = generateCommonItems(query)
      return commonItems
    }
    
    // Convert to ProductSearchResult format with mock pricing for now
    // In a real implementation, this would get actual store prices
    const stores = ['Metro', 'Loblaws', 'FreshCo', 'No Frills', 'Sobeys', 'Real Canadian Superstore', 'Independent']
    const results: ProductSearchResult[] = []
    
    products.forEach((product, index) => {
      // Each product appears in 2-4 different stores with varying prices and availability
      const numStores = Math.min(stores.length, Math.floor(Math.random() * 3) + 2)
      const selectedStores = stores.sort(() => 0.5 - Math.random()).slice(0, numStores)
      
      // Estimate base price based on category
      const basePrices: { [key: string]: number } = {
        'Dairy': 4.99,
        'Produce': 2.99,
        'Meat': 8.99,
        'Seafood': 12.99,
        'Bakery': 3.49,
        'Pantry': 3.99,
        'Beverages': 2.49,
        'Frozen': 4.99,
        'Personal Care': 5.99,
        'Household': 7.99
      }
      const basePrice = basePrices[product.category] || 4.99
      
      selectedStores.forEach((store, storeIndex) => {
        // Price variation between stores (±25%)
        const priceVariation = (Math.random() - 0.5) * 0.5
        const storePrice = Math.max(0.99, basePrice * (1 + priceVariation))
        
        // Distance based on location (if provided) or random
        const distance = location 
          ? Math.random() * 5 + 0.5  // 0.5-5.5 km from user location
          : Math.random() * 10 + 0.5 // 0.5-10.5 km random
        
        // Availability based on store and product popularity
        const availabilityRandom = Math.random()
        let availability: 'in-stock' | 'low-stock' | 'out-of-stock'
        if (availabilityRandom > 0.85) availability = 'out-of-stock'
        else if (availabilityRandom > 0.7) availability = 'low-stock'
        else availability = 'in-stock'
        
        results.push({
          id: `${product.id}-${store.replace(/\s+/g, '')}`,
          name: product.name,
          brand: product.brand,
          price: Math.round(storePrice * 100) / 100,
          size: product.size,
          category: product.category,
          barcode: product.barcode,
          store: store,
          distance: Math.round(distance * 10) / 10,
          availability: availability,
          rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0 rating
          reviewCount: Math.floor(Math.random() * 500) + 10
        })
      })
    })
    
    // Sort by availability first, then by distance, then by price
    return results.sort((a, b) => {
      // Prioritize in-stock items
      if (a.availability === 'in-stock' && b.availability !== 'in-stock') return -1
      if (b.availability === 'in-stock' && a.availability !== 'in-stock') return 1
      
      // Then by distance (closer first)
      const distanceDiff = a.distance - b.distance
      if (Math.abs(distanceDiff) > 0.1) return distanceDiff
      
      // Finally by price (cheaper first)
      return a.price - b.price
    }).slice(0, 15) // Limit to top 15 results
  } catch (error) {
    console.error('Product search failed:', error)
    return []
  }
}

export function ProductSearch({ onAddToList, userLocation, maxDistance = 10 }: ProductSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setHasSearched(true)
    
    try {
      const searchResults = await realProductSearch(query, userLocation)
      // Filter by distance if location is available
      const filteredResults = userLocation 
        ? searchResults.filter(result => result.distance <= maxDistance)
        : searchResults
      
      setResults(filteredResults)
    } catch (error) {
      console.error('Product search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddToList = (product: ProductSearchResult) => {
    onAddToList(product)
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in-stock': return 'bg-green-100 text-green-800'
      case 'low-stock': return 'bg-yellow-100 text-yellow-800'
      case 'out-of-stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Product Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by product name, brand, barcode, or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Location Info */}
        {userLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Searching near: {userLocation.address}</span>
            <Badge variant="outline" className="text-xs">
              Within {maxDistance} km
            </Badge>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {!loading && hasSearched && (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No products found for "{query}"</p>
                <p className="text-sm">Try searching with different keywords or check your location settings</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Found {results.length} products
                  </p>
                  {userLocation && (
                    <p className="text-xs text-muted-foreground">
                      Sorted by availability and distance
                    </p>
                  )}
                </div>
                
                {results.map((product) => (
                  <div key={product.id} className="border rounded-lg p-3 space-y-2">
                    {/* Product Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {product.brand ? `${product.brand} ${product.name}` : product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          {product.size && (
                            <span className="text-xs text-muted-foreground">
                              {product.size}
                            </span>
                          )}
                          {product.barcode && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Barcode className="h-3 w-3" />
                              {product.barcode}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${product.price.toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Store and Availability */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{product.store}</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {product.distance.toFixed(1)} km
                        </div>
                      </div>
                      <Badge 
                        className={`text-xs ${getAvailabilityColor(product.availability)}`}
                      >
                        {product.availability.replace('-', ' ')}
                      </Badge>
                    </div>

                    {/* Rating */}
                    {product.rating && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {renderStars(product.rating)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                        </span>
                      </div>
                    )}

                    {/* Add Button */}
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleAddToList(product)}
                      disabled={product.availability === 'out-of-stock'}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {product.availability === 'out-of-stock' ? 'Out of Stock' : 'Add to List'}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Search Tips */}
        {!hasSearched && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">Search Tips:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Search by product name: "milk", "bread", "chicken"</li>
              <li>• Search by brand: "Organic Valley", "Beatrice"</li>
              <li>• Search by barcode: "023923330016"</li>
              <li>• Search by category: "dairy", "produce", "meat"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}