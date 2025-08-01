import blink from '../blink/client'

export interface ProductInfo {
  barcode: string
  name: string
  brand?: string
  category: string
  description?: string
  ingredients?: string[]
  nutritionFacts?: {
    calories?: number
    fat?: string
    sodium?: string
    carbs?: string
    protein?: string
  }
  images?: string[]
  size?: string
  weight?: string
  manufacturer?: string
  countryOfOrigin?: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
}

export interface ProductSearchResult {
  id: string
  name: string
  brand?: string
  category: string
  barcode?: string
  size?: string
  image?: string
  description?: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
}

// Real product database using multiple APIs and web sources
export class ProductDatabase {
  private static instance: ProductDatabase
  private cache: Map<string, ProductInfo> = new Map()
  private searchCache: Map<string, ProductSearchResult[]> = new Map()

  private constructor() {}

  public static getInstance(): ProductDatabase {
    if (!ProductDatabase.instance) {
      ProductDatabase.instance = new ProductDatabase()
    }
    return ProductDatabase.instance
  }

  // Lookup product by barcode using multiple real APIs
  async lookupByBarcode(barcode: string): Promise<ProductInfo | null> {
    // Check cache first
    if (this.cache.has(barcode)) {
      return this.cache.get(barcode)!
    }

    try {
      console.log(`Looking up barcode ${barcode} in product databases...`)
      
      // Search multiple product databases and APIs
      const searchResults = await blink.data.search(`barcode ${barcode} UPC EAN product database`, {
        type: 'web',
        limit: 15
      })

      // Also search specific product database sites
      const specificResults = await blink.data.search(`site:openfoodfacts.org OR site:upcitemdb.com OR site:barcodelookup.com "${barcode}"`, {
        type: 'web',
        limit: 10
      })

      // Use AI to analyze all search results and extract comprehensive product info
      const { object: productData } = await blink.ai.generateObject({
        prompt: `Analyze these search results for barcode ${barcode} and extract comprehensive product information from official product databases and manufacturer websites.

General search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No general results'}

Specific database results:
${specificResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No database results'}

Extract all available product information including:
- Exact product name and brand
- Category (Dairy, Produce, Meat, Bakery, Pantry, Beverages, etc.)
- Product description
- Ingredients list if available
- Nutritional information if mentioned
- Product specifications (size, weight)
- Manufacturer details
- Country of origin if available

Confidence levels:
- High: Detailed product info found from official databases (OpenFoodFacts, UPCItemDB, etc.)
- Medium: Basic info found from multiple retail sources
- Low: Limited info, mostly estimated from barcode format

If no specific product is found, return found: false.`,
        schema: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            name: { type: 'string' },
            brand: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string' },
            ingredients: {
              type: 'array',
              items: { type: 'string' }
            },
            nutritionFacts: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                fat: { type: 'string' },
                sodium: { type: 'string' },
                carbs: { type: 'string' },
                protein: { type: 'string' }
              }
            },
            size: { type: 'string' },
            weight: { type: 'string' },
            manufacturer: { type: 'string' },
            countryOfOrigin: { type: 'string' },
            confidence: {
              type: 'string',
              enum: ['high', 'medium', 'low']
            },
            sources: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['found', 'confidence']
        }
      })

      if (!productData.found) {
        return null
      }

      const productInfo: ProductInfo = {
        barcode,
        name: productData.name || 'Unknown Product',
        brand: productData.brand,
        category: productData.category || 'General',
        description: productData.description,
        ingredients: productData.ingredients,
        nutritionFacts: productData.nutritionFacts,
        size: productData.size,
        weight: productData.weight,
        manufacturer: productData.manufacturer,
        countryOfOrigin: productData.countryOfOrigin,
        confidence: productData.confidence as 'high' | 'medium' | 'low',
        sources: productData.sources || []
      }

      // Cache the result
      this.cache.set(barcode, productInfo)
      
      return productInfo
    } catch (error) {
      console.error('Barcode lookup failed:', error)
      return null
    }
  }

  // Search products by name, brand, or category
  async searchProducts(query: string, limit: number = 20): Promise<ProductSearchResult[]> {
    const cacheKey = `${query.toLowerCase()}_${limit}`
    
    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!
    }

    try {
      console.log(`Searching products for: "${query}"`)
      
      // Search multiple product databases and grocery sites
      const searchResults = await blink.data.search(`"${query}" grocery product food database`, {
        type: 'web',
        limit: 20
      })

      // Also search specific grocery and product sites
      const groceryResults = await blink.data.search(`site:loblaws.ca OR site:metro.ca OR site:sobeys.com OR site:walmart.ca "${query}" product`, {
        type: 'web',
        limit: 15
      })

      // Use AI to extract product information from search results
      const { object: searchData } = await blink.ai.generateObject({
        prompt: `Analyze these search results for "${query}" and extract a list of distinct grocery products with their details.

General search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No general results'}

Grocery store results:
${groceryResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No grocery results'}

Extract up to ${limit} distinct products, focusing on:
- Exact product names and brands
- Product categories (Dairy, Produce, Meat, Bakery, Pantry, Beverages, etc.)
- Product sizes/weights if available
- Barcodes/UPC codes if mentioned
- Brief descriptions

Avoid duplicates and focus on actual grocery products that match the search query.
Confidence levels:
- High: Product found in official databases or store listings
- Medium: Product found in multiple sources
- Low: Product inferred from limited information`,
        schema: {
          type: 'object',
          properties: {
            products: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  brand: { type: 'string' },
                  category: { type: 'string' },
                  barcode: { type: 'string' },
                  size: { type: 'string' },
                  description: { type: 'string' },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                  },
                  sources: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['name', 'category', 'confidence']
              }
            }
          },
          required: ['products']
        }
      })

      const results: ProductSearchResult[] = searchData.products.map((product, index) => ({
        id: `search_${Date.now()}_${index}`,
        name: product.name,
        brand: product.brand,
        category: product.category,
        barcode: product.barcode,
        size: product.size,
        description: product.description,
        confidence: product.confidence as 'high' | 'medium' | 'low',
        sources: product.sources || []
      }))

      // Cache the results
      this.searchCache.set(cacheKey, results)
      
      return results
    } catch (error) {
      console.error('Product search failed:', error)
      return []
    }
  }

  // Get product suggestions based on category
  async getProductsByCategory(category: string, limit: number = 10): Promise<ProductSearchResult[]> {
    return this.searchProducts(`${category} products grocery`, limit)
  }

  // Get trending/popular products
  async getTrendingProducts(limit: number = 10): Promise<ProductSearchResult[]> {
    const categories = ['dairy', 'produce', 'meat', 'bakery', 'pantry']
    const randomCategory = categories[Math.floor(Math.random() * categories.length)]
    
    return this.searchProducts(`popular ${randomCategory} products grocery store`, limit)
  }

  // Clear caches (useful for testing or memory management)
  clearCache(): void {
    this.cache.clear()
    this.searchCache.clear()
  }

  // Get cache statistics
  getCacheStats(): { barcodeCache: number; searchCache: number } {
    return {
      barcodeCache: this.cache.size,
      searchCache: this.searchCache.size
    }
  }
}

// Export singleton instance
export const productDatabase = ProductDatabase.getInstance()