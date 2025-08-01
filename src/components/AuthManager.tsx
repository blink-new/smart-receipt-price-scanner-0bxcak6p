import { useState, useEffect } from 'react'
import { User, Smartphone, Monitor, Tablet, Globe, Clock, Shield, Users, Settings, LogOut, UserPlus } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Alert, AlertDescription } from './ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import blink from '../blink/client'
import multiDeviceSync, { type DeviceInfo } from '../services/multiDeviceSync'

interface UserSession {
  id: string
  deviceType: 'mobile' | 'desktop' | 'tablet'
  browser: string
  location: string
  lastActive: string
  isCurrentSession: boolean
}

interface UserProfile {
  id: string
  displayName: string
  email: string
  avatar?: string
  joinedAt: string
  preferences: {
    location: {
      city: string
      province: string
    }
    dietary: string[]
    allergens: string[]
  }
}

interface AuthManagerProps {
  user: any
  onSignOut: () => void
}

export function AuthManager({ user, onSignOut }: AuthManagerProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([])
  const [activeDevices, setActiveDevices] = useState<DeviceInfo[]>([])
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [updateMessage, setUpdateMessage] = useState('')

  // Initialize multi-device sync and load real device data
  useEffect(() => {
    if (user) {
      // Set user profile
      setUserProfile({
        id: user.id,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email,
        avatar: user.avatar,
        joinedAt: user.createdAt || new Date().toISOString(),
        preferences: {
          location: {
            city: 'Unknown',
            province: 'Unknown'
          },
          dietary: [],
          allergens: []
        }
      })

      setDisplayName(user.displayName || user.email?.split('@')[0] || '')

      // Initialize multi-device sync
      const initializeSync = async () => {
        try {
          await multiDeviceSync.initialize(user)
          
          // Get initial active devices
          const devices = await multiDeviceSync.getActiveDevices()
          setActiveDevices(devices)
          
          // Convert devices to sessions format for display
          const currentDeviceId = multiDeviceSync.getCurrentDeviceId()
          const sessions: UserSession[] = devices.map(device => ({
            id: device.id,
            deviceType: device.type,
            browser: device.browser,
            location: device.location ? `${device.location.city}, ${device.location.province}` : 'Unknown',
            lastActive: device.lastActive,
            isCurrentSession: device.id === currentDeviceId
          }))
          setActiveSessions(sessions)
        } catch (error) {
          console.error('Failed to initialize multi-device sync:', error)
          
          // Fallback to mock data if sync fails
          const mockSessions: UserSession[] = [
            {
              id: 'current_device',
              deviceType: /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Browser',
              location: 'Unknown Location',
              lastActive: new Date().toISOString(),
              isCurrentSession: true
            }
          ]
          setActiveSessions(mockSessions)
        }
      }

      initializeSync()

      // Subscribe to device updates
      const unsubscribeDevices = multiDeviceSync.onDeviceUpdate((devices) => {
        setActiveDevices(devices)
        
        const currentDeviceId = multiDeviceSync.getCurrentDeviceId()
        const sessions: UserSession[] = devices.map(device => ({
          id: device.id,
          deviceType: device.type,
          browser: device.browser,
          location: device.location ? `${device.location.city}, ${device.location.province}` : 'Unknown',
          lastActive: device.lastActive,
          isCurrentSession: device.id === currentDeviceId
        }))
        setActiveSessions(sessions)
      })

      return () => {
        unsubscribeDevices()
      }
    }
  }, [user])

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const updateProfile = async () => {
    if (!user) return

    setIsUpdatingProfile(true)
    setUpdateMessage('')

    try {
      await blink.auth.updateMe({
        displayName: displayName.trim()
      })

      setUpdateMessage('Profile updated successfully!')
      
      // Update local state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          displayName: displayName.trim()
        })
      }

      setTimeout(() => {
        setUpdateMessage('')
        setIsProfileDialogOpen(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to update profile:', error)
      setUpdateMessage('Failed to update profile. Please try again.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const signOutFromAllDevices = async () => {
    try {
      // Sign out from all sessions
      await blink.auth.logout()
      onSignOut()
    } catch (error) {
      console.error('Failed to sign out from all devices:', error)
    }
  }

  if (!userProfile) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </div>
            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={userProfile.email} disabled />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>

                  {updateMessage && (
                    <Alert>
                      <AlertDescription>{updateMessage}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={updateProfile} 
                      disabled={isUpdatingProfile || !displayName.trim()}
                      className="flex-1"
                    >
                      {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsProfileDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold">
              {userProfile.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{userProfile.displayName}</p>
              <p className="text-sm text-muted-foreground">{userProfile.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Joined {new Date(userProfile.joinedAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {userProfile.preferences.location.city}, {userProfile.preferences.location.province}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Active Sessions
            </div>
            <Badge variant="outline" className="text-xs">
              {activeSessions.length} devices
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getDeviceIcon(session.deviceType)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{session.browser}</p>
                    {session.isCurrentSession && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{session.location}</span>
                    <span>•</span>
                    <span>{getTimeAgo(session.lastActive)}</span>
                  </div>
                </div>
              </div>
              
              {!session.isCurrentSession && (
                <Button variant="ghost" size="sm" className="text-destructive">
                  End Session
                </Button>
              )}
            </div>
          ))}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Signed in on {activeSessions.length} device{activeSessions.length !== 1 ? 's' : ''}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOutFromAllDevices}
              className="text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign Out All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Family Sharing Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Sharing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Multi-Device Shopping Lists</p>
              <p className="text-xs text-muted-foreground">
                Your shopping lists sync across all your devices automatically
              </p>
            </div>
            <Badge variant="default" className="text-xs bg-green-600">
              Active
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Real-time Updates</p>
              <p className="text-xs text-muted-foreground">
                See changes instantly when you add/remove items on any device
              </p>
            </div>
            <Badge variant="default" className="text-xs bg-green-600">
              Active
            </Badge>
          </div>

          <Separator />

          <div className="text-center">
            <Button variant="outline" size="sm" className="w-full">
              <UserPlus className="h-4 w-4 mr-1" />
              Invite Family Members
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Share shopping lists with family members
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Secure Multi-Device Access:</strong> Your account is protected with secure authentication. 
          You can access your shopping lists from any device by signing in with the same email address.
        </AlertDescription>
      </Alert>
    </div>
  )
}