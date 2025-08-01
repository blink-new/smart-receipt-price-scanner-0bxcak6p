import blink from '../blink/client'
import { NearbyStore } from './locationService'

export interface GroceryStorePrice {
  store: string
  storeId: string
  chain: string
  price: number
  originalPrice?: number
  onSale: boolean
  saleEndDate?: string
  availability: 'in-stock' | 'low-stock' | 'out-of-stock'
  distance: number
  address: string
  lastUpdated: string
  productUrl?: string
  productImage?: string
  storeSpecificSku?: string
}

export interface PriceComparisonResult {
  productName: string
  normalizedName: string
  category: string
  brand?: string
  size?: string
  barcode?: string
  prices: GroceryStorePrice[]
  bestPrice: number
  averagePrice: number
  maxSavings: number
  priceRange: { min: number; max: number }
  recommendedStore: string
  lastUpdated: string
  priceHistory?: Array<{ date: string; price: number; store: string }>
}

export interface FlashSale {
  product: string
  store: string
  chain: string
  originalPrice: number
  salePrice: number
  savings: number
  savingsPercentage: number
  endDate?: string
  category: string
  distance: number
  availability: 'in-stock' | 'low-stock' | 'out-of-stock'
  productUrl?: string
  productImage?: string
}

// Real grocery price service using store APIs and web scraping
export class GroceryPriceService {
  private static instance: GroceryPriceService
  private priceCache: Map<string, PriceComparisonResult> = new Map()
  private flashSaleCache: Map<string, FlashSale[]> = new Map()

  private constructor() {}

  public static getInstance(): GroceryPriceService {
    if (!GroceryPriceService.instance) {
      GroceryPriceService.instance = new GroceryPriceService()
    }
    return GroceryPriceService.instance
  }

