import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Plus, Minus, ShoppingCart, MapPin, AlertCircle, DollarSign, ChefHat, Scan, X, Check, Search, BarChart3, TrendingUp, TrendingDown, Clock, Star, Zap, Settings, Globe, Monitor, Trash2, ChefHat as Recipe, Link, Loader2 } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Input } from './components/ui/input'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Alert, AlertDescription } from './components/ui/alert'
import { Separator } from './components/ui/separator'
import { Switch } from './components/ui/switch'
import { Label } from './components/ui/label'
import { Checkbox } from './components/ui/checkbox'
import { formatBarcode, validateBarcode, generateMockBarcode } from './components/BarcodeDatabase'
import { productDatabase } from './services/productDatabase'
import { groceryPriceService } from './services/groceryPriceService'
import { BarcodeScanner } from './components/BarcodeScanner'
import { RecipeSelector } from './components/RecipeSelector'
import { StoreSelector } from './components/StoreSelector'
import { FlashSales } from './components/FlashSales'
import { DietaryPreferences } from './components/DietaryPreferences'
import { ProductSearch, ProductSearchResult } from './components/ProductSearch'
import { LocationSelector, UserLocation } from './components/LocationSelector'
import { QuickAddList, QuickAddItem } from './components/QuickAddList'
import { FeatureLimitations } from './components/FeatureLimitations'
import { SignInScreen } from './components/SignInScreen'
import { AuthManager } from './components/AuthManager'
import { DatabaseStatus } from './components/DatabaseStatus'
import { parseRecipeFromUrl, parseRecipeFromImage, parseShoppingWebsite, matchIngredientsToProducts, type RecipeParseResult } from './services/recipeParser'
import { compareProductPrices, monitorShoppingListPrices, monitorPriceChanges, type PriceComparisonResult } from './services/priceComparison'
import { findNearbyStores, type NearbyStore } from './services/locationService'
import { type RealPriceComparison } from './services/realPriceService'
import { enhancedBarcodeSearch } from './services/enhancedBarcodeService'
import familySharing, { type FamilyMember, type ShoppingListUpdate } from './services/familySharing'
import multiDeviceSync, { type SyncEvent } from './services/multiDeviceSync'
import blink from './blink/client'

interface PriceHistory {
  date: string
  price: number
  store: string
}

interface ShoppingItem {
  id: string
  name: string
  price: number
  quantity: number
  isFromRecipe: boolean
  barcode?: string
  category?: string
  priceHistory?: PriceHistory[]
  lastPurchasePrice?: number
  lastPurchaseDate?: string
  sourceType?: 'website' | 'camera' | 'upload' | 'manual'
  sourceUrl?: string
  sourceImageUrl?: string
  brand?: string
  size?: string
  isScanned?: boolean
  scannedQuantity?: number
  remainingQuantity?: number
  isInCart?: boolean
  addedByUserId?: string
  addedByUserName?: string
  purchasedByUserId?: string
  purchasedByUserName?: string
  purchasedAt?: string
}

interface SavedShoppingList {
  id: string
  name: string
  date: string
  source?: string
  itemCount: number
  items: ShoppingItem[]
}

interface FamilyMember {
  id: string
  name: string
  email: string
  avatar?: string
  isActive: boolean
  joinedAt: string
}

interface Store {
  id: string
  name: string
  distance: number
  price: number
  availability: 'in-stock' | 'low-stock' | 'out-of-stock'
}

interface PriceComparison {
  itemId: string
  stores: Store[]
  bestPrice: number
  savings: number
}

// MOCK_STORES removed - now using real nearby stores from location service

