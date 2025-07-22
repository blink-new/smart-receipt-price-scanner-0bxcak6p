import blink from '../blink/client'
import { NearbyStore } from './locationService'

export interface RealStorePrice {
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
}

export interface RealPriceComparison {
  productName: string
  normalizedName: string
  category: string
  brand?: string
  size?: string
  prices: RealStorePrice[]
  bestPrice: number
  averagePrice: number
  maxSavings: number
  priceRange: { min: number; max: number }
  recommendedStore: string
  lastUpdated: string
}

// Real price comparison using store websites and flyers
export async function getRealPrices(
  productName: string,
  nearbyStores: NearbyStore[],
  maxDistance: number = 10
): Promise<RealPriceComparison> {
  try {
    console.log(`Getting real prices for "${productName}" from ${nearbyStores.length} stores`)
    
    // Filter stores by distance
    const eligibleStores = nearbyStores.filter(store => store.distance <= maxDistance)
    
    if (eligibleStores.length === 0) {
      throw new Error(`No stores found within ${maxDistance}km`)
    }
    
    // Search for current prices across multiple store websites
    const storeChains = [...new Set(eligibleStores.map(store => store.chain))]
    const searchPromises = storeChains.map(async (chain) => {
      try {
        const searchResults = await blink.data.search(`"${productName}" price ${chain} Canada grocery flyer`, {
          type: 'web',
          limit: 5
        })
        
        return { chain, results: searchResults }
      } catch (error) {
        console.error(`Failed to search prices for ${chain}:`, error)
        return { chain, results: null }
      }
    })
    
    const searchResultsArray = await Promise.all(searchPromises)
    
    // Use AI to analyze search results and extract current prices
    const { object: priceData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for "${productName}" across Canadian grocery stores and extract current pricing information. Look for actual prices from store websites, flyers, and promotional materials.

Store search results:
${searchResultsArray.map(({ chain, results }) => {
  if (!results?.organic_results) return `${chain}: No results found`
  return `${chain}:\n${results.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`
}).join('\n\n')}

Eligible stores in area:
${eligibleStores.map(store => `${store.name} (${store.chain}) - ${store.distance}km - ${store.address}`).join('\n')}

Extract realistic current prices (2024 Canadian market) for this product. Consider:
- Store positioning (No Frills = discount, Metro = premium, etc.)
- Current Canadian grocery inflation
- Seasonal pricing if applicable
- Sale prices vs regular prices
- Product availability
- Regional price variations

Provide prices only for stores that would realistically carry this product.`,
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
                productUrl: { type: 'string' }
              },
              required: ['storeName', 'chain', 'price', 'onSale', 'availability']
            }
          }
        },
        required: ['normalizedName', 'category', 'prices']
      }
    })
    
    // Match AI results with actual store locations
    const realPrices: RealStorePrice[] = priceData.prices
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
          productUrl: priceInfo.productUrl
        }
      })
      .filter((price): price is RealStorePrice => price !== null)
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
    
    return {
      productName,
      normalizedName: priceData.normalizedName,
      category: priceData.category,
      brand: priceData.brand,
      size: priceData.size,
      prices: realPrices,
      bestPrice,
      averagePrice: Math.round(averagePrice * 100) / 100,
      maxSavings: Math.round(maxSavings * 100) / 100,
      priceRange: { min: bestPrice, max: maxPrice },
      recommendedStore,
      lastUpdated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to get real prices:', error)
    throw new Error(`Failed to get real prices for "${productName}". ${error.message}`)
  }
}

// Monitor multiple products for price changes
export async function monitorPriceChanges(
  products: Array<{ name: string; lastKnownPrice?: number }>,
  nearbyStores: NearbyStore[]
): Promise<Array<RealPriceComparison & { priceChange?: { amount: number; percentage: number; isIncrease: boolean } }>> {
  try {
    console.log(`Monitoring price changes for ${products.length} products`)
    
    const results = []
    
    for (const product of products) {
      try {
        const comparison = await getRealPrices(product.name, nearbyStores)
        
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
        
        // Small delay between requests
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

// Find current deals and flash sales
export async function findCurrentDeals(
  nearbyStores: NearbyStore[],
  categories: string[] = ['produce', 'dairy', 'meat', 'pantry']
): Promise<Array<{
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
}>> {
  try {
    console.log('Finding current deals and flash sales...')
    
    const storeChains = [...new Set(nearbyStores.map(store => store.chain))]
    
    // Search for current flyers and deals
    const dealSearches = storeChains.map(async (chain) => {
      try {
        const searchResults = await blink.data.search(`${chain} Canada grocery flyer deals sale this week`, {
          type: 'web',
          limit: 5
        })
        
        return { chain, results: searchResults }
      } catch (error) {
        console.error(`Failed to search deals for ${chain}:`, error)
        return { chain, results: null }
      }
    })
    
    const dealResults = await Promise.all(dealSearches)
    
    // Use AI to extract current deals
    const { object: dealsData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for current grocery deals and sales at Canadian stores. Extract specific products on sale with original and sale prices.

Deal search results:
${dealResults.map(({ chain, results }) => {
  if (!results?.organic_results) return `${chain}: No results found`
  return `${chain}:\n${results.organic_results.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`
}).join('\n\n')}

Focus on categories: ${categories.join(', ')}

Extract realistic current deals typical for Canadian grocery stores. Include:
- Weekly specials
- Clearance items
- Buy-one-get-one offers
- Percentage discounts
- Seasonal sales

Provide realistic Canadian prices for 2024.`,
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
                category: { type: 'string' }
              },
              required: ['product', 'chain', 'originalPrice', 'salePrice', 'category']
            }
          }
        },
        required: ['deals']
      }
    })
    
    // Match deals with nearby stores
    const currentDeals = dealsData.deals
      .map(deal => {
        const matchingStore = nearbyStores.find(store => 
          store.chain.toLowerCase().includes(deal.chain.toLowerCase())
        )
        
        if (!matchingStore) return null
        
        const savings = deal.originalPrice - deal.salePrice
        const savingsPercentage = (savings / deal.originalPrice) * 100
        
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
          distance: matchingStore.distance
        }
      })
      .filter((deal): deal is NonNullable<typeof deal> => deal !== null)
      .filter(deal => categories.includes(deal.category.toLowerCase()))
      .sort((a, b) => b.savingsPercentage - a.savingsPercentage)
    
    return currentDeals
  } catch (error) {
    console.error('Failed to find current deals:', error)
    return []
  }
}