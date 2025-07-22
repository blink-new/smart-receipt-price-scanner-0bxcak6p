// Local barcode database for common grocery items
// This provides offline barcode lookup functionality

export interface BarcodeItem {
  barcode: string
  name: string
  brand?: string
  category: string
  averagePrice: number
  size?: string
}

// Compact local database of common grocery barcodes
// In production, this could be loaded from a local JSON file or IndexedDB
export const LOCAL_BARCODE_DATABASE: BarcodeItem[] = [
  // Produce
  { barcode: '4011', name: 'Bananas', category: 'Produce', averagePrice: 0.68 },
  { barcode: '4131', name: 'Organic Bananas', category: 'Produce', averagePrice: 0.98 },
  { barcode: '4065', name: 'Green Bell Pepper', category: 'Produce', averagePrice: 1.49 },
  { barcode: '4688', name: 'Red Bell Pepper', category: 'Produce', averagePrice: 1.79 },
  { barcode: '4080', name: 'Cucumber', category: 'Produce', averagePrice: 0.89 },
  
  // Dairy
  { barcode: '011110181107', name: 'Whole Milk', brand: 'Great Value', category: 'Dairy', averagePrice: 3.48, size: '1 Gallon' },
  { barcode: '011110181114', name: '2% Milk', brand: 'Great Value', category: 'Dairy', averagePrice: 3.48, size: '1 Gallon' },
  { barcode: '041303001721', name: 'Large Eggs', brand: 'Great Value', category: 'Dairy', averagePrice: 2.12, size: '12 count' },
  { barcode: '041303002728', name: 'Butter', brand: 'Great Value', category: 'Dairy', averagePrice: 3.48, size: '1 lb' },
  
  // Bread & Bakery
  { barcode: '072250007504', name: 'White Bread', brand: 'Wonder', category: 'Bakery', averagePrice: 1.28, size: '20 oz' },
  { barcode: '072250007511', name: 'Whole Wheat Bread', brand: 'Wonder', category: 'Bakery', averagePrice: 1.48, size: '20 oz' },
  { barcode: '041303000793', name: 'Hamburger Buns', brand: 'Great Value', category: 'Bakery', averagePrice: 0.98, size: '8 count' },
  
  // Meat
  { barcode: '021130126026', name: 'Ground Beef', brand: 'Great Value', category: 'Meat', averagePrice: 4.98, size: '1 lb' },
  { barcode: '021130126033', name: 'Ground Turkey', brand: 'Great Value', category: 'Meat', averagePrice: 3.98, size: '1 lb' },
  { barcode: '021130126040', name: 'Chicken Breast', brand: 'Great Value', category: 'Meat', averagePrice: 2.98, size: '1 lb' },
  
  // Pantry Staples
  { barcode: '016000275270', name: 'Cheerios', brand: 'General Mills', category: 'Cereal', averagePrice: 3.98, size: '12 oz' },
  { barcode: '038000845451', name: 'Rice', brand: 'Uncle Ben\'s', category: 'Pantry', averagePrice: 1.98, size: '2 lb' },
  { barcode: '041303002056', name: 'All Purpose Flour', brand: 'Great Value', category: 'Pantry', averagePrice: 1.98, size: '5 lb' },
  { barcode: '041303001844', name: 'Sugar', brand: 'Great Value', category: 'Pantry', averagePrice: 2.48, size: '4 lb' },
  
  // Beverages
  { barcode: '049000028928', name: 'Coca Cola', brand: 'Coca-Cola', category: 'Beverages', averagePrice: 1.68, size: '2 Liter' },
  { barcode: '012000161155', name: 'Pepsi', brand: 'PepsiCo', category: 'Beverages', averagePrice: 1.68, size: '2 Liter' },
  { barcode: '041303001837', name: 'Orange Juice', brand: 'Great Value', category: 'Beverages', averagePrice: 2.98, size: '64 oz' },
  
  // Frozen Foods
  { barcode: '041303002063', name: 'Frozen Pizza', brand: 'Great Value', category: 'Frozen', averagePrice: 1.98, size: '12 inch' },
  { barcode: '041303002070', name: 'Frozen Vegetables', brand: 'Great Value', category: 'Frozen', averagePrice: 0.98, size: '12 oz' },
  { barcode: '041303002087', name: 'Ice Cream', brand: 'Great Value', category: 'Frozen', averagePrice: 2.98, size: '48 oz' },
  
  // Personal Care
  { barcode: '037000263647', name: 'Toothpaste', brand: 'Crest', category: 'Personal Care', averagePrice: 3.97, size: '4.1 oz' },
  { barcode: '037000470441', name: 'Shampoo', brand: 'Head & Shoulders', category: 'Personal Care', averagePrice: 4.97, size: '13.5 oz' },
  { barcode: '041303002094', name: 'Body Wash', brand: 'Great Value', category: 'Personal Care', averagePrice: 1.97, size: '18 oz' },
  
  // Household
  { barcode: '037000740360', name: 'Laundry Detergent', brand: 'Tide', category: 'Household', averagePrice: 11.97, size: '100 oz' },
  { barcode: '041303002100', name: 'Dish Soap', brand: 'Great Value', category: 'Household', averagePrice: 0.97, size: '25 oz' },
  { barcode: '041303002117', name: 'Paper Towels', brand: 'Great Value', category: 'Household', averagePrice: 5.98, size: '8 rolls' },

  // International/Ethnic Products - Asian
  { barcode: '8901030827129', name: 'Basmati Rice', brand: 'Tilda', category: 'International', averagePrice: 8.99, size: '2 lb' },
  { barcode: '8901030827136', name: 'Jasmine Rice', brand: 'Golden Phoenix', category: 'International', averagePrice: 12.99, size: '5 lb' },
  { barcode: '8901030827143', name: 'Soy Sauce', brand: 'Kikkoman', category: 'International', averagePrice: 3.49, size: '10 oz' },
  { barcode: '8901030827150', name: 'Miso Paste', brand: 'Hikari', category: 'International', averagePrice: 6.79, size: '17.6 oz' },
  { barcode: '8901030827167', name: 'Kimchi', brand: 'Mother-in-Law\'s', category: 'International', averagePrice: 8.49, size: '16 oz' },
  { barcode: '8901030827174', name: 'Coconut Milk', brand: 'Chaokoh', category: 'International', averagePrice: 2.99, size: '13.5 oz' },
  { barcode: '8901030827181', name: 'Fish Sauce', brand: 'Red Boat', category: 'International', averagePrice: 12.99, size: '8.45 oz' },
  { barcode: '8901030827198', name: 'Rice Noodles', brand: 'A Taste of Thai', category: 'International', averagePrice: 2.49, size: '8.8 oz' },
  { barcode: '8901030827204', name: 'Sesame Oil', brand: 'Kadoya', category: 'International', averagePrice: 4.99, size: '5.5 oz' },
  { barcode: '8901030827211', name: 'Panko Breadcrumbs', brand: 'Kikkoman', category: 'International', averagePrice: 3.99, size: '8 oz' },

  // International/Ethnic Products - Latin American
  { barcode: '7501030827228', name: 'Masa Harina', brand: 'Maseca', category: 'International', averagePrice: 3.99, size: '4.4 lb' },
  { barcode: '7501030827235', name: 'Black Beans', brand: 'Goya', category: 'International', averagePrice: 1.49, size: '15.5 oz' },
  { barcode: '7501030827242', name: 'Plantains', brand: 'Fresh', category: 'International', averagePrice: 2.99, size: '3 count' },
  { barcode: '7501030827259', name: 'Chipotle Peppers in Adobo', brand: 'La Costeña', category: 'International', averagePrice: 2.79, size: '7 oz' },
  { barcode: '7501030827266', name: 'Queso Fresco', brand: 'Cacique', category: 'International', averagePrice: 4.99, size: '10 oz' },
  { barcode: '7501030827273', name: 'Chorizo', brand: 'Cacique', category: 'International', averagePrice: 3.99, size: '9 oz' },
  { barcode: '7501030827280', name: 'Corn Tortillas', brand: 'Mission', category: 'International', averagePrice: 2.49, size: '30 count' },
  { barcode: '7501030827297', name: 'Salsa Verde', brand: 'Herdez', category: 'International', averagePrice: 2.99, size: '16 oz' },
  { barcode: '7501030827303', name: 'Mexican Crema', brand: 'Cacique', category: 'International', averagePrice: 3.49, size: '15 oz' },
  { barcode: '7501030827310', name: 'Tajín Seasoning', brand: 'Tajín', category: 'International', averagePrice: 2.99, size: '5 oz' },

  // International/Ethnic Products - Middle Eastern/Mediterranean
  { barcode: '6251030827327', name: 'Tahini', brand: 'Joyva', category: 'International', averagePrice: 5.99, size: '15 oz' },
  { barcode: '6251030827334', name: 'Hummus', brand: 'Sabra', category: 'International', averagePrice: 3.99, size: '10 oz' },
  { barcode: '6251030827341', name: 'Pita Bread', brand: 'Toufayan', category: 'International', averagePrice: 2.49, size: '6 count' },
  { barcode: '6251030827358', name: 'Feta Cheese', brand: 'Athenos', category: 'International', averagePrice: 4.99, size: '6 oz' },
  { barcode: '6251030827365', name: 'Olive Oil', brand: 'Colavita', category: 'International', averagePrice: 8.99, size: '17 oz' },
  { barcode: '6251030827372', name: 'Za\'atar Spice', brand: 'Ziyad', category: 'International', averagePrice: 3.99, size: '3 oz' },
  { barcode: '6251030827389', name: 'Bulgur Wheat', brand: 'Near East', category: 'International', averagePrice: 2.99, size: '12 oz' },
  { barcode: '6251030827396', name: 'Rose Water', brand: 'Cortas', category: 'International', averagePrice: 4.49, size: '10 oz' },
  { barcode: '6251030827402', name: 'Pomegranate Molasses', brand: 'Al Wadi', category: 'International', averagePrice: 5.99, size: '10 oz' },
  { barcode: '6251030827419', name: 'Halloumi Cheese', brand: 'Krinos', category: 'International', averagePrice: 6.99, size: '8.8 oz' },

  // International/Ethnic Products - Indian/South Asian
  { barcode: '8901030827426', name: 'Garam Masala', brand: 'Shan', category: 'International', averagePrice: 4.99, size: '3.5 oz' },
  { barcode: '8901030827433', name: 'Turmeric Powder', brand: 'Everest', category: 'International', averagePrice: 3.49, size: '7 oz' },
  { barcode: '8901030827440', name: 'Curry Leaves', brand: 'Deep', category: 'International', averagePrice: 2.99, size: '0.35 oz' },
  { barcode: '8901030827457', name: 'Ghee', brand: 'Organic Valley', category: 'International', averagePrice: 12.99, size: '13 oz' },
  { barcode: '8901030827464', name: 'Naan Bread', brand: 'Stonefire', category: 'International', averagePrice: 3.99, size: '4 count' },
  { barcode: '8901030827471', name: 'Paneer', brand: 'Gopi', category: 'International', averagePrice: 5.99, size: '14 oz' },
  { barcode: '8901030827488', name: 'Cardamom Pods', brand: 'Spice Islands', category: 'International', averagePrice: 8.99, size: '0.17 oz' },
  { barcode: '8901030827495', name: 'Coconut Oil', brand: 'Spectrum', category: 'International', averagePrice: 9.99, size: '14 oz' },
  { barcode: '8901030827501', name: 'Lentils (Dal)', brand: 'Toor', category: 'International', averagePrice: 4.99, size: '2 lb' },
  { barcode: '8901030827518', name: 'Tamarind Paste', brand: 'Tamicon', category: 'International', averagePrice: 3.99, size: '8 oz' },

  // International/Ethnic Products - African/Caribbean
  { barcode: '2341030827525', name: 'Yuca (Cassava)', brand: 'Fresh', category: 'International', averagePrice: 1.99, size: '1 lb' },
  { barcode: '2341030827532', name: 'Scotch Bonnet Peppers', brand: 'Fresh', category: 'International', averagePrice: 3.99, size: '4 oz' },
  { barcode: '2341030827549', name: 'Jerk Seasoning', brand: 'Walkerswood', category: 'International', averagePrice: 4.99, size: '10 oz' },
  { barcode: '2341030827556', name: 'Ackee', brand: 'Grace', category: 'International', averagePrice: 3.99, size: '19 oz' },
  { barcode: '2341030827563', name: 'Coconut Water', brand: 'Grace', category: 'International', averagePrice: 1.99, size: '17.6 oz' },
  { barcode: '2341030827570', name: 'Curry Powder', brand: 'Chief', category: 'International', averagePrice: 2.99, size: '3 oz' },
  { barcode: '2341030827587', name: 'Okra', brand: 'Fresh', category: 'International', averagePrice: 2.99, size: '1 lb' },
  { barcode: '2341030827594', name: 'Sweet Potato', brand: 'Fresh', category: 'International', averagePrice: 1.49, size: '1 lb' },
  { barcode: '2341030827600', name: 'Palm Oil', brand: 'Zomi', category: 'International', averagePrice: 6.99, size: '16.9 oz' },
  { barcode: '2341030827617', name: 'Fufu Mix', brand: 'Tropiway', category: 'International', averagePrice: 4.99, size: '1.5 lb' }
]

