import blink from '../blink/client'

export interface ParsedIngredient {
  name: string
  quantity?: string
  unit?: string
  category?: string
  originalText: string
}

export interface RecipeParseResult {
  title?: string
  ingredients: ParsedIngredient[]
  servings?: number
  source: 'website' | 'image'
  sourceUrl?: string
}

// Real website recipe parsing with multiple recipe detection
export async function parseRecipeFromUrl(url: string): Promise<RecipeParseResult> {
  try {
    console.log('Extracting recipe from URL:', url)
    
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Please enter a valid URL starting with http:// or https://')
    }
    
    // Use Blink's data extraction to get clean text from the website
    const extractedText = await blink.data.extractFromUrl(url)
    
    // First, detect if there are multiple recipes on the page
    const { object: recipeDetection } = await blink.ai.generateObject({
      prompt: `Analyze this webpage content and detect all recipes present. If there are multiple recipes, list them all with their titles. If there's only one recipe, extract it fully.

Webpage content:
${extractedText}

Look for recipe titles, ingredient lists, and cooking instructions to identify distinct recipes.`,
      schema: {
        type: 'object',
        properties: {
          multipleRecipes: { type: 'boolean' },
          recipes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                preview: { type: 'string' },
                servings: { type: 'number' },
                ingredients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'string' },
                      unit: { type: 'string' },
                      category: { 
                        type: 'string',
                        enum: ['produce', 'dairy', 'meat', 'pantry', 'spices', 'condiments', 'bakery', 'frozen', 'other']
                      },
                      originalText: { type: 'string' }
                    },
                    required: ['name', 'originalText']
                  }
                }
              },
              required: ['title', 'ingredients']
            }
          }
        },
        required: ['multipleRecipes', 'recipes']
      }
    })

    if (recipeDetection.multipleRecipes && recipeDetection.recipes.length > 1) {
      // If multiple recipes found, throw a special error with recipe options
      const recipeOptions = recipeDetection.recipes.map((recipe, index) => 
        `${index + 1}. ${recipe.title} (${recipe.ingredients.length} ingredients)${recipe.servings ? ` - Serves ${recipe.servings}` : ''}`
      ).join('\n')
      
      throw new Error(`Multiple recipes found on this page:\n\n${recipeOptions}\n\nPlease use a more specific URL that links directly to one recipe, or try a different recipe URL.`)
    }

    // If single recipe or no recipes found, use the first one or extract normally
    const selectedRecipe = recipeDetection.recipes[0]
    
    if (!selectedRecipe || selectedRecipe.ingredients.length === 0) {
      throw new Error('No recipe found on this page. Please check the URL and ensure it contains a recipe with ingredients.')
    }

    return {
      title: selectedRecipe.title,
      ingredients: selectedRecipe.ingredients,
      servings: selectedRecipe.servings,
      source: 'website',
      sourceUrl: url
    }
  } catch (error) {
    console.error('Failed to parse recipe from URL:', error)
    if (error.message.includes('Multiple recipes found')) {
      throw error // Re-throw the multiple recipes error as-is
    }
    throw new Error(`Failed to extract recipe from ${url}. Please check the URL and try again.`)
  }
}

