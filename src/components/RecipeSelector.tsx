import { useState } from 'react'
import { ChefHat, X, Check, Clock, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'

interface RecipeOption {
  title: string
  preview: string
  servings?: number
  ingredients: Array<{
    name: string
    quantity?: string
    unit?: string
    category?: string
    originalText: string
  }>
}

interface RecipeSelectorProps {
  recipes: RecipeOption[]
  sourceUrl: string
  onRecipeSelected: (recipe: RecipeOption) => void
  onClose: () => void
}

export function RecipeSelector({ recipes, sourceUrl, onRecipeSelected, onClose }: RecipeSelectorProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeOption | null>(null)

  const handleSelectRecipe = () => {
    if (selectedRecipe) {
      onRecipeSelected(selectedRecipe)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              Multiple Recipes Found
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Found {recipes.length} recipes on this page. Select the one you want to add to your shopping list:
          </p>
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Source:</strong> {sourceUrl}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {recipes.map((recipe, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedRecipe === recipe
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-base line-clamp-2">{recipe.title}</h3>
                    {selectedRecipe === recipe && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {recipe.preview}
                  </p>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{recipe.ingredients.length} ingredients</span>
                    </div>
                    {recipe.servings && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>Serves {recipe.servings}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Ingredient Preview */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Ingredients preview:</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.slice(0, 6).map((ingredient, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {ingredient.name}
                        </Badge>
                      ))}
                      {recipe.ingredients.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.ingredients.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
        
        <div className="flex-shrink-0 border-t p-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {selectedRecipe ? `Selected: ${selectedRecipe.title}` : 'Select a recipe to continue'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSelectRecipe} 
              disabled={!selectedRecipe}
            >
              Add to Shopping List
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}