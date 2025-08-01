import { Database, Globe, Zap, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

export function DatabaseStatus() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Product Database Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Online Database</span>
          </div>
          <Badge variant="default" className="bg-green-600">
            <Globe className="h-3 w-3 mr-1" />
            Active
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Product Coverage:</span>
            <span className="font-medium text-foreground">Unlimited</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Data Sources:</span>
            <span className="font-medium text-foreground">Multiple APIs</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Real-time Updates:</span>
            <span className="font-medium text-green-600">✓ Enabled</span>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Enhanced Features</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Real product database lookups</li>
            <li>• Live price comparisons across stores</li>
            <li>• Barcode scanning with online verification</li>
            <li>• Product search across grocery databases</li>
            <li>• Flash sales and deal detection</li>
          </ul>
        </div>
        
        <p className="text-xs text-muted-foreground">
          The system searches across multiple online product databases and grocery store APIs 
          with unlimited product coverage and real-time price updates.
        </p>
      </CardContent>
    </Card>
  )
}