// Real image recipe parsing
export async function parseRecipeFromImage(imageFile: File): Promise<RecipeParseResult> {
  try {
    console.log('Parsing recipe from image:', imageFile.name)
    
    // Upload image to Blink storage to get a public URL
    const { publicUrl } = await blink.storage.upload(
      imageFile,
      `recipe-images/${Date.now()}-${imageFile.name}`,
      { upsert: true }
    )
    
    // Use AI vision to extract recipe text from the image
    const { text: extractedText } = await blink.ai.generateText({
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract all the text from this recipe image. Include the recipe title, ingredients list with quantities and units, and any cooking instructions. Be very thorough and accurate." 
            },
            { type: "image", image: publicUrl }
          ]
        }
      ]
    })
    
    // Parse the extracted text to structure the ingredients
    const { object: parsedRecipe } = await blink.ai.generateObject({
      prompt: `Parse this extracted recipe text and structure the ingredients with their quantities and units. Also extract the recipe title and servings if available.

Extracted text from image:
${extractedText}

Please be thorough and extract every ingredient mentioned.`,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          servings: { type: 'number' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'string' },
                unit: { type: 'string' },
                category: { 
                  type: 'string',
                  enum: ['produce', 'dairy', 'meat', 'pantry', 'spices', 'condiments', 'bakery', 'frozen', 'other']
                },
                originalText: { type: 'string' }
              },
              required: ['name', 'originalText']
            }
          }
        },
        required: ['ingredients']
      }
    })

    return {
      title: parsedRecipe.title,
      ingredients: parsedRecipe.ingredients,
      servings: parsedRecipe.servings,
      source: 'image',
      sourceUrl: publicUrl
    }
  } catch (error) {
    console.error('Failed to parse recipe from image:', error)
    throw new Error('Failed to extract recipe from image. Please ensure the image contains a clear recipe.')
  }
}

// Parse grocery flyer or shopping website
export async function parseShoppingWebsite(url: string): Promise<ParsedIngredient[]> {
  try {
    console.log('Parsing shopping website:', url)
    
    // Use Blink's web scraping to get structured data
    const { markdown, metadata } = await blink.data.scrape(url)
    
    // Use AI to extract grocery items and prices
    const { object: parsedItems } = await blink.ai.generateObject({
      prompt: `Parse this grocery store website/flyer content and extract all food items with their prices. Focus on actual grocery products, not store information or navigation.

Website content:
${markdown}

Extract items like fruits, vegetables, meat, dairy, pantry items, etc. Include prices when available.`,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: 'string' },
                unit: { type: 'string' },
                category: { 
                  type: 'string',
                  enum: ['produce', 'dairy', 'meat', 'pantry', 'spices', 'condiments', 'bakery', 'frozen', 'other']
                },
                originalText: { type: 'string' }
              },
              required: ['name', 'originalText']
            }
          }
        },
        required: ['items']
      }
    })

    return parsedItems.items.map(item => ({
      name: item.name,
      quantity: item.price ? '1' : undefined,
      unit: item.unit,
      category: item.category,
      originalText: item.originalText
    }))
  } catch (error) {
    console.error('Failed to parse shopping website:', error)
    throw new Error(`Failed to extract items from ${url}. Please check the URL and try again.`)
  }
}

// Enhanced ingredient matching with real product database
export async function matchIngredientsToProducts(ingredients: ParsedIngredient[]): Promise<any[]> {
  try {
    // Use AI to match ingredients to real grocery products
    const { object: matchedProducts } = await blink.ai.generateObject({
      prompt: `Match these recipe ingredients to real grocery store products. For each ingredient, suggest the most common grocery store product that would fulfill that ingredient need, including typical brands and sizes.

Ingredients to match:
${ingredients.map(ing => `- ${ing.originalText} (${ing.name})`).join('\n')}

For each ingredient, provide realistic grocery store product matches with estimated prices in CAD.`,
      schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                ingredientName: { type: 'string' },
                productName: { type: 'string' },
                brand: { type: 'string' },
                size: { type: 'string' },
                estimatedPrice: { type: 'number' },
                category: { type: 'string' },
                barcode: { type: 'string' },
                alternatives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productName: { type: 'string' },
                      brand: { type: 'string' },
                      estimatedPrice: { type: 'number' }
                    }
                  }
                }
              },
              required: ['ingredientName', 'productName', 'estimatedPrice', 'category']
            }
          }
        },
        required: ['products']
      }
    })

    return matchedProducts.products
  } catch (error) {
    console.error('Failed to match ingredients to products:', error)
    return []
  }
}