const TAX_RATES = {
  'ON': 0.13, // Ontario HST
  'BC': 0.12, // BC PST + GST
  'AB': 0.05, // Alberta GST only
  'QC': 0.14975, // Quebec GST + QST
  'NS': 0.15, // Nova Scotia HST
  'NB': 0.15, // New Brunswick HST
  'MB': 0.12, // Manitoba PST + GST
  'SK': 0.11, // Saskatchewan PST + GST
  'PE': 0.15, // PEI HST
  'NL': 0.15, // Newfoundland HST
  'YT': 0.05, // Yukon GST only
  'NT': 0.05, // Northwest Territories GST only
  'NU': 0.05  // Nunavut GST only
}

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('scanner')
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([])
  const [priceComparisons, setPriceComparisons] = useState<PriceComparison[]>([])
  const [selectedState, setSelectedState] = useState<keyof typeof TAX_RATES>('ON')
  const [searchRadius, setSearchRadius] = useState(5)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string>('')
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [isWebsiteScanning, setIsWebsiteScanning] = useState(false)
  const [showSavingsOnly, setShowSavingsOnly] = useState(false)
  const [barcodeSearch, setBarcodeSearch] = useState('')
  const [databaseSize, setDatabaseSize] = useState('∞')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [frequentItems, setFrequentItems] = useState<any[]>([])
  const [trendingItems, setTrendingItems] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([])
  const [allergens, setAllergens] = useState<string[]>([])
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [isScanningShopping, setIsScanningShopping] = useState(false)
  const [scanningItemId, setScanningItemId] = useState<string>('')
  const [recipeUrl, setRecipeUrl] = useState('')
  const [flyerUrl, setFlyerUrl] = useState('')
  const [customSites, setCustomSites] = useState<string[]>(['flipp.com', 'reebee.com', 'flyerland.ca'])
  const [newSite, setNewSite] = useState('')
  const [userLocation, setUserLocation] = useState<UserLocation | undefined>()
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([])
  const [realPriceComparisons, setRealPriceComparisons] = useState<RealPriceComparison[]>([])
  const [shoppingHistory, setShoppingHistory] = useState<any[]>([])
  const [quickAddRemovedItems, setQuickAddRemovedItems] = useState<string[]>([])
  const [savedShoppingLists, setSavedShoppingLists] = useState<SavedShoppingList[]>([])
  const [selectedSavedList, setSelectedSavedList] = useState<string>('')
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeOptions, setRecipeOptions] = useState<any[]>([])
  const [recipeSourceUrl, setRecipeSourceUrl] = useState('')
  const [onlineMembers, setOnlineMembers] = useState<FamilyMember[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Handle authentication state
  useEffect(() => {
    let unsubscribeUpdates: (() => void) | null = null
    let unsubscribePresence: (() => void) | null = null
    let unsubscribeSync: (() => void) | null = null
    let isInitializing = false
    
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      setAuthLoading(state.isLoading)
      
      // Initialize services when user logs in
      if (state.user && !state.isLoading && !isInitializing) {
        isInitializing = true
        
        try {
          console.log('Initializing services for user:', state.user.email)
          
          // Initialize services sequentially to avoid race conditions
          try {
            console.log('Initializing family sharing...')
            await familySharing.initialize(state.user)
            
            // Subscribe to family updates only after successful initialization
            if (familySharing.isReady()) {
              unsubscribeUpdates = familySharing.onShoppingListUpdate((update: ShoppingListUpdate) => {
                setScanResult(`👥 ${update.userName} ${update.type.replace('_', ' ')} ${update.itemName}`)
                // Handle real-time shopping list updates here
              })
              
              unsubscribePresence = familySharing.onPresenceUpdate((members: FamilyMember[]) => {
                setOnlineMembers(members)
              })
            }
          } catch (familyError) {
            console.warn('Family sharing initialization failed:', familyError)
            setScanResult('⚠️ Family sharing unavailable - continuing without it')
          }
          
          try {
            console.log('Initializing multi-device sync...')
            await multiDeviceSync.initialize(state.user)
            
            // Subscribe to multi-device sync events only after successful initialization
            if (multiDeviceSync.isReady()) {
              unsubscribeSync = multiDeviceSync.onSyncEvent((event: SyncEvent) => {
                switch (event.type) {
                  case 'shopping_list_updated':
                    setScanResult(`📱 Shopping list updated from another device`)
                    // Refresh shopping list data
                    break
                  case 'item_added':
                    setScanResult(`📱 Item "${event.data.itemName}" added from another device`)
                    // Add item to local state
                    if (event.data.item) {
                      setShoppingList(prev => [...prev, event.data.item])
                    }
                    break
                  case 'item_removed':
                    setScanResult(`📱 Item removed from another device`)
                    // Remove item from local state
                    if (event.data.itemId) {
                      setShoppingList(prev => prev.filter(item => item.id !== event.data.itemId))
                    }
                    break
                  case 'item_checked':
                    setScanResult(`📱 Item checked/unchecked from another device`)
                    // Update item status in local state
                    if (event.data.itemId) {
                      setShoppingList(prev => prev.map(item => 
                        item.id === event.data.itemId 
                          ? { ...item, isInCart: event.data.isInCart }
                          : item
                      ))
                    }
                    break
                  case 'location_changed':
                    setScanResult(`📱 Location updated from another device`)
                    // Update location if needed
                    break
                }
              })
            }
          } catch (syncError) {
            console.warn('Multi-device sync initialization failed:', syncError)
            setScanResult('⚠️ Multi-device sync unavailable - continuing without it')
          }
          
          console.log('Services initialization completed')
        } catch (error) {
          console.error('Failed to initialize services:', error)
          setScanResult('⚠️ Some features may not work properly due to connection issues')
        } finally {
          isInitializing = false
        }
      } else if (!state.user && !state.isLoading) {
        // Cleanup services on logout
        console.log('Cleaning up services on logout')
        
        if (unsubscribeUpdates) {
          unsubscribeUpdates()
          unsubscribeUpdates = null
        }
        if (unsubscribePresence) {
          unsubscribePresence()
          unsubscribePresence = null
        }
        if (unsubscribeSync) {
          unsubscribeSync()
          unsubscribeSync = null
        }
        
        // Cleanup services
        await Promise.all([
          familySharing.cleanup(),
          multiDeviceSync.cleanup()
        ])
        
        setOnlineMembers([])
        isInitializing = false
      }
    })
    
    // Cleanup function for useEffect
    return () => {
      unsubscribe()
      if (unsubscribeUpdates) {
        unsubscribeUpdates()
      }
      if (unsubscribePresence) {
        unsubscribePresence()
      }
      if (unsubscribeSync) {
        unsubscribeSync()
      }
      // Cleanup services on component unmount
      familySharing.cleanup()
      multiDeviceSync.cleanup()
    }
  }, [])

  // Update nearby stores when location changes
  useEffect(() => {
    if (userLocation) {
      const updateStores = async () => {
        try {
          setScanResult('Finding nearby stores...')
          const stores = await findNearbyStores(userLocation, searchRadius)
          setNearbyStores(stores)
          setScanResult(`✅ Found ${stores.length} nearby stores`)
          
          // Set default store to closest one
          if (stores.length > 0 && !selectedStore) {
            const closestStore = stores.sort((a, b) => a.distance - b.distance)[0]
            setSelectedStore(closestStore.id)
          }
        } catch (error) {
          console.error('Failed to find nearby stores:', error)
          setScanResult('❌ Failed to find nearby stores')
        }
      }
      
      updateStores()
    }
  }, [userLocation, searchRadius, selectedStore])

  // Update price comparisons when stores or shopping list changes
  useEffect(() => {
    if (nearbyStores.length > 0 && shoppingList.length > 0) {
      const updatePriceComparisons = async () => {
        setScanResult('Updating price comparisons with real store data...')
        try {
          const priceUpdates = await monitorPriceChanges(
            shoppingList.map(item => ({ name: item.name, lastKnownPrice: item.price })),
            nearbyStores
          )
          setRealPriceComparisons(priceUpdates)
          setScanResult(`✅ Updated prices for ${priceUpdates.length} items`)
        } catch (error) {
          console.error('Failed to update price comparisons:', error)
          setScanResult('✅ Found stores but price update failed')
        }
      }
      
      updatePriceComparisons()
    }
  }, [nearbyStores, shoppingList])

  // Generate mock price history for an item
  const generateMockPriceHistory = useCallback((currentPrice: number, itemName: string): PriceHistory[] => {
    const history: PriceHistory[] = []
    const stores = ['Metro', 'Loblaws', 'FreshCo', 'No Frills', 'Sobeys']
    const dates = []
    
    // Generate dates for the last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    dates.forEach((date, index) => {
      const store = stores[Math.floor(Math.random() * stores.length)]
      // Create price variation over time (generally increasing with some fluctuation)
      const baseVariation = (index * 0.1) // Slight increase over time
      const randomVariation = (Math.random() - 0.5) * 0.5 // ±$0.25 random variation
      const historicalPrice = Math.max(0.5, currentPrice - baseVariation + randomVariation)
      
      history.push({
        date,
        price: Math.round(historicalPrice * 100) / 100,
        store
      })
    })
    
    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [])

  // Generate price comparisons using real nearby stores
  const generateMockPriceComparisons = useCallback((items: ShoppingItem[]) => {
    if (nearbyStores.length === 0) {
      setPriceComparisons([])
      return
    }

    const comparisons: PriceComparison[] = items.map(item => {
      const stores: Store[] = nearbyStores
        .filter(store => store.distance <= searchRadius)
        .map(store => ({
          id: store.id,
          name: store.name,
          distance: store.distance,
          price: item.price + (Math.random() - 0.5) * 2, // ±$1 variation
          availability: Math.random() > 0.1 ? 'in-stock' : 'low-stock'
        }))

      if (stores.length === 0) {
        return {
          itemId: item.id,
          stores: [],
          bestPrice: item.price,
          savings: 0
        }
      }

      const bestPrice = Math.min(...stores.map(s => s.price))
      const savings = item.price - bestPrice
      
      return {
        itemId: item.id,
        stores: stores.sort((a, b) => a.price - b.price),
        bestPrice,
        savings
      }
    })
    
    setPriceComparisons(comparisons)
  }, [searchRadius, nearbyStores])

  // Update user data from services
  const updateUserData = async () => {
    try {
      // Load trending products from the real database
      const trending = await productDatabase.getTrendingProducts(5)
      setTrendingItems(trending)
      
      // Get cache stats for display
      const stats = productDatabase.getCacheStats()
      console.log('Product database cache stats:', stats)
    } catch (error) {
      console.error('Failed to update user data:', error)
    }
  }

  // Initialize services and load user data
  useEffect(() => {
    updateUserData()
    
    // Default store will be set when nearby stores are loaded
    
    // Load mock shopping history for demonstration
    const mockHistory = [
      {
        id: '1',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
        items: [
          { name: 'Milk', brand: 'Organic Valley', price: 4.99, category: 'Dairy' },
          { name: 'Bread', brand: 'Wonder', price: 2.99, category: 'Bakery' },
          { name: 'Bananas', price: 1.99, category: 'Produce' }
        ]
      },
      {
        id: '2',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
        items: [
          { name: 'Milk', brand: 'Organic Valley', price: 4.79, category: 'Dairy' },
          { name: 'Eggs', brand: 'Great Value', price: 3.99, category: 'Dairy' },
          { name: 'Chicken Breast', price: 7.99, category: 'Meat' }
        ]
      }
    ]
    setShoppingHistory(mockHistory)

    // Load saved shopping lists
    const mockSavedLists: SavedShoppingList[] = [
      {
        id: 'list1',
        name: 'Weekly Groceries',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'Manual',
        itemCount: 8,
        items: [
          { id: '1', name: 'Milk', price: 4.99, quantity: 1, isFromRecipe: false, category: 'Dairy', isInCart: false },
          { id: '2', name: 'Bread', price: 2.99, quantity: 1, isFromRecipe: false, category: 'Bakery', isInCart: false },
          { id: '3', name: 'Eggs', price: 3.99, quantity: 1, isFromRecipe: false, category: 'Dairy', isInCart: false }
        ]
      },
      {
        id: 'list2',
        name: 'Pasta Recipe',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'allrecipes.com',
        itemCount: 6,
        items: [
          { id: '4', name: 'Pasta', price: 1.99, quantity: 1, isFromRecipe: true, category: 'Pantry', isInCart: false },
          { id: '5', name: 'Tomato Sauce', price: 2.49, quantity: 1, isFromRecipe: true, category: 'Pantry', isInCart: false }
        ]
      }
    ]
    setSavedShoppingLists(mockSavedLists)

    // Load mock family members
    const mockFamilyMembers: FamilyMember[] = [
      {
        id: 'member1',
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        avatar: '👩‍🦰',
        isActive: true,
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'member2',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        avatar: '👨‍💼',
        isActive: true,
        joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    setFamilyMembers(mockFamilyMembers)
  }, [])

  // Calculate totals
  const subtotal = shoppingList.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartSubtotal = shoppingList.filter(item => item.isInCart).reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const taxAmount = subtotal * TAX_RATES[selectedState]
  const cartTaxAmount = cartSubtotal * TAX_RATES[selectedState]
  const total = subtotal + taxAmount
  const cartTotal = cartSubtotal + cartTaxAmount

  // Real recipe scanning function using Blink AI
  const realRecipeScan = useCallback(async (file: File, sourceType: 'camera' | 'upload') => {
    setIsScanning(true)
    setScanResult('Processing recipe image with AI...')
    
    try {
      // Clear any previous scan results first
      setScanResult('Processing recipe image with AI...')
      
      // Parse recipe from image using real AI
      const recipeResult = await parseRecipeFromImage(file)
      
      setScanResult('Matching ingredients to grocery products...')
      
      // Match ingredients to real grocery products
      const matchedProducts = await matchIngredientsToProducts(recipeResult.ingredients)
      
      // Convert to shopping list items with unique IDs to prevent conflicts
      const timestamp = Date.now()
      const newItems: ShoppingItem[] = matchedProducts.map((product, index) => {
        const priceHistory = generateMockPriceHistory(product.estimatedPrice, product.productName)
        const lastPurchase = priceHistory[priceHistory.length - 2]
        
        return {
          id: `recipe_${timestamp}_${index}`, // Unique ID with timestamp
          name: product.productName,
          price: product.estimatedPrice,
          quantity: 1,
          isFromRecipe: true,
          category: product.category,
          barcode: product.barcode || generateMockBarcode(),
          brand: product.brand,
          size: product.size,
          priceHistory,
          lastPurchasePrice: lastPurchase?.price,
          lastPurchaseDate: lastPurchase?.date,
          sourceType,
          sourceImageUrl: recipeResult.sourceUrl,
          isScanned: false,
          scannedQuantity: 0,
          remainingQuantity: 1,
          isInCart: false,
          addedByUserId: user?.id,
          addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
        }
      })
      
      // Replace any existing recipe items from the same source or add to list
      setShoppingList(prev => {
        // Remove any items from the same source type to prevent duplicates
        const filteredList = prev.filter(item => 
          !(item.sourceType === sourceType && item.isFromRecipe)
        )
        return [...filteredList, ...newItems]
      })
      
      // Get real price comparisons if location is available
      if (userLocation && newItems.length > 0) {
        setScanResult('Getting real-time price comparisons...')
        try {
          const priceComparisons = await monitorShoppingListPrices(
            newItems.map(item => ({ name: item.name, currentPrice: item.price })),
            userLocation
          )
          // Update items with real price data
          // This would update the price comparisons state
        } catch (error) {
          console.error('Failed to get price comparisons:', error)
        }
      }
      
      setIsScanning(false)
      setScanResult(`✅ Found ${newItems.length} ingredients from ${recipeResult.title || 'recipe'}. ${recipeResult.servings ? `Serves ${recipeResult.servings}.` : ''}`)
      updateUserData()
      setActiveTab('list')
      
      // Broadcast to family members
      if (user && familySharing.isReady()) {
        await familySharing.broadcastUpdate({
          type: 'item_added',
          itemId: 'recipe_items',
          itemName: `${newItems.length} recipe ingredients`,
          userId: user.id,
          userName: user.displayName || user.email?.split('@')[0] || 'You',
          timestamp: new Date().toISOString(),
          data: { source: 'recipe_scan', sourceType, itemCount: newItems.length }
        })
      }
    } catch (error) {
      setIsScanning(false)
      setScanResult(`❌ ${error.message}`)
      console.error('Recipe scanning failed:', error)
    }
  }, [generateMockPriceHistory, userLocation, user])

  // Real website scanning function using Blink data extraction
  const realWebsiteScan = useCallback(async (specificUrl?: string) => {
    setIsWebsiteScanning(true)
    
    try {
      if (specificUrl) {
        setScanResult(`Extracting items from ${specificUrl}...`)
        
        // Parse specific website URL
        const ingredients = await parseShoppingWebsite(specificUrl)
        
        setScanResult('Matching items to grocery products...')
        
        // Match to real products
        const matchedProducts = await matchIngredientsToProducts(ingredients)
        
        // Convert to shopping list items
        const websiteItems: ShoppingItem[] = matchedProducts.map((product, index) => {
          const priceHistory = generateMockPriceHistory(product.estimatedPrice, product.productName)
          const lastPurchase = priceHistory[priceHistory.length - 2]
          
          return {
            id: (Date.now() + index).toString(),
            name: product.productName,
            price: product.estimatedPrice,
            quantity: 1,
            isFromRecipe: true,
            category: product.category,
            barcode: product.barcode || generateMockBarcode(),
            brand: product.brand,
            size: product.size,
            priceHistory,
            lastPurchasePrice: lastPurchase?.price,
            lastPurchaseDate: lastPurchase?.date,
            sourceType: 'website',
            sourceUrl: specificUrl,
            isScanned: false,
            scannedQuantity: 0,
            remainingQuantity: 1,
            isInCart: false
          }
        })
        
        setShoppingList(prev => [...prev, ...websiteItems])
        
        // Get real price comparisons if location is available
        if (userLocation && websiteItems.length > 0) {
          setScanResult('Getting real-time price comparisons...')
          try {
            const priceComparisons = await monitorShoppingListPrices(
              websiteItems.map(item => ({ name: item.name, currentPrice: item.price })),
              userLocation
            )
            // Update price comparisons with real data
            generateMockPriceComparisons(websiteItems)
          } catch (error) {
            console.error('Failed to get price comparisons:', error)
          }
        }
        
        setIsWebsiteScanning(false)
        setScanResult(`✅ Found ${websiteItems.length} items from ${specificUrl}`)
        updateUserData()
        setActiveTab('list')
      } else {
        // For scanning "open browser pages", check if we can access browser tabs
        setScanResult('Checking for open browser tabs with recipes...')
        
        // Since we can't actually access browser tabs due to security restrictions,
        // inform the user about this limitation
        setIsWebsiteScanning(false)
        setScanResult(`❌ No open web pages detected.\\n\\nDue to browser security restrictions, we cannot access your open tabs. Instead:\\n\\n1. Copy the URL of any recipe page you have open\\n2. Paste it in the "Scan Recipe URL" section above\\n3. Or use the "Scan Grocery Flyer" section for shopping websites\\n\\nThis will give you the same functionality with better accuracy!`)
      }
    } catch (error) {
      setIsWebsiteScanning(false)
      setScanResult(`❌ ${error.message}`)
      console.error('Website scanning failed:', error)
    }
  }, [generateMockPriceComparisons, generateMockPriceHistory, userLocation])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      realRecipeScan(file, 'upload')
    }
  }

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      realRecipeScan(file, 'camera')
    }
  }

  const addCustomItem = async () => {
    if (newItemName) {
      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        name: newItemName,
        price: newItemPrice ? parseFloat(newItemPrice) : 0, // Allow items without price
        quantity: 1,
        isFromRecipe: false,
        sourceType: 'manual',
        isScanned: false,
        scannedQuantity: 0,
        remainingQuantity: 1,
        isInCart: false,
        addedByUserId: user?.id,
        addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
      }
      setShoppingList(prev => [...prev, newItem])
      setNewItemName('')
      setNewItemPrice('')

      // Broadcast sync event to other devices
      if (multiDeviceSync.isReady()) {
        await multiDeviceSync.broadcastSyncEvent({
          type: 'item_added',
          data: {
            item: newItem,
            itemName: newItem.name
          }
        })
      }
    }
  }

  // Enhanced barcode lookup using real product database
  const enhancedBarcodeSearch = async (barcode: string) => {
    setScanResult('Searching online product databases...')
    
    try {
      // Use the real product database to lookup barcode
      const productInfo = await productDatabase.lookupByBarcode(barcode)
      
      if (productInfo) {
        // Get real price estimates if we have location
        let estimatedPrice = 4.99 // Default fallback
        
        if (nearbyStores.length > 0) {
          try {
            setScanResult('Getting price estimates from nearby stores...')
            const priceComparison = await groceryPriceService.getPricesForProduct(
              productInfo.name, 
              nearbyStores, 
              10, 
              productInfo.barcode
            )
            estimatedPrice = priceComparison.bestPrice
            setRealPriceComparisons(prev => [...prev, priceComparison])
          } catch (priceError) {
            console.warn('Failed to get price comparison:', priceError)
            // Continue with default price
          }
        }
        
        // Add to shopping list
        const newItem: ShoppingItem = {
          id: Date.now().toString(),
          name: productInfo.brand ? `${productInfo.brand} ${productInfo.name}` : productInfo.name,
          price: estimatedPrice,
          quantity: 1,
          isFromRecipe: false,
          category: productInfo.category,
          barcode: productInfo.barcode,
          sourceType: 'manual',
          brand: productInfo.brand,
          size: productInfo.size,
          isInCart: false,
          addedByUserId: user?.id,
          addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
        }
        setShoppingList(prev => [...prev, newItem])
        
        setScanResult(`✅ Found and added: ${productInfo.name}${productInfo.brand ? ` (${productInfo.brand})` : ''} - ${estimatedPrice.toFixed(2)}`)
        updateUserData()
        
        // Broadcast to family members
        if (user && familySharing.isReady()) {
          await familySharing.broadcastUpdate({
            type: 'item_added',
            itemId: newItem.id,
            itemName: newItem.name,
            userId: user.id,
            userName: user.displayName || user.email?.split('@')[0] || 'You',
            timestamp: new Date().toISOString(),
            data: { source: 'barcode_scan', barcode: barcode }
          })
        }
      } else {
        // Try alternative search using AI if direct barcode lookup fails
        setScanResult('Barcode not found in database, trying alternative search...')
        
        try {
          // Use AI to search for the product by barcode
          const { text: searchResult } = await blink.ai.generateText({
            prompt: `Search for a grocery product with barcode ${barcode}. If you can identify the product, provide the product name, brand, category, and typical size. If you cannot identify it, suggest it might be a store-specific or regional product.`,
            search: true
          })
          
          if (searchResult.toLowerCase().includes('cannot identify') || searchResult.toLowerCase().includes('not found')) {
            setScanResult(`❌ Product not found for barcode ${barcode}. This might be a store-specific or regional product. Try entering the product name manually.`)
          } else {
            // Extract product info from AI response and add as manual item
            const productName = searchResult.split('\n')[0] || `Product ${barcode}`
            
            const newItem: ShoppingItem = {
              id: Date.now().toString(),
              name: productName,
              price: 0, // No price initially
              quantity: 1,
              isFromRecipe: false,
              category: 'Grocery',
              barcode: barcode,
              sourceType: 'manual',
              isInCart: false,
              addedByUserId: user?.id,
              addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
            }
            setShoppingList(prev => [...prev, newItem])
            
            setScanResult(`✅ Added product from barcode ${barcode}: ${productName} (AI identified)`)
          }
        } catch (aiError) {
          setScanResult(`❌ Product not found for barcode ${barcode}. Try entering the product name manually.`)
        }
      }
    } catch (error) {
      console.error('Barcode lookup failed:', error)
      setScanResult(`❌ Failed to lookup barcode ${barcode}. Please check your internet connection and try again.`)
    }
  }

  // Handle product search results
  const handleProductSearchAdd = (product: ProductSearchResult) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: product.brand ? `${product.brand} ${product.name}` : product.name,
      price: product.price,
      quantity: 1,
      isFromRecipe: false,
      category: product.category,
      barcode: product.barcode,
      sourceType: 'manual',
      brand: product.brand,
      size: product.size
    }
    setShoppingList(prev => [...prev, newItem])
    setScanResult(`✅ Added: ${newItem.name} from ${product.store}`)
  }

  // Handle quick add items
  const handleQuickAddItem = (item: QuickAddItem) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: item.brand ? `${item.brand} ${item.name}` : item.name,
      price: item.averagePrice,
      quantity: 1,
      isFromRecipe: false,
      category: item.category,
      sourceType: 'manual',
      brand: item.brand
    }
    setShoppingList(prev => [...prev, newItem])
    setScanResult(`✅ Added: ${newItem.name} from Quick Add`)
  }

  // Handle removing items from quick add list
  const handleRemoveFromQuickAdd = (itemId: string) => {
    setQuickAddRemovedItems(prev => [...prev, itemId])
  }

  const clearAllItems = () => {
    setShoppingList([])
    setPriceComparisons([])
    setScanResult('All items cleared from shopping list')
  }

  const addItemFromBarcode = async (barcode: string) => {
    try {
      const productInfo = await productDatabase.lookupByBarcode(barcode)
      if (productInfo) {
        const newItem: ShoppingItem = {
          id: Date.now().toString(),
          name: productInfo.brand ? `${productInfo.brand} ${productInfo.name}` : productInfo.name,
          price: 4.99, // Default price
          quantity: 1,
          isFromRecipe: false,
          category: productInfo.category,
          barcode: productInfo.barcode,
          sourceType: 'manual',
          brand: productInfo.brand,
          size: productInfo.size
        }
        setShoppingList(prev => [...prev, newItem])
        setBarcodeSearch('')
        updateUserData()
      }
    } catch (error) {
      console.error('Failed to add item from barcode:', error)
    }
  }

  const searchBarcodeDatabase = async () => {
    if (!barcodeSearch.trim()) {
      setScanResult('Please enter a barcode number')
      return
    }

    setScanResult('Searching for product...')
    
    try {
      const result = await enhancedBarcodeSearch(barcodeSearch, nearbyStores, user)
      
      if (result.success && result.product) {
        // Add to shopping list
        const newItem: ShoppingItem = {
          id: result.product.id,
          name: result.product.name,
          price: result.product.price,
          quantity: 1,
          isFromRecipe: false,
          category: result.product.category,
          barcode: result.product.barcode,
          sourceType: 'manual',
          brand: result.product.brand,
          size: result.product.size,
          isInCart: false,
          addedByUserId: user?.id,
          addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
        }
        setShoppingList(prev => [...prev, newItem])
        
        setScanResult(`✅ Found and added: ${result.product.name} - ${result.product.price.toFixed(2)} (${result.product.confidence} confidence)`)
        setBarcodeSearch('')
        updateUserData()
        
        // Broadcast to family members
        if (user && familySharing.isReady()) {
          await familySharing.broadcastUpdate({
            type: 'item_added',
            itemId: newItem.id,
            itemName: newItem.name,
            userId: user.id,
            userName: user.displayName || user.email?.split('@')[0] || 'You',
            timestamp: new Date().toISOString(),
            data: { source: 'barcode_search', barcode: barcodeSearch }
          })
        }
      } else {
        setScanResult(result.error || 'Product not found')
      }
    } catch (error) {
      console.error('Barcode search failed:', error)
      setScanResult('❌ Search failed. Please try again.')
    }
  }

  const updateQuantity = (id: string, change: number) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0))
  }

  const removeItem = async (id: string) => {
    const item = shoppingList.find(i => i.id === id)
    setShoppingList(prev => prev.filter(item => item.id !== id))
    setPriceComparisons(prev => prev.filter(comp => comp.itemId !== id))

    // Broadcast sync event to other devices
    if (item && multiDeviceSync.isReady()) {
      await multiDeviceSync.broadcastSyncEvent({
        type: 'item_removed',
        data: {
          itemId: id,
          itemName: item.name
        }
      })
    }
  }

  const getSignificantSavings = () => {
    return priceComparisons.filter(comp => comp.savings >= comp.bestPrice * 0.1)
  }

  // Calculate price change from last purchase
  const getPriceChange = (item: ShoppingItem) => {
    if (!item.lastPurchasePrice) return null
    
    const change = item.price - item.lastPurchasePrice
    const percentChange = (change / item.lastPurchasePrice) * 100
    
    return {
      amount: change,
      percent: percentChange,
      isIncrease: change > 0,
      isSignificant: Math.abs(percentChange) >= 5 // 5% or more change is significant
    }
  }

  const addItemToList = (item: any) => {
    const newItem: ShoppingItem = {
      id: item.id || Date.now().toString(),
      name: item.name,
      price: item.price,
      quantity: item.quantity || 1,
      isFromRecipe: item.isFromRecipe || false,
      category: item.category,
      barcode: item.barcode,
      brand: item.brand,
      size: item.size,
      isScanned: false,
      scannedQuantity: 0,
      remainingQuantity: item.quantity || 1
    }
    setShoppingList(prev => [...prev, newItem])
    generateMockPriceComparisons([newItem])
  }

  // Add common grocery item without specific product details
  const addCommonItem = (itemName: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: itemName,
      price: 0, // No price initially
      quantity: 1,
      isFromRecipe: false,
      sourceType: 'manual',
      category: 'Grocery',
      isScanned: false,
      scannedQuantity: 0,
      remainingQuantity: 1,
      isInCart: false,
      addedByUserId: user?.id,
      addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
    }
    setShoppingList(prev => [...prev, newItem])
  }

  // Add custom site for scanning
  const addCustomSite = () => {
    if (newSite.trim() && !customSites.includes(newSite.trim())) {
      setCustomSites(prev => [...prev, newSite.trim()])
      setNewSite('')
    }
  }

  // Handle barcode scanner result
  const handleBarcodeScanned = async (barcode: string) => {
    setShowBarcodeScanner(false)
    setBarcodeSearch(barcode)
    
    // Search directly with the scanned barcode
    setScanResult('Searching for product...')
    
    try {
      const result = await enhancedBarcodeSearch(barcode, nearbyStores, user)
      
      if (result.success && result.product) {
        // Add to shopping list
        const newItem: ShoppingItem = {
          id: result.product.id,
          name: result.product.name,
          price: result.product.price,
          quantity: 1,
          isFromRecipe: false,
          category: result.product.category,
          barcode: result.product.barcode,
          sourceType: 'manual',
          brand: result.product.brand,
          size: result.product.size,
          isInCart: false,
          addedByUserId: user?.id,
          addedByUserName: user?.displayName || user?.email?.split('@')[0] || 'You'
        }
        setShoppingList(prev => [...prev, newItem])
        
        setScanResult(`✅ Found and added: ${result.product.name} - ${result.product.price.toFixed(2)} (${result.product.confidence} confidence)`)
        setBarcodeSearch('')
        updateUserData()
        
        // Broadcast to family members
        if (user && familySharing.isReady()) {
          await familySharing.broadcastUpdate({
            type: 'item_added',
            itemId: newItem.id,
            itemName: newItem.name,
            userId: user.id,
            userName: user.displayName || user.email?.split('@')[0] || 'You',
            timestamp: new Date().toISOString(),
            data: { source: 'barcode_scan', barcode: barcode }
          })
        }
      } else {
        setScanResult(result.error || 'Product not found')
      }
    } catch (error) {
      console.error('Barcode search failed:', error)
      setScanResult('❌ Search failed. Please try again.')
    }
  }

  // Toggle item in cart with real-time updates
  const toggleItemInCart = async (id: string) => {
    const item = shoppingList.find(i => i.id === id)
    if (!item) return

    const newIsInCart = !item.isInCart

    setShoppingList(prev => prev.map(listItem => 
      listItem.id === id 
        ? { 
            ...listItem, 
            isInCart: newIsInCart,
            purchasedByUserId: newIsInCart ? user?.id : undefined,
            purchasedByUserName: newIsInCart ? (user?.displayName || user?.email?.split('@')[0] || 'You') : undefined,
            purchasedAt: newIsInCart ? new Date().toISOString() : undefined
          }
        : listItem
    ))

    // Broadcast to family members
    if (user && familySharing.isReady()) {
      await familySharing.broadcastUpdate({
        type: 'item_checked',
        itemId: id,
        itemName: item.name,
        userId: user.id,
        userName: user.displayName || user.email?.split('@')[0] || 'You',
        timestamp: new Date().toISOString(),
        data: { isInCart: newIsInCart }
      })
    }

    // Broadcast sync event to other devices
    if (multiDeviceSync.isReady()) {
      await multiDeviceSync.broadcastSyncEvent({
        type: 'item_checked',
        data: {
          itemId: id,
          itemName: item.name,
          isInCart: newIsInCart
        }
      })
    }
  }

  // Save current shopping list
  const saveCurrentList = () => {
    if (shoppingList.length === 0) return

    const listName = prompt('Enter a name for this shopping list:')
    if (!listName) return

    const newSavedList: SavedShoppingList = {
      id: Date.now().toString(),
      name: listName,
      date: new Date().toISOString(),
      source: shoppingList.some(item => item.isFromRecipe) ? 'Recipe' : 'Manual',
      itemCount: shoppingList.length,
      items: [...shoppingList]
    }

    setSavedShoppingLists(prev => [newSavedList, ...prev])
    setScanResult(`✅ Shopping list "${listName}" saved successfully`)
  }

  // Load saved shopping list
  const loadSavedList = (listId: string) => {
    const savedList = savedShoppingLists.find(list => list.id === listId)
    if (!savedList) return

    // Add items from saved list to current list
    const newItems = savedList.items.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      isInCart: false,
      isScanned: false,
      scannedQuantity: 0,
      remainingQuantity: item.quantity
    }))

    setShoppingList(prev => [...prev, ...newItems])
    setScanResult(`✅ Loaded ${newItems.length} items from "${savedList.name}"`)
    setSelectedSavedList('')
  }

  // Remove custom site
  const removeCustomSite = (site: string) => {
    setCustomSites(prev => prev.filter(s => s !== site))
  }

  // Family member management
  const addFamilyMember = () => {
    if (newMemberEmail.trim() && !familyMembers.some(member => member.email === newMemberEmail.trim())) {
      const newMember: FamilyMember = {
        id: Date.now().toString(),
        name: newMemberEmail.split('@')[0], // Use email prefix as default name
        email: newMemberEmail.trim(),
        avatar: '👤',
        isActive: true,
        joinedAt: new Date().toISOString()
      }
      setFamilyMembers(prev => [...prev, newMember])
      setNewMemberEmail('')
      setScanResult(`✅ Invited ${newMember.email} to family account`)
    }
  }

  const removeFamilyMember = (memberId: string) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== memberId))
    setScanResult('✅ Family member removed')
  }

  // Scan recipe URL with multiple recipe handling
  const scanRecipeUrl = async () => {
    if (recipeUrl.trim()) {
      setIsWebsiteScanning(true)
      setScanResult(`Extracting recipe from ${recipeUrl.trim()}...`)
      
      try {
        // Use Blink's data extraction to get clean text from the website
        const extractedText = await blink.data.extractFromUrl(recipeUrl.trim())
        
        // First, detect if there are multiple recipes on the page
        const { object: recipeDetection } = await blink.ai.generateObject({
          prompt: `Analyze this webpage content and detect all recipes present. If there are multiple recipes, list them all with their titles and ingredients. If there's only one recipe, extract it fully.\n\nWebpage content:\n${extractedText}\n\nLook for recipe titles, ingredient lists, and cooking instructions to identify distinct recipes.`,
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
          // Show recipe selector for multiple recipes
          setRecipeOptions(recipeDetection.recipes)
          setRecipeSourceUrl(recipeUrl.trim())
          setShowRecipeSelector(true)
          setIsWebsiteScanning(false)
          setScanResult(`Found ${recipeDetection.recipes.length} recipes - please select one`)
          return
        }

        // Single recipe processing
        const selectedRecipe = recipeDetection.recipes[0]
        
        if (!selectedRecipe || selectedRecipe.ingredients.length === 0) {
          throw new Error('No recipe found on this page. Please check the URL and ensure it contains a recipe with ingredients.')
        }

        setScanResult('Matching ingredients to grocery products...')
        
        // Match ingredients to real grocery products
        const matchedProducts = await matchIngredientsToProducts(selectedRecipe.ingredients)
        
        // Convert to shopping list items
        const newItems: ShoppingItem[] = matchedProducts.map((product, index) => {
          const priceHistory = generateMockPriceHistory(product.estimatedPrice, product.productName)
          const lastPurchase = priceHistory[priceHistory.length - 2]
          
          return {
            id: (Date.now() + index).toString(),
            name: product.productName,
            price: product.estimatedPrice,
            quantity: 1,
            isFromRecipe: true,
            category: product.category,
            barcode: product.barcode || generateMockBarcode(),
            brand: product.brand,
            size: product.size,
            priceHistory,
            lastPurchasePrice: lastPurchase?.price,
            lastPurchaseDate: lastPurchase?.date,
            sourceType: 'website',
            sourceUrl: recipeUrl.trim(),
            isScanned: false,
            scannedQuantity: 0,
            remainingQuantity: 1,
            isInCart: false
          }
        })
        
        setShoppingList(prev => [...prev, ...newItems])
        
        // Broadcast to family members
        if (user && familySharing.isReady()) {
          await familySharing.broadcastUpdate({
            type: 'item_added',
            itemId: 'recipe_items',
            itemName: `${newItems.length} recipe ingredients`,
            userId: user.id,
            userName: user.displayName || user.email?.split('@')[0] || 'You',
            timestamp: new Date().toISOString(),
            data: { source: 'recipe_url', url: recipeUrl.trim() }
          })
        }
        
        setIsWebsiteScanning(false)
        setScanResult(`✅ Found ${newItems.length} ingredients from ${selectedRecipe.title || 'recipe'}. ${selectedRecipe.servings ? `Serves ${selectedRecipe.servings}.` : ''}`)
        updateUserData()
        setActiveTab('list')
        setRecipeUrl('')
      } catch (error) {
        setIsWebsiteScanning(false)
        setScanResult(`❌ ${error.message}`)
        console.error('Recipe URL scanning failed:', error)
      }
    }
  }

  // Scan specific website URL
  const scanFlyerUrl = () => {
    if (flyerUrl.trim()) {
      realWebsiteScan(flyerUrl.trim())
      setFlyerUrl('')
    }
  }

  // Shopping scan functionality
  const handleShoppingScan = (itemId: string) => {
    setIsScanningShopping(true)
    setScanningItemId(itemId)
    
    // Simulate barcode scanning delay
    setTimeout(() => {
      const item = shoppingList.find(i => i.id === itemId)
      if (item) {
        // For manual items (common grocery items), always allow scanning
        if (item.sourceType === 'manual' && item.price === 0) {
          // Manual item - mark as scanned
          setShoppingList(prev => {
            const updatedList = prev.map(listItem => {
              if (listItem.id === itemId) {
                const scannedQty = Math.min((listItem.scannedQuantity || 0) + 1, listItem.quantity)
                const remainingQty = listItem.quantity - scannedQty
                return {
                  ...listItem,
                  isScanned: scannedQty >= listItem.quantity,
                  scannedQuantity: scannedQty,
                  remainingQuantity: remainingQty
                }
              }
              return listItem
            })
            
            // Sort list: unscanned items first, then scanned items
            return updatedList.sort((a, b) => {
              if (a.isScanned && !b.isScanned) return 1
              if (!a.isScanned && b.isScanned) return -1
              return 0
            })
          })
          
          setScanResult(`✅ Scanned: ${item.name} (manual item)`)
        } else if (barcodeDb.current) {
          // For items with barcodes, check database match
          const dbItem = barcodeDb.current.lookup(item.barcode || '')
          
          // Check if scanned item matches the list item
          const isMatch = dbItem && (
            (item.brand && dbItem.brand && item.brand.toLowerCase().includes(dbItem.brand.toLowerCase())) ||
            item.name.toLowerCase().includes(dbItem.name.toLowerCase())
          )
          
          if (isMatch) {
            // Item matches - mark as scanned and move to bottom
            setShoppingList(prev => {
              const updatedList = prev.map(listItem => {
                if (listItem.id === itemId) {
                  const scannedQty = Math.min((listItem.scannedQuantity || 0) + 1, listItem.quantity)
                  const remainingQty = listItem.quantity - scannedQty
                  return {
                    ...listItem,
                    isScanned: scannedQty >= listItem.quantity,
                    scannedQuantity: scannedQty,
                    remainingQuantity: remainingQty
                  }
                }
                return listItem
              })
              
              // Sort list: unscanned items first, then scanned items
              return updatedList.sort((a, b) => {
                if (a.isScanned && !b.isScanned) return 1
                if (!a.isScanned && b.isScanned) return -1
                return 0
              })
            })
            
            setScanResult(`✅ Scanned: ${item.name} - ${item.brand || ''} ${item.size || ''}`)
          } else {
            // Item doesn't match - show warning
            setScanResult(`⚠️ Scanned item doesn't match: ${item.name}. Check brand/size.`)
          }
        }
      }
      
      setIsScanningShopping(false)
      setScanningItemId('')
    }, 1500)
  }

  // Show loading state while authentication is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show sign in screen if user is not authenticated
  if (!user) {
    return <SignInScreen />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Recipe className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Grocery Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {shoppingList.length} items
            </Badge>
            {onlineMembers.length > 1 && (
              <Badge variant="outline" className="text-xs">
                👥 {onlineMembers.length} online
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => blink.auth.logout()}
              className="text-xs"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Bottom Navigation - moved inside Tabs */}
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
            <TabsList className="grid w-full grid-cols-5 h-16 bg-transparent">
              <TabsTrigger 
                value="scanner" 
                className="flex-col gap-1 data-[state=active]:bg-primary/10"
              >
                <Scan className="h-4 w-4" />
                <span className="text-xs">Scanner</span>
              </TabsTrigger>
              <TabsTrigger 
                value="list" 
                className="flex-col gap-1 data-[state=active]:bg-primary/10"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="text-xs">List</span>
              </TabsTrigger>
              <TabsTrigger 
                value="compare" 
                className="flex-col gap-1 data-[state=active]:bg-primary/10"
              >
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Compare</span>
              </TabsTrigger>
              <TabsTrigger 
                value="flash-sales" 
                className="flex-col gap-1 data-[state=active]:bg-primary/10"
              >
                <Zap className="h-4 w-4" />
                <span className="text-xs">Flash Sales</span>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex-col gap-1 data-[state=active]:bg-primary/10"
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs">Settings</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scanner" className="p-4 space-y-4">
            {/* Location Selector - Full when not set, compact when set */}
            {!userLocation ? (
              <LocationSelector 
                currentLocation={userLocation}
                onLocationChange={setUserLocation}
              />
            ) : (
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{userLocation.city}, {userLocation.province}</span>
                      <Badge variant="outline" className="text-xs">{userLocation.source === 'gps' ? 'GPS' : 'Manual'}</Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setUserLocation(undefined)}
                      className="text-xs"
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scanner Section - Moved below location */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5" />
                  Scan Recipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isScanning || isWebsiteScanning ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-muted-foreground text-sm">
                      {isScanning ? 'Processing recipe...' : 'Scanning open browser pages...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-2"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-xs">Camera</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-16 flex-col gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-5 w-5" />
                        <span className="text-xs">Upload</span>
                      </Button>
                    </div>
                    
                    {/* Recipe URL Input */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter recipe URL or paste from browser"
                          value={recipeUrl}
                          onChange={(e) => setRecipeUrl(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && scanRecipeUrl()}
                        />
                        <Button onClick={scanRecipeUrl} size="sm" disabled={isWebsiteScanning}>
                          <Scan className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste any recipe URL from AllRecipes, Food Network, BBC Good Food, etc. If the page has multiple recipes, you'll be able to select which one to use.
                      </p>
                    </div>
                    
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleCameraCapture}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
                
                {scanResult && (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription className="text-sm">{scanResult}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Barcode Search */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Barcode Lookup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode number"
                    value={barcodeSearch}
                    onChange={(e) => setBarcodeSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchBarcodeDatabase()}
                  />
                  <Button onClick={searchBarcodeDatabase} size="sm">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => setShowBarcodeScanner(true)} 
                    size="sm"
                    variant="outline"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Online database: {databaseSize} items</span>
                  <Badge variant="default" className="text-xs bg-green-600">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Scan barcode with camera or enter manually for instant product lookup
                </p>
              </CardContent>
            </Card>



            {/* Website/Flyer Scanner */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Scan Grocery Flyer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter flyer URL (e.g., flipp.com, reebee.com)"
                    value={flyerUrl}
                    onChange={(e) => setFlyerUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && scanFlyerUrl()}
                  />
                  <Button onClick={scanFlyerUrl} size="sm" disabled={isWebsiteScanning}>
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Custom Sites Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Saved Sites</Label>
                    <Badge variant="outline" className="text-xs">{customSites.length} sites</Badge>
                  </div>
                  
                  {customSites.length > 0 ? (
                    <div className="space-y-2">
                      {customSites.map((site, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{site}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => realWebsiteScan(`https://${site}`)}
                              className="text-xs"
                            >
                              Scan
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCustomSite(site)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No saved sites yet. Add your favorite flyer sites below.
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add new site (e.g., reebee.com)"
                      value={newSite}
                      onChange={(e) => setNewSite(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCustomSite()}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={addCustomSite} disabled={!newSite.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Add your favorite grocery flyer websites for quick access. Just enter the domain name (e.g., "flipp.com").
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Search */}
            <ProductSearch 
              onAddToList={handleProductSearchAdd}
              userLocation={userLocation ? {
                lat: userLocation.lat, // Use real GPS coordinates
                lng: userLocation.lng,
                address: userLocation.address
              } : undefined}
              maxDistance={searchRadius}
            />

            {/* Add Custom Item */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Custom Item
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Item name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Price (optional)"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
                <Button onClick={addCustomItem} className="w-full">
                  Add to List
                </Button>
              </CardContent>
            </Card>

            {/* Previous Shopping Lists */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Previous Shopping Lists
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {savedShoppingLists.length > 0 ? (
                  <>
                    <Select value={selectedSavedList} onValueChange={setSelectedSavedList}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a previous list to load" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedShoppingLists.map(list => (
                          <SelectItem key={list.id} value={list.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{list.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                                <span>{list.itemCount} items</span>
                                <span>•</span>
                                <span>{new Date(list.date).toLocaleDateString()}</span>
                                {list.source && (
                                  <>
                                    <span>•</span>
                                    <span>{list.source}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSavedList && (
                      <Button onClick={() => loadSavedList(selectedSavedList)} className="w-full">
                        Load Selected List
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No saved shopping lists yet. Create and save lists to see them here.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Add - Shopping History (moved to bottom) */}
            <QuickAddList 
              shoppingHistory={shoppingHistory}
              onAddToList={handleQuickAddItem}
              onRemoveFromQuickList={handleRemoveFromQuickAdd}
            />
          </TabsContent>

          <TabsContent value="list" className="p-4 space-y-4">
            {/* Store Selection */}
            <StoreSelector
              stores={nearbyStores}
              selectedStoreId={selectedStore}
              onStoreSelected={(store) => setSelectedStore(store.id)}
              userLocation={userLocation ? { city: userLocation.city, province: userLocation.province } : undefined}
            />

            {/* Shopping List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Grocery List
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{shoppingList.length}</Badge>
                    {shoppingList.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveCurrentList}
                          className="text-xs"
                        >
                          Save List
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearAllItems}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shoppingList.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No items yet. Scan a recipe or add items manually.
                  </p>
                ) : (
                  <>
                    {/* Shopping Progress */}
                    {shoppingList.length > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span>Shopping Progress:</span>
                          <span className="font-medium">
                            {shoppingList.filter(item => item.isInCart).length} / {shoppingList.length} items in cart
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                            style={{ 
                              width: `${shoppingList.length > 0 ? (shoppingList.filter(item => item.isInCart).length / shoppingList.length) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {/* Source Links Section */}
                    {shoppingList.some(item => item.sourceUrl || item.sourceImageUrl) && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Sources
                        </h4>
                        <div className="space-y-1">
                          {Array.from(new Set(shoppingList.filter(item => item.sourceUrl).map(item => item.sourceUrl))).map((url, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Website</Badge>
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline truncate"
                              >
                                {url}
                              </a>
                            </div>
                          ))}
                          {shoppingList.some(item => item.sourceImageUrl) && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">Image</Badge>
                              <span className="text-xs text-muted-foreground">
                                {shoppingList.filter(item => item.sourceType === 'camera').length > 0 && 'Camera photos, '}
                                {shoppingList.filter(item => item.sourceType === 'upload').length > 0 && 'Uploaded images'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {shoppingList.map((item) => {
                      const priceChange = getPriceChange(item)
                      const isCurrentlyScanning = isScanningShopping && scanningItemId === item.id
                      
                      return (
                        <div key={item.id} className={`flex items-center gap-3 p-3 border rounded-lg ${
                          item.isInCart ? 'bg-green-50 border-green-200' : ''
                        } ${item.isScanned ? 'bg-blue-50 border-blue-200' : ''} ${isCurrentlyScanning ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                          {/* Checkbox for cart */}
                          <Checkbox
                            checked={item.isInCart || false}
                            onCheckedChange={() => toggleItemInCart(item.id)}
                            className="mt-1"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-medium text-sm ${item.isInCart ? 'line-through text-muted-foreground' : ''}`}>
                                {item.name}
                              </h4>
                              {item.isInCart && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  <Check className="h-3 w-3 mr-1" />
                                  In Cart
                                </Badge>
                              )}
                              {item.isScanned && !item.isInCart && (
                                <Badge variant="secondary" className="text-xs">
                                  <Scan className="h-3 w-3 mr-1" />
                                  Scanned
                                </Badge>
                              )}
                              {item.isFromRecipe && (
                                <Badge variant="secondary" className="text-xs">Recipe</Badge>
                              )}
                              {item.sourceType && (
                                <Badge variant="outline" className="text-xs">
                                  {item.sourceType === 'website' ? 'Web' : 
                                   item.sourceType === 'camera' ? 'Camera' :
                                   item.sourceType === 'upload' ? 'Upload' : 'Manual'}
                                </Badge>
                              )}
                              {item.category && (
                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              )}
                              {priceChange && priceChange.isSignificant && (
                                <Badge 
                                  variant={priceChange.isIncrease ? "destructive" : "default"} 
                                  className="text-xs flex items-center gap-1"
                                >
                                  {priceChange.isIncrease ? (
                                    <TrendingUp className="h-3 w-3" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3" />
                                  )}
                                  {priceChange.percent > 0 ? '+' : ''}{priceChange.percent.toFixed(1)}%
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <p className="text-xs text-muted-foreground">
                                ${item.price.toFixed(2)} each
                              </p>
                              {item.brand && (
                                <p className="text-xs text-muted-foreground">
                                  • Brand: {item.brand}
                                </p>
                              )}
                              {item.size && (
                                <p className="text-xs text-muted-foreground">
                                  • Size: {item.size}
                                </p>
                              )}
                              {(item.scannedQuantity || 0) > 0 && (
                                <p className="text-xs text-green-600">
                                  • Scanned: {item.scannedQuantity}/{item.quantity}
                                </p>
                              )}
                              {(item.remainingQuantity || 0) > 0 && !item.isScanned && (
                                <p className="text-xs text-orange-600">
                                  • Remaining: {item.remainingQuantity}
                                </p>
                              )}
                              {priceChange && (
                                <p className={`text-xs ${priceChange.isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                                  {priceChange.isIncrease ? '+' : ''}${priceChange.amount.toFixed(2)} vs last purchase
                                </p>
                              )}
                              {item.lastPurchaseDate && (
                                <p className="text-xs text-muted-foreground">
                                  • Last: {new Date(item.lastPurchaseDate).toLocaleDateString()}
                                </p>
                              )}
                              {item.addedByUserName && (
                                <p className="text-xs text-muted-foreground">
                                  • Added by: {item.addedByUserName}
                                </p>
                              )}
                              {item.purchasedByUserName && item.purchasedAt && (
                                <p className="text-xs text-green-600">
                                  • Purchased by: {item.purchasedByUserName} at {new Date(item.purchasedAt).toLocaleTimeString()}
                                </p>
                              )}
                              {item.barcode && (
                                <p className="text-xs text-muted-foreground">
                                  • {formatBarcode(item.barcode)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!item.isInCart && !item.isScanned && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleShoppingScan(item.id)}
                                disabled={isCurrentlyScanning}
                                className="h-8 px-2"
                              >
                                {isCurrentlyScanning ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                                ) : (
                                  <Scan className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Total */}
            {shoppingList.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {/* List Total */}
                    <div>
                      <h4 className="font-medium text-sm mb-2">List Total</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax ({selectedState} {(TAX_RATES[selectedState] * 100).toFixed(2)}%):</span>
                          <span>${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Cart Total */}
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-green-700">Cart Total ({shoppingList.filter(item => item.isInCart).length} items)</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${cartSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>${cartTaxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-green-700">
                          <span>Cart Total:</span>
                          <span>${cartTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="compare" className="p-4 space-y-4">
            {/* Savings Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="savings-filter">Show significant savings only (10%+)</Label>
                  <Switch
                    id="savings-filter"
                    checked={showSavingsOnly}
                    onCheckedChange={setShowSavingsOnly}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Savings Alerts */}
            {getSignificantSavings().length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Found {getSignificantSavings().length} items with 10%+ savings at other stores!
                </AlertDescription>
              </Alert>
            )}

            {/* Real Price Comparisons */}
            <div className="space-y-4">
              {realPriceComparisons.length > 0 ? (
                realPriceComparisons
                  .filter(comparison => !showSavingsOnly || comparison.maxSavings >= comparison.bestPrice * 0.1)
                  .map((comparison) => (
                    <Card key={comparison.productName}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{comparison.productName}</span>
                          <div className="flex items-center gap-2">
                            {comparison.maxSavings >= comparison.bestPrice * 0.1 && (
                              <Badge variant="destructive" className="text-xs">
                                Save ${comparison.maxSavings.toFixed(2)}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {comparison.category}
                            </Badge>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mb-3">
                          <div>Best Price: <span className="font-semibold text-green-600">${comparison.bestPrice.toFixed(2)}</span></div>
                          <div>Avg Price: <span className="font-semibold">${comparison.averagePrice.toFixed(2)}</span></div>
                          <div>Range: ${comparison.priceRange.min.toFixed(2)} - ${comparison.priceRange.max.toFixed(2)}</div>
                          <div>Recommended: <span className="font-semibold">{comparison.recommendedStore}</span></div>
                        </div>
                        
                        {comparison.prices.slice(0, 5).map((storePrice, index) => (
                          <div key={storePrice.storeId} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-green-500' : 'bg-muted'
                              }`} />
                              <div>
                                <p className="font-medium text-sm">{storePrice.store}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {storePrice.distance.toFixed(1)} km
                                  <span>•</span>
                                  <span>{storePrice.chain}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                {storePrice.onSale && storePrice.originalPrice && (
                                  <span className="text-xs text-muted-foreground line-through">
                                    ${storePrice.originalPrice.toFixed(2)}
                                  </span>
                                )}
                                <p className={`font-semibold ${storePrice.onSale ? 'text-red-600' : ''}`}>
                                  ${storePrice.price.toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge 
                                  variant={storePrice.availability === 'in-stock' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {storePrice.availability}
                                </Badge>
                                {storePrice.onSale && (
                                  <Badge variant="destructive" className="text-xs">
                                    Sale
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="text-xs text-muted-foreground text-center pt-2">
                          Last updated: {new Date(comparison.lastUpdated).toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground py-8">
                      {shoppingList.length === 0 
                        ? 'Add items to your shopping list to see price comparisons.'
                        : nearbyStores.length === 0
                        ? 'Set your location to get real price comparisons from nearby stores.'
                        : 'Getting real-time price comparisons...'
                      }
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="flash-sales" className="p-4 space-y-4">
            {nearbyStores.length > 0 ? (
              <FlashSales 
                userDietaryPreferences={dietaryPreferences}
                userAllergens={allergens}
                maxDistance={searchRadius}
                nearbyStores={nearbyStores}
                onAddToList={addItemToList}
              />
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    {userLocation 
                      ? 'Finding nearby stores to show flash sales...'
                      : 'Set your location to see flash sales from nearby stores.'
                    }
                  </p>
                  {!userLocation && (
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('scanner')}
                      >
                        Set Location
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="p-4 space-y-4">
            {/* Account Management */}
            <AuthManager user={user} onSignOut={() => blink.auth.logout()} />

            {/* Database Status */}
            <DatabaseStatus />

            {/* Feature Status */}
            <FeatureLimitations />

            {/* Location & Search Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="province-select">Province/Territory</Label>
                  <Select value={selectedState} onValueChange={(value: keyof typeof TAX_RATES) => setSelectedState(value)}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(TAX_RATES).map(province => (
                        <SelectItem key={province} value={province}>{province}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="radius">Search Radius: {searchRadius} km</Label>
                  <Input
                    id="radius"
                    type="range"
                    min="1"
                    max="25"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                    className="w-24"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Search radius is for demonstration only. Real store distances require location APIs.
                </p>
              </CardContent>
            </Card>

            {/* Dietary Preferences */}
            <DietaryPreferences 
              preferences={dietaryPreferences}
              allergens={allergens}
              onPreferencesChange={setDietaryPreferences}
              onAllergensChange={setAllergens}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <RecipeSelector
          recipes={recipeOptions}
          sourceUrl={recipeSourceUrl}
          onRecipeSelected={async (recipe) => {
            // Handle selected recipe
            setScanResult('Processing selected recipe...')
            
            try {
              const matchedProducts = await matchIngredientsToProducts(recipe.ingredients)
              
              const newItems: ShoppingItem[] = matchedProducts.map((product, index) => {
                const priceHistory = generateMockPriceHistory(product.estimatedPrice, product.productName)
                const lastPurchase = priceHistory[priceHistory.length - 2]
                
                return {
                  id: (Date.now() + index).toString(),
                  name: product.productName,
                  price: product.estimatedPrice,
                  quantity: 1,
                  isFromRecipe: true,
                  category: product.category,
                  barcode: product.barcode || generateMockBarcode(),
                  brand: product.brand,
                  size: product.size,
                  priceHistory,
                  lastPurchasePrice: lastPurchase?.price,
                  lastPurchaseDate: lastPurchase?.date,
                  sourceType: 'website',
                  sourceUrl: recipeSourceUrl,
                  isScanned: false,
                  scannedQuantity: 0,
                  remainingQuantity: 1,
                  isInCart: false
                }
              })
              
              setShoppingList(prev => [...prev, ...newItems])
              
              // Broadcast to family members
              if (user && familySharing.isReady()) {
                await familySharing.broadcastUpdate({
                  type: 'item_added',
                  itemId: 'recipe_items',
                  itemName: `${newItems.length} ingredients from ${recipe.title}`,
                  userId: user.id,
                  userName: user.displayName || user.email?.split('@')[0] || 'You',
                  timestamp: new Date().toISOString(),
                  data: { source: 'recipe_selection', recipe: recipe.title }
                })
              }
              
              setScanResult(`✅ Added ${newItems.length} ingredients from ${recipe.title}`)
              updateUserData()
              setActiveTab('list')
            } catch (error) {
              setScanResult(`❌ Failed to process recipe: ${error.message}`)
            }
          }}
          onClose={() => {
            setShowRecipeSelector(false)
            setRecipeOptions([])
            setRecipeSourceUrl('')
          }}
        />
      )}
    </div>
  )
}

export default App