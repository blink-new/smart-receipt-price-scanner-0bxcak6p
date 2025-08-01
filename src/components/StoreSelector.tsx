import { useState } from 'react'
import { MapPin, Phone, Clock, Check, Star } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { NearbyStore } from '../services/locationService'

interface StoreSelectorProps {
  stores: NearbyStore[]
  selectedStoreId?: string
  onStoreSelected: (store: NearbyStore) => void
  userLocation?: { city: string; province: string }
}

export function StoreSelector({ stores, selectedStoreId, onStoreSelected, userLocation }: StoreSelectorProps) {
  const [hoveredStore, setHoveredStore] = useState<string | null>(null)

  const sortedStores = [...stores].sort((a, b) => a.distance - b.distance)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Select Shopping Store
        </CardTitle>
        {userLocation && (
          <p className="text-sm text-muted-foreground">
            Stores near {userLocation.city}, {userLocation.province}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {sortedStores.map((store) => (
              <div
                key={store.id}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  selectedStoreId === store.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : hoveredStore === store.id
                    ? 'border-primary/50 bg-muted/50'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() => onStoreSelected(store)}
                onMouseEnter={() => setHoveredStore(store.id)}
                onMouseLeave={() => setHoveredStore(null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{store.name}</h3>
                      {selectedStoreId === store.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {store.chain}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {store.distance.toFixed(1)} km
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">
                      {store.address}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {store.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {store.phone}
                        </div>
                      )}
                      {store.hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {store.hours}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Distance indicator */}
                  <div className="flex flex-col items-end">
                    <div className={`text-xs font-medium ${
                      store.distance <= 1 ? 'text-green-600' :
                      store.distance <= 3 ? 'text-yellow-600' :
                      'text-muted-foreground'
                    }`}>
                      {store.distance.toFixed(1)} km
                    </div>
                    {store.distance <= 1 && (
                      <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                        <Star className="h-3 w-3 fill-current" />
                        <span>Closest</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {stores.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stores found in your area</p>
            <p className="text-xs mt-1">Try expanding your search radius in settings</p>
          </div>
        )}
        
        {selectedStoreId && (
          <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="font-medium">
                Selected: {stores.find(s => s.id === selectedStoreId)?.name}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This store will be used for price comparisons and shopping list optimization
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}