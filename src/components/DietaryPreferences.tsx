import { useState } from 'react'
import { Settings, Leaf, Shield, Heart, AlertTriangle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Separator } from './ui/separator'

export interface DietaryPreference {
  id: string
  name: string
  type: 'diet' | 'allergen' | 'lifestyle'
  icon: React.ReactNode
  description: string
  enabled: boolean
}

const DEFAULT_PREFERENCES: DietaryPreference[] = [
  {
    id: 'vegan',
    name: 'Vegan',
    type: 'diet',
    icon: <Leaf className="h-4 w-4 text-green-600" />,
    description: 'No animal products',
    enabled: false
  },
  {
    id: 'vegetarian',
    name: 'Vegetarian',
    type: 'diet',
    icon: <Leaf className="h-4 w-4 text-green-500" />,
    description: 'No meat or fish',
    enabled: false
  },
  {
    id: 'keto',
    name: 'Keto',
    type: 'diet',
    icon: <Heart className="h-4 w-4 text-purple-600" />,
    description: 'Low carb, high fat',
    enabled: false
  },
  {
    id: 'gluten-free',
    name: 'Gluten-Free',
    type: 'allergen',
    icon: <Shield className="h-4 w-4 text-blue-600" />,
    description: 'No gluten-containing grains',
    enabled: false
  },
  {
    id: 'dairy-free',
    name: 'Dairy-Free',
    type: 'allergen',
    icon: <Shield className="h-4 w-4 text-orange-600" />,
    description: 'No milk or dairy products',
    enabled: false
  },
  {
    id: 'nut-free',
    name: 'Nut-Free',
    type: 'allergen',
    icon: <Shield className="h-4 w-4 text-red-600" />,
    description: 'No tree nuts or peanuts',
    enabled: false
  },
  {
    id: 'organic',
    name: 'Organic',
    type: 'lifestyle',
    icon: <Leaf className="h-4 w-4 text-green-700" />,
    description: 'Certified organic products',
    enabled: false
  },
  {
    id: 'non-gmo',
    name: 'Non-GMO',
    type: 'lifestyle',
    icon: <Shield className="h-4 w-4 text-teal-600" />,
    description: 'No genetically modified ingredients',
    enabled: false
  }
]

interface DietaryPreferencesProps {
  preferences: string[]
  allergens: string[]
  onPreferencesChange: (preferences: string[]) => void
  onAllergensChange: (allergens: string[]) => void
}

export function DietaryPreferences({ 
  preferences, 
  allergens, 
  onPreferencesChange, 
  onAllergensChange 
}: DietaryPreferencesProps) {
  const [localPreferences, setLocalPreferences] = useState<DietaryPreference[]>(() => {
    return DEFAULT_PREFERENCES.map(pref => ({
      ...pref,
      enabled: preferences.includes(pref.id) || allergens.includes(pref.id)
    }))
  })
  const [customAllergen, setCustomAllergen] = useState('')

  const handlePreferenceToggle = (prefId: string) => {
    const updatedPrefs = localPreferences.map(pref => 
      pref.id === prefId ? { ...pref, enabled: !pref.enabled } : pref
    )
    setLocalPreferences(updatedPrefs)

    // Update parent state
    const enabledDiets = updatedPrefs
      .filter(pref => pref.enabled && pref.type === 'diet')
      .map(pref => pref.id)
    
    const enabledAllergens = updatedPrefs
      .filter(pref => pref.enabled && (pref.type === 'allergen' || pref.type === 'lifestyle'))
      .map(pref => pref.id)

    onPreferencesChange(enabledDiets)
    onAllergensChange([...enabledAllergens, ...allergens.filter(a => !DEFAULT_PREFERENCES.some(p => p.id === a))])
  }

  const addCustomAllergen = () => {
    if (customAllergen.trim() && !allergens.includes(customAllergen.trim().toLowerCase())) {
      const newAllergens = [...allergens, customAllergen.trim().toLowerCase()]
      onAllergensChange(newAllergens)
      setCustomAllergen('')
    }
  }

  const removeCustomAllergen = (allergen: string) => {
    const newAllergens = allergens.filter(a => a !== allergen)
    onAllergensChange(newAllergens)
  }

  const getPreferencesByType = (type: string) => {
    return localPreferences.filter(pref => pref.type === type)
  }

  const customAllergens = allergens.filter(a => 
    !DEFAULT_PREFERENCES.some(p => p.id === a)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Dietary Preferences & Allergies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Diet Preferences */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Leaf className="h-4 w-4 text-green-600" />
            Diet Preferences
          </h4>
          <div className="space-y-2">
            {getPreferencesByType('diet').map((pref) => (
              <div key={pref.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  {pref.icon}
                  <div>
                    <Label htmlFor={pref.id} className="font-medium text-sm">
                      {pref.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={pref.id}
                  checked={pref.enabled}
                  onCheckedChange={() => handlePreferenceToggle(pref.id)}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Allergen Restrictions */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Allergen Restrictions
          </h4>
          <div className="space-y-2">
            {getPreferencesByType('allergen').map((pref) => (
              <div key={pref.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  {pref.icon}
                  <div>
                    <Label htmlFor={pref.id} className="font-medium text-sm">
                      {pref.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={pref.id}
                  checked={pref.enabled}
                  onCheckedChange={() => handlePreferenceToggle(pref.id)}
                />
              </div>
            ))}
          </div>

          {/* Custom Allergens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Custom Allergens</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom allergen..."
                value={customAllergen}
                onChange={(e) => setCustomAllergen(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomAllergen()}
                className="text-sm"
              />
              <Button 
                size="sm" 
                onClick={addCustomAllergen}
                disabled={!customAllergen.trim()}
              >
                Add
              </Button>
            </div>
            
            {customAllergens.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {customAllergens.map((allergen) => (
                  <Badge 
                    key={allergen} 
                    variant="destructive" 
                    className="text-xs flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {allergen}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => removeCustomAllergen(allergen)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Lifestyle Preferences */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Heart className="h-4 w-4 text-purple-600" />
            Lifestyle Preferences
          </h4>
          <div className="space-y-2">
            {getPreferencesByType('lifestyle').map((pref) => (
              <div key={pref.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-3">
                  {pref.icon}
                  <div>
                    <Label htmlFor={pref.id} className="font-medium text-sm">
                      {pref.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {pref.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={pref.id}
                  checked={pref.enabled}
                  onCheckedChange={() => handlePreferenceToggle(pref.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Active Preferences Summary */}
        {(preferences.length > 0 || allergens.length > 0) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Active Preferences</h4>
              <div className="flex flex-wrap gap-2">
                {preferences.map((pref) => {
                  const prefData = DEFAULT_PREFERENCES.find(p => p.id === pref)
                  return (
                    <Badge key={pref} variant="default" className="text-xs flex items-center gap-1">
                      {prefData?.icon}
                      {prefData?.name || pref}
                    </Badge>
                  )
                })}
                {allergens.map((allergen) => {
                  const prefData = DEFAULT_PREFERENCES.find(p => p.id === allergen)
                  return (
                    <Badge key={allergen} variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {prefData?.name || allergen}
                    </Badge>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}