export interface SearchHistory {
  query: string
  timestamp: number
  resultCount: number
}

export interface ItemUsage {
  barcode: string
  searchCount: number
  lastSearched: number
  addedToListCount: number
  lastAddedToList: number
}

export class BarcodeDatabase {
  private static instance: BarcodeDatabase
  private database: Map<string, BarcodeItem>
  private searchHistory: SearchHistory[] = []
  private itemUsage: Map<string, ItemUsage> = new Map()
  private recentSearches: string[] = []

  private constructor() {
    this.database = new Map()
    this.loadDatabase()
    this.loadUserData()
  }

  public static getInstance(): BarcodeDatabase {
    if (!BarcodeDatabase.instance) {
      BarcodeDatabase.instance = new BarcodeDatabase()
    }
    return BarcodeDatabase.instance
  }

  private loadDatabase(): void {
    LOCAL_BARCODE_DATABASE.forEach(item => {
      this.database.set(item.barcode, item)
    })
  }

  private loadUserData(): void {
    try {
      // Load search history from localStorage
      const savedHistory = localStorage.getItem('barcode_search_history')
      if (savedHistory) {
        this.searchHistory = JSON.parse(savedHistory)
      }

      // Load item usage data from localStorage
      const savedUsage = localStorage.getItem('barcode_item_usage')
      if (savedUsage) {
        const usageData = JSON.parse(savedUsage)
        this.itemUsage = new Map(Object.entries(usageData))
      }

      // Load recent searches from localStorage
      const savedRecent = localStorage.getItem('barcode_recent_searches')
      if (savedRecent) {
        this.recentSearches = JSON.parse(savedRecent)
      }
    } catch (error) {
      console.warn('Failed to load user data from localStorage:', error)
    }
  }

