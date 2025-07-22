import { useState } from 'react'
import { ChefHat, Smartphone, Monitor, Tablet, Users, Shield, RefreshCw, ShoppingCart, DollarSign, Zap } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import blink from '../blink/client'

interface SignInScreenProps {
  onSignIn?: () => void
}

export function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [isSigningIn, setIsSigningIn] = useState(false)

  const handleSignIn = async () => {
    setIsSigningIn(true)
    try {
      await blink.auth.login()
      onSignIn?.()
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* App Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Recipe Scanner</h1>
              <p className="text-sm text-muted-foreground">Price Comparison & Shopping Lists</p>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">What You Can Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                  <ChefHat className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium">Scan Recipes</p>
                <p className="text-xs text-muted-foreground">From photos or URLs</p>
              </div>
              
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm font-medium">Smart Lists</p>
                <p className="text-xs text-muted-foreground">Auto-generated</p>
              </div>
              
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm font-medium">Price Compare</p>
                <p className="text-xs text-muted-foreground">Local stores</p>
              </div>
              
              <div className="text-center">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-sm font-medium">Flash Sales</p>
                <p className="text-xs text-muted-foreground">Best deals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-Device Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5" />
              Works on All Your Devices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-center">
                <Smartphone className="h-8 w-8 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Phone</p>
              </div>
              <div className="text-center">
                <Tablet className="h-8 w-8 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Tablet</p>
              </div>
              <div className="text-center">
                <Monitor className="h-8 w-8 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Desktop</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-sm">Shopping lists sync instantly across devices</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-sm">Real-time updates when items are added/removed</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-sm">Access from anywhere with secure sign-in</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Sharing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Family Sharing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">Share lists with family members</p>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">See who's shopping in real-time</p>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm">Collaborative grocery planning</p>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Secure & Private</p>
                <p className="text-xs text-green-700 mt-1">
                  Your data is encrypted and secure. Sign in with the same email on any device to access your lists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign In Button */}
        <div className="space-y-4">
          <Button 
            onClick={handleSignIn} 
            disabled={isSigningIn}
            className="w-full h-12 text-base font-medium"
          >
            {isSigningIn ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Signing In...
              </div>
            ) : (
              'Sign In to Get Started'
            )}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            <br />
            Your account works on all devices automatically.
          </p>
        </div>

        {/* Demo Notice */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-center text-blue-700">
              <strong>Demo Mode:</strong> This app demonstrates smart recipe scanning and price comparison features. 
              Some data is simulated for demonstration purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}