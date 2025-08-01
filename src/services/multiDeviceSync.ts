import blink from '../blink/client'

export interface DeviceInfo {
  id: string
  type: 'mobile' | 'desktop' | 'tablet'
  browser: string
  os: string
  lastActive: string
  location?: {
    city: string
    province: string
  }
}

export interface SyncEvent {
  type: 'shopping_list_updated' | 'item_added' | 'item_removed' | 'item_checked' | 'location_changed'
  deviceId: string
  userId: string
  timestamp: string
  data: any
}

export interface UserSession {
  id: string
  userId: string
  deviceInfo: DeviceInfo
  isActive: boolean
  createdAt: string
  lastSeen: string
}

class MultiDeviceSync {
  private static instance: MultiDeviceSync
  private currentDeviceId: string
  private currentUser: any = null
  private realtimeChannel: any = null
  private syncCallbacks: Array<(event: SyncEvent) => void> = []
  private deviceCallbacks: Array<(devices: DeviceInfo[]) => void> = []
  private isInitialized: boolean = false

  private constructor() {
    this.currentDeviceId = this.generateDeviceId()
  }

  public static getInstance(): MultiDeviceSync {
    if (!MultiDeviceSync.instance) {
      MultiDeviceSync.instance = new MultiDeviceSync()
    }
    return MultiDeviceSync.instance
  }

  // Generate a unique device ID based on browser fingerprint
  private generateDeviceId(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('Device fingerprint', 10, 10)
    const fingerprint = canvas.toDataURL()
    
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      fingerprint: fingerprint.slice(-50) // Last 50 chars of canvas fingerprint
    }
    