  private saveUserData(): void {
    try {
      localStorage.setItem('barcode_search_history', JSON.stringify(this.searchHistory))
      localStorage.setItem('barcode_item_usage', JSON.stringify(Object.fromEntries(this.itemUsage)))
      localStorage.setItem('barcode_recent_searches', JSON.stringify(this.recentSearches))
    } catch (error) {
      console.warn('Failed to save user data to localStorage:', error)
    }
  }

  public lookup(barcode: string): BarcodeItem | null {
    const item = this.database.get(barcode)
    if (item) {
      this.trackItemUsage(barcode, 'search')
    }
    return item || null
  }

  public search(query: string): BarcodeItem[] {
    const searchTerm = query.toLowerCase()
    
    // Enhanced search with ethnic/cuisine recognition
    const results = Array.from(this.database.values()).filter(item => {
      const itemName = item.name.toLowerCase()
      const itemBrand = item.brand?.toLowerCase() || ''
      const itemCategory = item.category.toLowerCase()
      
      // Direct matches
      if (itemName.includes(searchTerm) || 
          itemBrand.includes(searchTerm) || 
          itemCategory.includes(searchTerm)) {
        return true
      }
      
      // Ethnic cuisine keywords mapping
      const cuisineKeywords = {
        'asian': ['rice', 'soy', 'miso', 'kimchi', 'sesame', 'noodles', 'coconut milk', 'fish sauce', 'panko'],
        'chinese': ['soy sauce', 'sesame oil', 'rice noodles', 'bok choy'],
        'japanese': ['miso', 'panko', 'soy sauce', 'sesame'],
        'korean': ['kimchi', 'gochujang'],
        'thai': ['jasmine rice', 'coconut milk', 'fish sauce', 'curry'],
        'vietnamese': ['fish sauce', 'rice noodles'],
        'indian': ['basmati', 'garam masala', 'turmeric', 'curry', 'ghee', 'naan', 'paneer', 'cardamom', 'lentils', 'dal', 'tamarind'],
        'mexican': ['masa', 'plantains', 'chipotle', 'queso', 'chorizo', 'tortillas', 'salsa', 'crema', 'tajín'],
        'latin': ['masa', 'plantains', 'black beans', 'chorizo', 'queso'],
        'spanish': ['chorizo', 'olive oil'],
        'mediterranean': ['tahini', 'hummus', 'pita', 'feta', 'olive oil', 'za\'atar', 'bulgur', 'halloumi'],
        'middle eastern': ['tahini', 'hummus', 'pita', 'za\'atar', 'bulgur', 'rose water', 'pomegranate'],
        'arabic': ['tahini', 'za\'atar', 'rose water', 'pomegranate'],
        'caribbean': ['yuca', 'scotch bonnet', 'jerk', 'ackee', 'coconut water', 'plantains'],
        'jamaican': ['jerk', 'ackee', 'scotch bonnet'],
        'african': ['yuca', 'okra', 'palm oil', 'fufu', 'sweet potato'],
        'halal': ['halal', 'zabihah'],
        'kosher': ['kosher', 'pareve'],
        'vegan': ['coconut', 'plant', 'vegan'],
        'gluten free': ['rice', 'quinoa', 'corn']
      }
      
      // Check if search term matches cuisine keywords
      for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
        if (searchTerm.includes(cuisine) || cuisine.includes(searchTerm)) {
          return keywords.some(keyword => itemName.includes(keyword))
        }
      }
      
      // Check if item contains ethnic indicators
      const ethnicIndicators = ['thai', 'korean', 'japanese', 'chinese', 'indian', 'mexican', 'caribbean', 'african', 'middle eastern', 'mediterranean']
      if (ethnicIndicators.some(indicator => searchTerm.includes(indicator))) {
        return itemCategory === 'international'
      }
      
      return false
    })