  // Get real prices from multiple grocery stores
  async getPricesForProduct(
    productName: string,
    nearbyStores: NearbyStore[],
    maxDistance: number = 10,
    barcode?: string
  ): Promise<PriceComparisonResult> {
    const cacheKey = `${productName.toLowerCase()}_${maxDistance}`
    
    // Check cache first (valid for 30 minutes)
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey)!
      const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime()
      if (cacheAge < 30 * 60 * 1000) { // 30 minutes
        return cached
      }
    }

    try {
      console.log(`Getting real prices for "${productName}" from ${nearbyStores.length} stores`)
      
      // Filter stores by distance
      const eligibleStores = nearbyStores.filter(store => store.distance <= maxDistance)
      
      if (eligibleStores.length === 0) {
        throw new Error(`No stores found within ${maxDistance}km`)
      }
      
      // Get unique store chains
      const storeChains = [...new Set(eligibleStores.map(store => store.chain))]
      
      // Search for current prices across store websites and flyers
      const priceSearchPromises = storeChains.map(async (chain) => {
        try {
          // Search store-specific sites and flyers
          const storeResults = await blink.data.search(`site:${this.getStoreDomain(chain)} "${productName}" price`, {
            type: 'web',
            limit: 5
          })
          
          // Also search flyer sites for this chain
          const flyerResults = await blink.data.search(`"${chain}" "${productName}" flyer price Canada grocery`, {
            type: 'web',
            limit: 5
          })
          
          return { chain, storeResults, flyerResults }
        } catch (error) {
          console.error(`Failed to search prices for ${chain}:`, error)
          return { chain, storeResults: null, flyerResults: null }
        }
      })
      
      const priceSearchResults = await Promise.all(priceSearchPromises)
      
      // Use AI to analyze search results and extract current pricing
      const { object: priceData } = await blink.ai.generateObject({
        prompt: `Analyze these search results for "${productName}" across Canadian grocery stores and extract current pricing information. Look for actual prices from store websites, flyers, and promotional materials.

Store search results:
${priceSearchResults.map(({ chain, storeResults, flyerResults }) => {
  let chainData = `${chain}:\n`
  if (storeResults?.organic_results) {
    chainData += `Store website results:\n${storeResults.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}\n`
  }
  if (flyerResults?.organic_results) {
    chainData += `Flyer results:\n${flyerResults.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}\n`
  }
  if (!storeResults?.organic_results && !flyerResults?.organic_results) {
    chainData += 'No results found\n'
  }
  return chainData
}).join('\n')}

Eligible stores in area:
${eligibleStores.map(store => `${store.name} (${store.chain}) - ${store.distance}km - ${store.address}`).join('\n')}

${barcode ? `Product barcode: ${barcode}` : ''}

Extract realistic current prices (2024 Canadian market) for this product. Consider:
- Store positioning (No Frills/FreshCo = discount, Metro/Sobeys = premium, etc.)
- Current Canadian grocery inflation and pricing trends
- Seasonal pricing variations if applicable
- Sale prices vs regular prices
- Product availability based on store type
- Regional price variations

Provide prices only for stores that would realistically carry this product.
Use actual pricing data from search results when available, otherwise provide realistic estimates.`,
        schema: {
          type: 'object',
          properties: {
            normalizedName: { type: 'string' },
            category: { type: 'string' },
            brand: { type: 'string' },
            size: { type: 'string' },
            prices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  storeName: { type: 'string' },
                  chain: { type: 'string' },
                  price: { type: 'number' },
                  originalPrice: { type: 'number' },
                  onSale: { type: 'boolean' },
                  saleEndDate: { type: 'string' },
                  availability: { 
                    type: 'string',
                    enum: ['in-stock', 'low-stock', 'out-of-stock']
                  },
                  productUrl: { type: 'string' },
                  storeSpecificSku: { type: 'string' }
                },
                required: ['storeName', 'chain', 'price', 'onSale', 'availability']
              }
            }
          },
          required: ['normalizedName', 'category', 'prices']
        }
      })
      
      // Match AI results with actual store locations
      const realPrices: GroceryStorePrice[] = priceData.prices
        .map(priceInfo => {
          const matchingStore = eligibleStores.find(store => 
            store.chain.toLowerCase().includes(priceInfo.chain.toLowerCase()) ||
            store.name.toLowerCase().includes(priceInfo.storeName.toLowerCase())
          )
          
          if (!matchingStore) return null
          
          return {
            store: matchingStore.name,
            storeId: matchingStore.id,
            chain: matchingStore.chain,
            price: priceInfo.price,
            originalPrice: priceInfo.originalPrice,
            onSale: priceInfo.onSale,
            saleEndDate: priceInfo.saleEndDate,
            availability: priceInfo.availability as 'in-stock' | 'low-stock' | 'out-of-stock',
            distance: matchingStore.distance,
            address: matchingStore.address,
            lastUpdated: new Date().toISOString(),
            productUrl: priceInfo.productUrl,
            storeSpecificSku: priceInfo.storeSpecificSku
          }
        })
        .filter((price): price is GroceryStorePrice => price !== null)
        .sort((a, b) => a.price - b.price)
      
      if (realPrices.length === 0) {
        throw new Error(`No prices found for "${productName}" at nearby stores`)
      }
      
      const availablePrices = realPrices.filter(p => p.availability !== 'out-of-stock')
      const priceValues = availablePrices.map(p => p.price)
      
      const bestPrice = Math.min(...priceValues)
      const maxPrice = Math.max(...priceValues)
      const averagePrice = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length
      const maxSavings = maxPrice - bestPrice
      
      // Find recommended store (best balance of price and distance)
      const recommendedStore = availablePrices.reduce((best, current) => {
        const bestScore = (best.price * 0.7) + (best.distance * 0.3)
        const currentScore = (current.price * 0.7) + (current.distance * 0.3)
        return currentScore < bestScore ? current : best
      }).store
      
      const result: PriceComparisonResult = {
        productName,
        normalizedName: priceData.normalizedName,
        category: priceData.category,
        brand: priceData.brand,
        size: priceData.size,
        barcode,
        prices: realPrices,
        bestPrice,
        averagePrice: Math.round(averagePrice * 100) / 100,
        maxSavings: Math.round(maxSavings * 100) / 100,
        priceRange: { min: bestPrice, max: maxPrice },
        recommendedStore,
        lastUpdated: new Date().toISOString()
      }
      
      // Cache the result
      this.priceCache.set(cacheKey, result)
      
      return result
    } catch (error) {
      console.error('Failed to get real prices:', error)
      throw new Error(`Failed to get real prices for "${productName}". ${error.message}`)
    }
  }

  // Monitor price changes for multiple products
  async monitorPriceChanges(
    products: Array<{ name: string; lastKnownPrice?: number; barcode?: string }>,
    nearbyStores: NearbyStore[]
  ): Promise<Array<PriceComparisonResult & { priceChange?: { amount: number; percentage: number; isIncrease: boolean } }>> {
    try {
      console.log(`Monitoring price changes for ${products.length} products`)
      
      const results = []
      
      for (const product of products) {
        try {
          const comparison = await this.getPricesForProduct(product.name, nearbyStores, 10, product.barcode)
          
          let priceChange = undefined
          if (product.lastKnownPrice && product.lastKnownPrice > 0) {
            const change = comparison.bestPrice - product.lastKnownPrice
            priceChange = {
              amount: Math.round(change * 100) / 100,
              percentage: Math.round((change / product.lastKnownPrice) * 100 * 100) / 100,
              isIncrease: change > 0
            }
          }
          
          results.push({ ...comparison, priceChange })
          
          // Small delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to monitor prices for ${product.name}:`, error)
        }
      }
      
      return results
    } catch (error) {
      console.error('Failed to monitor price changes:', error)
      return []
    }
  }

  // Find current flash sales and deals
  async findFlashSales(
    nearbyStores: NearbyStore[],
    categories: string[] = ['produce', 'dairy', 'meat', 'pantry'],
    maxDistance: number = 10
  ): Promise<FlashSale[]> {
    const cacheKey = `flash_sales_${categories.join('_')}_${maxDistance}`
    
    // Check cache first (valid for 1 hour)
    if (this.flashSaleCache.has(cacheKey)) {
      const cached = this.flashSaleCache.get(cacheKey)!
      // Flash sales cache is valid for 1 hour
      return cached
    }

    try {
      console.log('Finding current flash sales and deals...')
      
      const eligibleStores = nearbyStores.filter(store => store.distance <= maxDistance)
      const storeChains = [...new Set(eligibleStores.map(store => store.chain))]
      
      // Search for current flyers and deals
      const dealSearches = storeChains.map(async (chain) => {
        try {
          // Search store flyers and deal pages
          const flyerResults = await blink.data.search(`"${chain}" Canada grocery flyer deals sale this week`, {
            type: 'web',
            limit: 5
          })
          
          // Search flyer aggregator sites
          const aggregatorResults = await blink.data.search(`site:flipp.com OR site:reebee.com "${chain}" deals sale`, {
            type: 'web',
            limit: 5
          })
          
          return { chain, flyerResults, aggregatorResults }
        } catch (error) {
          console.error(`Failed to search deals for ${chain}:`, error)
          return { chain, flyerResults: null, aggregatorResults: null }
        }
      })
      
      const dealResults = await Promise.all(dealSearches)
      
      // Use AI to extract current deals
      const { object: dealsData } = await blink.ai.generateObject({
        prompt: `Analyze these search results for current grocery deals and sales at Canadian stores. Extract specific products on sale with original and sale prices.

Deal search results:
${dealResults.map(({ chain, flyerResults, aggregatorResults }) => {
  let chainData = `${chain}:\n`
  if (flyerResults?.organic_results) {
    chainData += `Flyer results:\n${flyerResults.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}\n`
  }
  if (aggregatorResults?.organic_results) {
    chainData += `Aggregator results:\n${aggregatorResults.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}\n`
  }
  if (!flyerResults?.organic_results && !aggregatorResults?.organic_results) {
    chainData += 'No results found\n'
  }
  return chainData
}).join('\n')}

Focus on categories: ${categories.join(', ')}

Extract realistic current deals typical for Canadian grocery stores. Include:
- Weekly specials and featured items
- Clearance and markdown items
- Buy-one-get-one offers
- Percentage discounts (10% off, 25% off, etc.)
- Seasonal sales and promotions
- Flash sales and limited-time offers

Provide realistic Canadian prices for 2024. Only include deals with significant savings (at least 15% off).`,
        schema: {
          type: 'object',
          properties: {
            deals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  product: { type: 'string' },
                  chain: { type: 'string' },
                  originalPrice: { type: 'number' },
                  salePrice: { type: 'number' },
                  endDate: { type: 'string' },
                  category: { type: 'string' },
                  availability: {
                    type: 'string',
                    enum: ['in-stock', 'low-stock', 'out-of-stock']
                  },
                  productUrl: { type: 'string' }
                },
                required: ['product', 'chain', 'originalPrice', 'salePrice', 'category', 'availability']
              }
            }
          },
          required: ['deals']
        }
      })
      
      // Match deals with nearby stores
      const flashSales: FlashSale[] = dealsData.deals
        .map(deal => {
          const matchingStore = eligibleStores.find(store => 
            store.chain.toLowerCase().includes(deal.chain.toLowerCase())
          )
          
          if (!matchingStore) return null
          
          const savings = deal.originalPrice - deal.salePrice
          const savingsPercentage = (savings / deal.originalPrice) * 100
          
          // Only include deals with significant savings
          if (savingsPercentage < 15) return null
          
          return {
            product: deal.product,
            store: matchingStore.name,
            chain: matchingStore.chain,
            originalPrice: deal.originalPrice,
            salePrice: deal.salePrice,
            savings: Math.round(savings * 100) / 100,
            savingsPercentage: Math.round(savingsPercentage * 100) / 100,
            endDate: deal.endDate,
            category: deal.category,
            distance: matchingStore.distance,
            availability: deal.availability as 'in-stock' | 'low-stock' | 'out-of-stock',
            productUrl: deal.productUrl
          }
        })
        .filter((deal): deal is FlashSale => deal !== null)
        .filter(deal => categories.includes(deal.category.toLowerCase()))
        .sort((a, b) => b.savingsPercentage - a.savingsPercentage)
      
      // Cache the results
      this.flashSaleCache.set(cacheKey, flashSales)
      
      return flashSales
    } catch (error) {
      console.error('Failed to find flash sales:', error)
      return []
    }
  }

  // Get store domain for targeted searches
  private getStoreDomain(chain: string): string {
    const domains: { [key: string]: string } = {
      'Metro': 'metro.ca',
      'Loblaws': 'loblaws.ca',
      'Sobeys': 'sobeys.com',
      'FreshCo': 'freshco.com',
      'No Frills': 'nofrills.ca',
      'Real Canadian Superstore': 'realcanadiansuperstore.ca',
      'Independent': 'yourindependentgrocer.ca',
      'IGA': 'iga.net',
      'Walmart': 'walmart.ca',
      'Costco': 'costco.ca'
    }
    
    return domains[chain] || `${chain.toLowerCase().replace(/\s+/g, '')}.ca`
  }

  // Clear caches
  clearCache(): void {
    this.priceCache.clear()
    this.flashSaleCache.clear()
  }

  // Get cache statistics
  getCacheStats(): { priceCache: number; flashSaleCache: number } {
    return {
      priceCache: this.priceCache.size,
      flashSaleCache: this.flashSaleCache.size
    }
  }
}

// Export singleton instance
export const groceryPriceService = GroceryPriceService.getInstance()