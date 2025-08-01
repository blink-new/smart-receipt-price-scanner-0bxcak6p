import blink from '../blink/client'
import { BarcodeItem } from '../components/BarcodeDatabase'

export interface OnlineBarcodeResult {
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
  averagePrice: number
  priceRange?: { min: number; max: number }
  size?: string
  weight?: string
  manufacturer?: string
  countryOfOrigin?: string
  lastUpdated: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
}

// Real barcode lookup using multiple online databases
export async function lookupBarcodeOnline(barcode: string): Promise<OnlineBarcodeResult | null> {
  try {
    console.log(`Looking up barcode ${barcode} online...`)
    
    // Search for barcode information across multiple sources
    const searchResults = await blink.data.search(`barcode ${barcode} product information UPC EAN`, {
      type: 'web',
      limit: 10
    })
    
    // Also search for the barcode with "Canada" to get local pricing
    const canadaResults = await blink.data.search(`barcode ${barcode} Canada grocery price`, {
      type: 'web',
      limit: 5
    })
    
    // Use AI to analyze search results and extract product information
    const { object: productData } = await blink.ai.generateObject({
      prompt: `Analyze these search results for barcode ${barcode} and extract comprehensive product information. Look for official product databases, manufacturer websites, and grocery store listings.

General search results:
${searchResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No results found'}

Canadian pricing results:
${canadaResults.organic_results?.map(result => `${result.title}: ${result.snippet}`).join('\n') || 'No Canadian results found'}

Extract all available product information including:
- Product name and brand
- Category and description
- Ingredients if available
- Nutritional information if mentioned
- Current Canadian pricing
- Product specifications (size, weight)
- Manufacturer details

If limited information is found, provide reasonable estimates based on the barcode format and any partial information available. For pricing, use realistic Canadian grocery prices for 2024.

Confidence levels:
- High: Detailed product info found from official sources
- Medium: Basic info found from multiple sources
- Low: Limited info, mostly estimated`,
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
          averagePrice: { type: 'number' },
          priceRange: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' }
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
        required: ['found', 'name', 'category', 'averagePrice', 'confidence']
      }
    })
    
    if (!productData.found) {
      return null
    }
    
    return {
      barcode,
      name: productData.name,
      brand: productData.brand,
      category: productData.category,
      description: productData.description,
      ingredients: productData.ingredients,
      nutritionFacts: productData.nutritionFacts,
      averagePrice: productData.averagePrice,
      priceRange: productData.priceRange,
      size: productData.size,
      weight: productData.weight,
      manufacturer: productData.manufacturer,
      countryOfOrigin: productData.countryOfOrigin,
      lastUpdated: new Date().toISOString(),
      confidence: productData.confidence as 'high' | 'medium' | 'low',
      sources: productData.sources || []
    }
  } catch (error) {
    console.error('Online barcode lookup failed:', error)
    return null
  }
}

// Convert OnlineBarcodeResult to BarcodeItem for compatibility
export function convertToBarcodeItem(onlineResult: OnlineBarcodeResult): BarcodeItem {
  return {
    barcode: onlineResult.barcode,
    name: onlineResult.name,
    brand: onlineResult.brand,
    category: onlineResult.category,
    averagePrice: onlineResult.averagePrice,
    size: onlineResult.size || onlineResult.weight
  }
}