    // Track search history
    this.addToSearchHistory(query, results.length)
    
    // Track usage for found items
    results.forEach(item => {
      this.trackItemUsage(item.barcode, 'search')
    })

    return this.sortByRelevance(results, searchTerm)
  }

  public getByCategory(category: string): BarcodeItem[] {
    return Array.from(this.database.values()).filter(item =>
      item.category.toLowerCase() === category.toLowerCase()
    )
  }

  public addItem(item: BarcodeItem): void {
    this.database.set(item.barcode, item)
    this.saveUserData()
  }

  public getDatabaseSize(): number {
    return this.database.size
  }

  public getAllBarcodes(): string[] {
    return Array.from(this.database.keys())
  }

  public getAllCategories(): string[] {
    const categories = new Set<string>()
    this.database.forEach(item => categories.add(item.category))
    return Array.from(categories).sort()
  }

  // Track when items are added to shopping list
  public trackItemAddedToList(barcode: string): void {
    this.trackItemUsage(barcode, 'addToList')
  }

  // Get frequently used items
  public getFrequentlyUsed(limit: number = 10): BarcodeItem[] {
    const sortedUsage = Array.from(this.itemUsage.entries())
      .sort((a, b) => (b[1].searchCount + b[1].addedToListCount * 2) - (a[1].searchCount + a[1].addedToListCount * 2))
      .slice(0, limit)

    return sortedUsage
      .map(([barcode]) => this.database.get(barcode))
      .filter((item): item is BarcodeItem => item !== undefined)
  }

  // Get recent searches
  public getRecentSearches(): string[] {
    return [...this.recentSearches]
  }

  // Get search suggestions based on history
  public getSearchSuggestions(query: string, limit: number = 5): string[] {
    const queryLower = query.toLowerCase()
    return this.recentSearches
      .filter(search => search.toLowerCase().includes(queryLower) && search !== query)
      .slice(0, limit)
  }

  // Get trending items (recently searched/added)
  public getTrendingItems(limit: number = 5): BarcodeItem[] {
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)

    const recentUsage = Array.from(this.itemUsage.entries())
      .filter(([, usage]) => usage.lastSearched > oneDayAgo || usage.lastAddedToList > oneDayAgo)
      .sort((a, b) => Math.max(b[1].lastSearched, b[1].lastAddedToList) - Math.max(a[1].lastSearched, a[1].lastAddedToList))
      .slice(0, limit)

    return recentUsage
      .map(([barcode]) => this.database.get(barcode))
      .filter((item): item is BarcodeItem => item !== undefined)
  }

  // Get personalized recommendations based on usage patterns
  public getRecommendations(limit: number = 5): BarcodeItem[] {
    const userCategories = new Map<string, number>()
    
    // Analyze user's category preferences
    this.itemUsage.forEach((usage, barcode) => {
      const item = this.database.get(barcode)
      if (item) {
        const score = usage.searchCount + (usage.addedToListCount * 2)
        userCategories.set(item.category, (userCategories.get(item.category) || 0) + score)
      }
    })

    // Get top categories
    const topCategories = Array.from(userCategories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category)

    // Find items from preferred categories that user hasn't used much
    const recommendations = Array.from(this.database.values())
      .filter(item => {
        const usage = this.itemUsage.get(item.barcode)
        const totalUsage = (usage?.searchCount || 0) + (usage?.addedToListCount || 0)
        return topCategories.includes(item.category) && totalUsage < 3
      })
      .sort(() => Math.random() - 0.5) // Randomize
      .slice(0, limit)

    return recommendations
  }

  private trackItemUsage(barcode: string, action: 'search' | 'addToList'): void {
    const now = Date.now()
    const usage = this.itemUsage.get(barcode) || {
      barcode,
      searchCount: 0,
      lastSearched: 0,
      addedToListCount: 0,
      lastAddedToList: 0
    }

    if (action === 'search') {
      usage.searchCount++
      usage.lastSearched = now
    } else if (action === 'addToList') {
      usage.addedToListCount++
      usage.lastAddedToList = now
    }

    this.itemUsage.set(barcode, usage)
    this.saveUserData()
  }

  private addToSearchHistory(query: string, resultCount: number): void {
    // Add to recent searches (avoid duplicates)
    this.recentSearches = this.recentSearches.filter(search => search !== query)
    this.recentSearches.unshift(query)
    this.recentSearches = this.recentSearches.slice(0, 20) // Keep last 20 searches

    // Add to search history
    this.searchHistory.push({
      query,
      timestamp: Date.now(),
      resultCount
    })

    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100)
    }

    this.saveUserData()
  }

  private sortByRelevance(items: BarcodeItem[], searchTerm: string): BarcodeItem[] {
    return items.sort((a, b) => {
      // Get usage data
      const usageA = this.itemUsage.get(a.barcode)
      const usageB = this.itemUsage.get(b.barcode)
      
      // Calculate relevance scores
      let scoreA = 0
      let scoreB = 0

      // Exact name match gets highest priority
      if (a.name.toLowerCase() === searchTerm) scoreA += 100
      if (b.name.toLowerCase() === searchTerm) scoreB += 100

      // Name starts with search term
      if (a.name.toLowerCase().startsWith(searchTerm)) scoreA += 50
      if (b.name.toLowerCase().startsWith(searchTerm)) scoreB += 50

      // Brand match
      if (a.brand?.toLowerCase().includes(searchTerm)) scoreA += 30
      if (b.brand?.toLowerCase().includes(searchTerm)) scoreB += 30

      // Usage frequency
      if (usageA) scoreA += (usageA.searchCount * 2) + (usageA.addedToListCount * 5)
      if (usageB) scoreB += (usageB.searchCount * 2) + (usageB.addedToListCount * 5)

      // Recent usage
      const now = Date.now()
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)
      if (usageA && usageA.lastSearched > oneWeekAgo) scoreA += 10
      if (usageB && usageB.lastSearched > oneWeekAgo) scoreB += 10

      return scoreB - scoreA
    })
  }
}

// Utility functions for barcode operations
export const formatBarcode = (barcode: string): string => {
  // Remove any non-numeric characters
  const cleaned = barcode.replace(/\D/g, '')
  
  // Format based on length
  if (cleaned.length === 12) {
    // UPC-A format: 123456 789012
    return `${cleaned.slice(0, 6)} ${cleaned.slice(6)}`
  } else if (cleaned.length === 13) {
    // EAN-13 format: 1 234567 890123
    return `${cleaned.slice(0, 1)} ${cleaned.slice(1, 7)} ${cleaned.slice(7)}`
  } else if (cleaned.length === 8) {
    // EAN-8 format: 1234 5678
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`
  }
  
  return cleaned
}

export const validateBarcode = (barcode: string): boolean => {
  const cleaned = barcode.replace(/\D/g, '')
  return cleaned.length >= 4 && cleaned.length <= 14
}

export const generateMockBarcode = (): string => {
  // Generate a random 12-digit UPC-A barcode
  let barcode = ''
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString()
  }
  return barcode
}