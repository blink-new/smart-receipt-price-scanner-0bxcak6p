import blink from '../blink/client'
import { productDatabase } from './productDatabase'
import { groceryPriceService } from './groceryPriceService'
import { validateBarcode } from '../components/BarcodeDatabase'

export interface EnhancedBarcodeResult {
  success: boolean
  product?: {
    id: string
    name: string
    brand?: string
    category: string
    price: number
    barcode: string
    size?: string
    confidence: 'high' | 'medium' | 'low'
  }
  error?: string
}

export async function enhancedBarcodeSearch(
  barcode: string, 
  nearbyStores: any[] = [],
  user?: any
): Promise<EnhancedBarcodeResult> {
  try {
    // Validate barcode format first
    if (!validateBarcode(barcode)) {
      return {
        success: false,
        error: `Invalid barcode format: ${barcode}. Please check the barcode and try again.`
      }
    }

    // Try the real product database first
    let productInfo = null
    try {
      productInfo = await productDatabase.lookupByBarcode(barcode)
    } catch (dbError) {
      console.warn('Product database lookup failed:', dbError)
      // Continue to alternative search
    }
    
    if (productInfo) {
      // Get real price estimates if we have location
      let estimatedPrice = 4.99 // Default fallback
      
      if (nearbyStores.length > 0) {
        try {
          const priceComparison = await groceryPriceService.getPricesForProduct(
            productInfo.name, 
            nearbyStores, 
            10, 
            productInfo.barcode
          )
          estimatedPrice = priceComparison.bestPrice
        } catch (priceError) {
          console.warn('Failed to get price comparison:', priceError)
          // Continue with default price
        }
      }
      
      return {
        success: true,
        product: {
          id: Date.now().toString(),
          name: productInfo.brand ? `${productInfo.brand} ${productInfo.name}` : productInfo.name,
          brand: productInfo.brand,
          category: productInfo.category,
          price: estimatedPrice,
          barcode: productInfo.barcode,
          size: productInfo.size,
          confidence: 'high'
        }
      }
    } else {
      // Try alternative search using AI and web search
      try {
        // Use web search to find product information
        const searchResults = await blink.data.search(`barcode ${barcode} product UPC EAN grocery`, {
          type: 'web',
          limit: 5
        })
        
        // Use AI to analyze search results
        const { object: productData } = await blink.ai.generateObject({
          prompt: `Analyze these search results for barcode ${barcode} and extract product information. If you find a real product, provide the name, brand, category, and estimated price. If no product is found, indicate that.\n\nSearch results:\n${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\\n') || 'No results found'}\n\nProvide realistic Canadian grocery pricing if product is found.`,
          schema: {
            type: 'object',
            properties: {
              found: { type: 'boolean' },
              name: { type: 'string' },
              brand: { type: 'string' },
              category: { type: 'string' },
              estimatedPrice: { type: 'number' },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] }
            },
            required: ['found']
          }
        })
        
        if (productData.found && productData.name) {
          return {
            success: true,
            product: {
              id: Date.now().toString(),
              name: productData.brand ? `${productData.brand} ${productData.name}` : productData.name,
              brand: productData.brand,
              category: productData.category || 'Grocery',
              price: productData.estimatedPrice || 4.99,
              barcode: barcode,
              confidence: productData.confidence as 'high' | 'medium' | 'low'
            }
          }
        } else {
          return {
            success: false,
            error: `Product not found for barcode ${barcode}. This might be a store-specific, regional, or discontinued product.`
          }
        }
      } catch (aiError) {
        console.error('AI search failed:', aiError)
        return {
          success: false,
          error: `Failed to find product for barcode ${barcode}. Please check your internet connection.`
        }
      }
    }
  } catch (error) {
    console.error('Barcode lookup failed:', error)
    return {
      success: false,
      error: 'Barcode search failed. Please check your internet connection and try again.'
    }
  }
}