    // Create a simple hash of device info
    const deviceString = JSON.stringify(deviceInfo)
    let hash = 0
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `device_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`
  }

  // Get current device information
  private getCurrentDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop'
    let browser = 'Unknown'
    let os = 'Unknown'

    // Detect device type
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      if (/iPad/i.test(userAgent)) {
        deviceType = 'tablet'
      } else {
        deviceType = 'mobile'
      }
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('Android')) os = 'Android'
    else if (userAgent.includes('iOS')) os = 'iOS'

    return {
      id: this.currentDeviceId,
      type: deviceType,
      browser: `${browser} ${deviceType === 'mobile' ? 'Mobile' : 'Desktop'}`,
      os,
      lastActive: new Date().toISOString()
    }
  }

  // Initialize multi-device sync for user
  public async initialize(user: any): Promise<void> {
    if (this.isInitialized && this.currentUser?.id === user.id) {
      console.log('Multi-device sync already initialized for this user')
      return
    }

    // Cleanup any existing connection first
    await this.cleanup()

    this.currentUser = user
    const deviceInfo = this.getCurrentDeviceInfo()

    try {
      // Connect to user's sync channel with retry logic
      await this.initializeWithRetry(user, deviceInfo)

      this.isInitialized = true
      console.log('Multi-device sync initialized for device:', this.currentDeviceId)
    } catch (error) {
      console.error('Failed to initialize multi-device sync:', error)
      // Reset state on failure
      this.currentUser = null
      this.realtimeChannel = null
      this.isInitialized = false
      throw error // Re-throw to let caller handle
    }
  }

  // Initialize with retry logic
  private async initializeWithRetry(user: any, deviceInfo: DeviceInfo, maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Multi-device sync initialization attempt ${attempt}/${maxRetries}`)
        
        // Create channel with unique identifier to prevent conflicts
        const channelId = `sync_${user.id}_${Date.now()}`
        this.realtimeChannel = blink.realtime.channel(channelId)
        
        // Subscribe with timeout and better error handling
        await Promise.race([
          this.realtimeChannel.subscribe({
            userId: user.id,
            metadata: {
              deviceId: this.currentDeviceId,
              deviceInfo,
              joinedAt: new Date().toISOString(),
              sessionId: Date.now().toString() // Add session ID for uniqueness
            }
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Subscription timeout - no acknowledgment from server')), 8000)
          )
        ])

        // Set up message listeners with better error handling
        this.realtimeChannel.onMessage((message: any) => {
          try {
            // Validate message structure
            if (!message || typeof message !== 'object') {
              console.warn('Invalid sync message received:', message)
              return
            }

            if (message.type === 'sync_event' && message.data && message.data.deviceId !== this.currentDeviceId) {
              // Only process events from other devices
              this.syncCallbacks.forEach(callback => {
                try {
                  callback(message.data as SyncEvent)
                } catch (callbackError) {
                  console.error('Error in sync callback:', callbackError)
                }
              })
            }
          } catch (error) {
            console.error('Error processing sync message:', error)
          }
        })

        // Set up presence listeners with better error handling
        this.realtimeChannel.onPresence((users: any[]) => {
          try {
            // Validate users array
            if (!Array.isArray(users)) {
              console.warn('Invalid device users data received:', users)
              return
            }

            const devices: DeviceInfo[] = users
              .filter(u => u && u.metadata?.deviceInfo)
              .map(u => ({
                ...u.metadata.deviceInfo,
                lastActive: new Date().toISOString()
              }))

            this.deviceCallbacks.forEach(callback => {
              try {
                callback(devices)
              } catch (callbackError) {
                console.error('Error in device callback:', callbackError)
              }
            })
          } catch (error) {
            console.error('Error processing device presence update:', error)
          }
        })

        // Register this device session
        await this.registerDeviceSession(deviceInfo)

        // Success - break out of retry loop
        console.log(`Multi-device sync connected successfully on attempt ${attempt}`)
        return
        
      } catch (error) {
        lastError = error as Error
        console.warn(`Multi-device sync initialization attempt ${attempt} failed:`, error)
        
        // Clean up failed connection
        if (this.realtimeChannel) {
          try {
            await this.realtimeChannel.unsubscribe()
          } catch (cleanupError) {
            console.warn('Failed to cleanup failed sync connection:', cleanupError)
          }
          this.realtimeChannel = null
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          console.log(`Waiting ${delay}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // All retries failed
    throw lastError || new Error('Failed to initialize multi-device sync after all retries')
  }

  // Register current device session
  private async registerDeviceSession(deviceInfo: DeviceInfo): Promise<void> {
    if (!this.currentUser) return

    try {
      // In a real app, this would save to a database
      // For demo purposes, we'll just log it
      console.log('Device session registered:', {
        userId: this.currentUser.id,
        deviceId: this.currentDeviceId,
        deviceInfo,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to register device session:', error)
    }
  }

  // Broadcast sync event to all other devices
  public async broadcastSyncEvent(event: Omit<SyncEvent, 'deviceId' | 'userId' | 'timestamp'>): Promise<void> {
    if (!this.isInitialized || !this.currentUser) return

    const syncEvent: SyncEvent = {
      ...event,
      deviceId: this.currentDeviceId,
      userId: this.currentUser.id,
      timestamp: new Date().toISOString()
    }

    try {
      await this.realtimeChannel.publish('sync_event', syncEvent)
      console.log('Sync event broadcasted:', syncEvent.type)
    } catch (error) {
      console.error('Failed to broadcast sync event:', error)
    }
  }

  // Subscribe to sync events from other devices
  public onSyncEvent(callback: (event: SyncEvent) => void): () => void {
    this.syncCallbacks.push(callback)
    
    return () => {
      this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback)
    }
  }

  // Subscribe to device presence updates
  public onDeviceUpdate(callback: (devices: DeviceInfo[]) => void): () => void {
    this.deviceCallbacks.push(callback)
    
    return () => {
      this.deviceCallbacks = this.deviceCallbacks.filter(cb => cb !== callback)
    }
  }

  // Get all active devices for current user
  public async getActiveDevices(): Promise<DeviceInfo[]> {
    if (!this.isInitialized) return []

    try {
      const users = await this.realtimeChannel.getPresence()
      return users
        .filter((u: any) => u.metadata?.deviceInfo)
        .map((u: any) => ({
          ...u.metadata.deviceInfo,
          lastActive: new Date().toISOString()
        }))
    } catch (error) {
      console.error('Failed to get active devices:', error)
      return []
    }
  }

  // Update device activity
  public async updateActivity(): Promise<void> {
    if (!this.isInitialized) return

    try {
      const deviceInfo = this.getCurrentDeviceInfo()
      await this.registerDeviceSession(deviceInfo)
    } catch (error) {
      console.error('Failed to update device activity:', error)
    }
  }

  // Cleanup when user logs out
  public async cleanup(): Promise<void> {
    try {
      if (this.realtimeChannel) {
        try {
          // Add timeout to prevent hanging cleanup
          await Promise.race([
            this.realtimeChannel.unsubscribe(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
            )
          ])
        } catch (unsubscribeError) {
          console.warn('Failed to unsubscribe from sync channel:', unsubscribeError)
          // Continue with cleanup even if unsubscribe fails
        }
        this.realtimeChannel = null
      }
      
      // Clear all callbacks and state
      this.syncCallbacks = []
      this.deviceCallbacks = []
      this.currentUser = null
      this.isInitialized = false
      
      console.log('Multi-device sync cleaned up successfully')
    } catch (error) {
      console.error('Failed to cleanup multi-device sync:', error)
      // Force reset state even if cleanup fails
      this.realtimeChannel = null
      this.syncCallbacks = []
      this.deviceCallbacks = []
      this.currentUser = null
      this.isInitialized = false
    }
  }

  // Get current device ID
  public getCurrentDeviceId(): string {
    return this.currentDeviceId
  }

  // Check if sync is ready
  public isReady(): boolean {
    return this.isInitialized && this.realtimeChannel !== null
  }
}

export default MultiDeviceSync.getInstance()