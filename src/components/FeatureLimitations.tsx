import { AlertTriangle, Wifi, Database, MapPin, DollarSign, Scan } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

export function FeatureLimitations() {
  const features = [
    {
      name: 'Recipe URL Scanning',
      status: 'working',
      icon: <Scan className="h-4 w-4" />,
      description: 'Real AI-powered website parsing and ingredient extraction',
      limitations: ['Some recipe sites may block scraping', 'Complex recipe formats may need refinement']
    },
    {
      name: 'Recipe Image Upload',
      status: 'working',
      icon: <Scan className="h-4 w-4" />,
      description: 'AI vision to extract ingredients from recipe photos',
      limitations: ['Accuracy depends on image quality', 'Handwritten recipes may be harder to read']
    },
    {
      name: 'Website Item Extraction',
      status: 'working',
      icon: <Scan className="h-4 w-4" />,
      description: 'Extract grocery items from flyer/shopping websites',
      limitations: ['Some sites may block automated access', 'Item matching accuracy varies']
    },
    {
      name: 'GPS Location',
      status: 'working',
      icon: <MapPin className="h-4 w-4" />,
      description: 'Real GPS coordinates with AI-powered address lookup',
      limitations: ['Address accuracy depends on web search results', 'May fallback to coordinates only']
    },
    {
      name: 'Price Comparison',
      status: 'working',
      icon: <DollarSign className="h-4 w-4" />,
      description: 'Real web search + AI analysis for current market prices',
      limitations: ['Based on publicly available price data', 'Not direct store API integration', 'Prices are estimates from search results']
    },
    {
      name: 'Store Locations',
      status: 'working',
      icon: <Database className="h-4 w-4" />,
      description: 'Real store finder using web search and local business data',
      limitations: ['Store info accuracy depends on search results', 'Distance calculations are estimates', 'Store hours may not be current']
    },
    {
      name: 'Barcode Database',
      status: 'working',
      icon: <Scan className="h-4 w-4" />,
      description: 'Local database with real online product lookup',
      limitations: ['Online lookup depends on web search results', 'Product info accuracy varies', 'Not connected to official barcode databases']
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800'
      case 'limited': return 'bg-yellow-100 text-yellow-800'
      case 'demo': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return 'Fully Working'
      case 'limited': return 'Limited Function'
      case 'demo': return 'Demo/Mock Data'
      default: return 'Unknown'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          Feature Status & Limitations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This app now uses real AI-powered services for most features. Data accuracy depends on publicly available information and web search results.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <span className="font-medium text-sm">{feature.name}</span>
                </div>
                <Badge className={`text-xs ${getStatusColor(feature.status)}`}>
                  {getStatusText(feature.status)}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {feature.description}
              </p>
              
              {feature.limitations.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <strong>Limitations:</strong>
                  <ul className="mt-1 space-y-1">
                    {feature.limitations.map((limitation, i) => (
                      <li key={i}>• {limitation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <strong>Current Implementation:</strong>
            <ul className="mt-2 text-xs space-y-1">
              <li>✅ Real GPS with AI-powered address lookup</li>
              <li>✅ Live web search for store locations and prices</li>
              <li>✅ AI analysis of current market data</li>
              <li>✅ Online barcode product lookup</li>
              <li>⚠️ Data accuracy depends on web search quality</li>
            </ul>
            <strong className="block mt-2">For production-grade accuracy:</strong>
            <ul className="mt-1 text-xs space-y-1">
              <li>• Direct store API integrations</li>
              <li>• Official barcode databases (UPC Database, etc.)</li>
              <li>• Professional geocoding services</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}