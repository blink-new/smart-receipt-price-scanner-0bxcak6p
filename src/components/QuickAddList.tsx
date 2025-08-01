import { useState, useEffect, useCallback } from 'react'
import { Plus, Minus, Clock, Star, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

export interface QuickAddItem {
  id: string
  name: string
  brand?: string
  category: string
  frequency: number // How often this item appears in shopping lists
  lastAdded: Date
  averagePrice: number
  isInQuickList: boolean
}

interface QuickAddListProps {
  shoppingHistory: any[] // Previous shopping lists
  onAddToList: (item: QuickAddItem) => void
  onRemoveFromQuickList: (itemId: string) => void
}

export function QuickAddList({ shoppingHistory, onAddToList, onRemoveFromQuickList }: QuickAddListProps) {
  const [quickAddItems, setQuickAddItems] = useState<QuickAddItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const ITEMS_PER_VIEW = 4

  const generateQuickAddItems = useCallback(() => {
    // Analyze shopping history to create dynamic quick add list
    const itemFrequency = new Map<string, {
      count: number
      lastAdded: Date
      totalPrice: number
      category: string
      brand?: string
    }>()

    // Process shopping history
    shoppingHistory.forEach(list => {
      list.items?.forEach((item: any) => {
        const key = `${item.brand || ''}_${item.name}`.toLowerCase()
        const existing = itemFrequency.get(key)
        
        if (existing) {
          existing.count++
          existing.totalPrice += item.price
          if (new Date(list.date) > existing.lastAdded) {
            existing.lastAdded = new Date(list.date)
          }
        } else {
          itemFrequency.set(key, {
            count: 1,
            lastAdded: new Date(list.date || Date.now()),
            totalPrice: item.price,
            category: item.category || 'Grocery',
            brand: item.brand
          })
        }
      })
    })

    // Convert to QuickAddItem array and sort by frequency and recency
    const items: QuickAddItem[] = Array.from(itemFrequency.entries()).map(([key, data]) => {
      const [brand, ...nameParts] = key.split('_')
      const name = nameParts.join(' ')
      
      return {
        id: key,
        name: name || brand,
        brand: brand !== name ? brand : undefined,
        category: data.category,
        frequency: data.count,
        lastAdded: data.lastAdded,
        averagePrice: data.totalPrice / data.count,
        isInQuickList: true
      }
    })

    // Sort by frequency (descending) and recency
    items.sort((a, b) => {
      const frequencyDiff = b.frequency - a.frequency
      if (frequencyDiff !== 0) return frequencyDiff
      
      return b.lastAdded.getTime() - a.lastAdded.getTime()
    })

    // Add some common grocery items if history is limited
    if (items.length < 10) {
      const commonItems: QuickAddItem[] = [
        { id: 'milk', name: 'Milk', category: 'Dairy', frequency: 0, lastAdded: new Date(), averagePrice: 3.49, isInQuickList: true },
        { id: 'bread', name: 'Bread', category: 'Bakery', frequency: 0, lastAdded: new Date(), averagePrice: 2.99, isInQuickList: true },
        { id: 'eggs', name: 'Eggs', category: 'Dairy', frequency: 0, lastAdded: new Date(), averagePrice: 3.99, isInQuickList: true },
        { id: 'bananas', name: 'Bananas', category: 'Produce', frequency: 0, lastAdded: new Date(), averagePrice: 1.99, isInQuickList: true },
        { id: 'chicken', name: 'Chicken Breast', category: 'Meat', frequency: 0, lastAdded: new Date(), averagePrice: 7.99, isInQuickList: true },
        { id: 'rice', name: 'Rice', category: 'Pantry', frequency: 0, lastAdded: new Date(), averagePrice: 4.99, isInQuickList: true },
        { id: 'pasta', name: 'Pasta', category: 'Pantry', frequency: 0, lastAdded: new Date(), averagePrice: 1.99, isInQuickList: true },
        { id: 'cheese', name: 'Cheese', category: 'Dairy', frequency: 0, lastAdded: new Date(), averagePrice: 5.99, isInQuickList: true }
      ]
      
      // Add common items that aren't already in the list
      commonItems.forEach(commonItem => {
        if (!items.some(item => item.name.toLowerCase() === commonItem.name.toLowerCase())) {
          items.push(commonItem)
        }
      })
    }

    setQuickAddItems(items.slice(0, 20)) // Limit to top 20 items
  }, [shoppingHistory])

  useEffect(() => {
    generateQuickAddItems()
  }, [shoppingHistory, generateQuickAddItems])

  const handleAddToList = (item: QuickAddItem) => {
    onAddToList(item)
  }

  const handleRemoveFromQuickList = (itemId: string) => {
    setQuickAddItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, isInQuickList: false }
          : item
      )
    )
    onRemoveFromQuickList(itemId)
  }

  const handleAddBackToQuickList = (itemId: string) => {
    setQuickAddItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, isInQuickList: true }
          : item
      )
    )
  }

  const getFrequencyBadge = (frequency: number) => {
    if (frequency >= 5) return { variant: 'default' as const, text: 'Very Frequent' }
    if (frequency >= 3) return { variant: 'secondary' as const, text: 'Frequent' }
    if (frequency >= 1) return { variant: 'outline' as const, text: 'Occasional' }
    return { variant: 'outline' as const, text: 'New' }
  }

  const getTimeSinceLastAdded = (date: Date) => {
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  const activeItems = quickAddItems.filter(item => item.isInQuickList)
  const removedItems = quickAddItems.filter(item => !item.isInQuickList)
  
  // Pagination controls
  const canScrollLeft = currentIndex > 0
  const canScrollRight = currentIndex + ITEMS_PER_VIEW < activeItems.length
  const visibleActiveItems = activeItems.slice(currentIndex, currentIndex + ITEMS_PER_VIEW)
  
  const scrollLeft = () => {
    setCurrentIndex(Math.max(0, currentIndex - ITEMS_PER_VIEW))
  }
  
  const scrollRight = () => {
    setCurrentIndex(Math.min(activeItems.length - ITEMS_PER_VIEW, currentIndex + ITEMS_PER_VIEW))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shopping History
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeItems.length} items
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No shopping history yet</p>
            <p className="text-xs">Items will appear here based on your previous shopping lists</p>
          </div>
        ) : (
          <>
            {/* Active Quick Add Items */}
            <div className="grid grid-cols-1 gap-2">
              {activeItems.map((item) => {
                const frequencyBadge = getFrequencyBadge(item.frequency)
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">
                          {item.brand ? `${item.brand} ${item.name}` : item.name}
                        </h4>
                        {item.frequency > 0 && (
                          <Badge variant={frequencyBadge.variant} className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            {item.frequency}x
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ${item.averagePrice.toFixed(2)}
                        </span>
                        {item.frequency > 0 && (
                          <span className="text-xs text-muted-foreground">
                            • Last: {getTimeSinceLastAdded(item.lastAdded)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToList(item)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromQuickList(item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recently Removed Items */}
            {removedItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">Recently Removed</span>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                {removedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                    <div className="flex-1 opacity-60">
                      <h4 className="font-medium text-sm line-through">
                        {item.brand ? `${item.brand} ${item.name}` : item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ${item.averagePrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddBackToQuickList(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            <strong>Shopping History</strong> shows frequently purchased items from your previous shopping lists. 
            Use <Plus className="h-3 w-3 inline mx-1" /> to add to your current list or 
            <Minus className="h-3 w-3 inline mx-1" /> to hide items you don't need.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}