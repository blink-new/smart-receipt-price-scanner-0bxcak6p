import blink from '../blink/client'

export interface FamilyMember {
  id: string
  name: string
  email: string
  avatar?: string
  isActive: boolean
  joinedAt: string
  lastSeen?: string
}

export interface ShoppingListUpdate {
  type: 'item_added' | 'item_removed' | 'item_checked' | 'item_scanned' | 'quantity_changed'
  itemId: string
  itemName: string
  userId: string
  userName: string
  timestamp: string
  data?: any
}

export interface FamilyShoppingList {
  id: string
  name: string
  items: Array<{
    id: string
    name: string
    quantity: number
    isInCart: boolean
    isScanned: boolean
    addedBy: string
    addedByName: string
    checkedBy?: string
    checkedByName?: string
    scannedBy?: string
    scannedByName?: string
    timestamp: string
  }>
  members: FamilyMember[]
  lastUpdated: string
}

class FamilySharing {
  private static instance: FamilySharing
  private currentUser: any = null
  private familyId: string | null = null
  private realtimeChannel: any = null
  private onUpdateCallbacks: Array<(update: ShoppingListUpdate) => void> = []
  private onPresenceCallbacks: Array<(members: FamilyMember[]) => void> = []
  private isInitializing: boolean = false
  private isInitialized: boolean = false
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected'

  private constructor() {}

  public static getInstance(): FamilySharing {
    if (!FamilySharing.instance) {
      FamilySharing.instance = new FamilySharing()
    }
    return FamilySharing.instance
  }

  // Check if family sharing is ready to use
  public isReady(): boolean {
    return this.isInitialized && this.realtimeChannel !== null && this.currentUser !== null
  }

  // Initialize family sharing for the current user
  public async initialize(user: any): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.isInitializing) {
      console.log('Family sharing already initializing, waiting...')
      // Wait for current initialization to complete with timeout
      let waitTime = 0
      while (this.isInitializing && waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 100))
        waitTime += 100
      }
      if (this.isInitializing) {
        console.warn('Family sharing initialization timeout, forcing reset')
        this.isInitializing = false
      }
      return
    }

    if (this.isInitialized && this.currentUser?.id === user.id) {
      console.log('Family sharing already initialized for this user')
      return
    }

    this.isInitializing = true
    this.connectionState = 'connecting'
    
    try {
      // Cleanup any existing connection first
      await this.cleanup()
      
      this.currentUser = user
      this.familyId = `family_${user.id}` // Each user has their own family group
      
      // Connect to realtime channel for this family with retry logic
      await this.initializeWithRetry(user)
      
      this.isInitialized = true
      this.connectionState = 'connected'
      console.log('Family sharing initialized for:', user.email)
    } catch (error) {
      console.error('Failed to initialize family sharing:', error)
      this.isInitialized = false
      this.connectionState = 'error'
      // Reset state on failure
      this.currentUser = null
      this.familyId = null
      this.realtimeChannel = null
      throw error // Re-throw to let caller handle
    } finally {
      this.isInitializing = false
    }
  }

  // Initialize with retry logic
  private async initializeWithRetry(user: any, maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Family sharing initialization attempt ${attempt}/${maxRetries}`)
        
        // Create channel with unique identifier to prevent conflicts
        const channelId = `${this.familyId!}_${Date.now()}`
        this.realtimeChannel = blink.realtime.channel(channelId)
        
        // Subscribe with timeout and better error handling
        await Promise.race([
          this.realtimeChannel.subscribe({
            userId: user.id,
            metadata: {
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email,
              avatar: user.avatar || '👤',
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
              console.warn('Invalid message received:', message)
              return
            }

            if (message.type === 'shopping_list_update' && message.data) {
              this.onUpdateCallbacks.forEach(callback => {
                try {
                  callback(message.data as ShoppingListUpdate)
                } catch (callbackError) {
                  console.error('Error in update callback:', callbackError)
                }
              })
            }
          } catch (error) {
            console.error('Error processing message:', error)
          }
        })

        // Set up presence listeners with better error handling
        this.realtimeChannel.onPresence((users: any[]) => {
          try {
            // Validate users array
            if (!Array.isArray(users)) {
              console.warn('Invalid users data received:', users)
              return
            }

            const members: FamilyMember[] = users
              .filter(user => user && user.userId) // Filter out invalid users
              .map(user => ({
                id: user.userId,
                name: user.metadata?.displayName || 'Unknown',
                email: user.metadata?.email || '',
                avatar: user.metadata?.avatar || '👤',
                isActive: true,
                joinedAt: user.metadata?.joinedAt || new Date().toISOString(),
                lastSeen: new Date().toISOString()
              }))

            this.onPresenceCallbacks.forEach(callback => {
              try {
                callback(members)
              } catch (callbackError) {
                console.error('Error in presence callback:', callbackError)
              }
            })
          } catch (error) {
            console.error('Error processing presence update:', error)
          }
        })

        // Success - break out of retry loop
        console.log(`Family sharing connected successfully on attempt ${attempt}`)
        return
        
      } catch (error) {
        lastError = error as Error
        console.warn(`Family sharing initialization attempt ${attempt} failed:`, error)
        
        // Clean up failed connection
        if (this.realtimeChannel) {
          try {
            await this.realtimeChannel.unsubscribe()
          } catch (cleanupError) {
            console.warn('Failed to cleanup failed connection:', cleanupError)
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
    throw lastError || new Error('Failed to initialize family sharing after all retries')
  }

  // Add a family member by email
  public async inviteFamilyMember(email: string): Promise<void> {
    if (!this.currentUser || !this.familyId) {
      throw new Error('Family sharing not initialized')
    }

    try {
      // Store family invitation in database
      await blink.db.family_invitations.create({
        id: `inv_${Date.now()}`,
        family_id: this.familyId,
        invited_by: this.currentUser.id,
        invited_by_name: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User',
        invited_email: email,
        status: 'pending',
        created_at: new Date().toISOString()
      })

      // Send notification through realtime
      await this.realtimeChannel.publish('family_invitation', {
        type: 'member_invited',
        email: email,
        invitedBy: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User',
        timestamp: new Date().toISOString()
      })

      console.log('Family member invited:', email)
    } catch (error) {
      console.error('Failed to invite family member:', error)
      throw error
    }
  }

  // Broadcast shopping list update to all family members
  public async broadcastUpdate(update: ShoppingListUpdate): Promise<void> {
    if (!this.isReady()) {
      console.warn('Family sharing not ready for broadcasting')
      return
    }

    try {
      await this.realtimeChannel.publish('shopping_list_update', update)
      console.log('Shopping list update broadcasted:', update.type)
    } catch (error) {
      console.error('Failed to broadcast update:', error)
    }
  }

  // Subscribe to shopping list updates
  public onShoppingListUpdate(callback: (update: ShoppingListUpdate) => void): () => void {
    this.onUpdateCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      this.onUpdateCallbacks = this.onUpdateCallbacks.filter(cb => cb !== callback)
    }
  }

  // Subscribe to family member presence updates
  public onPresenceUpdate(callback: (members: FamilyMember[]) => void): () => void {
    this.onPresenceCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      this.onPresenceCallbacks = this.onPresenceCallbacks.filter(cb => cb !== callback)
    }
  }

  // Get current family members
  public async getFamilyMembers(): Promise<FamilyMember[]> {
    if (!this.isReady()) {
      return []
    }

    try {
      const users = await this.realtimeChannel.getPresence()
      return users.map((user: any) => ({
        id: user.userId,
        name: user.metadata?.displayName || 'Unknown',
        email: user.metadata?.email || '',
        avatar: user.metadata?.avatar || '👤',
        isActive: true,
        joinedAt: user.metadata?.joinedAt || new Date().toISOString(),
        lastSeen: new Date().toISOString()
      }))
    } catch (error) {
      console.error('Failed to get family members:', error)
      return []
    }
  }

  // Save shopping list to database with family sharing
  public async saveFamilyShoppingList(items: any[]): Promise<void> {
    if (!this.currentUser || !this.familyId) {
      throw new Error('Family sharing not initialized')
    }

    try {
      const listData = {
        id: `list_${Date.now()}`,
        family_id: this.familyId,
        name: 'Family Shopping List',
        items: JSON.stringify(items),
        created_by: this.currentUser.id,
        created_by_name: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      await blink.db.family_shopping_lists.create(listData)
      
      // Broadcast the list update
      await this.broadcastUpdate({
        type: 'item_added',
        itemId: 'list_updated',
        itemName: 'Shopping list updated',
        userId: this.currentUser.id,
        userName: this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User',
        timestamp: new Date().toISOString(),
        data: { itemCount: items.length }
      })

      console.log('Family shopping list saved')
    } catch (error) {
      console.error('Failed to save family shopping list:', error)
      throw error
    }
  }

  // Load family shopping list from database
  public async loadFamilyShoppingList(): Promise<any[]> {
    if (!this.familyId) {
      return []
    }

    try {
      const lists = await blink.db.family_shopping_lists.list({
        where: { family_id: this.familyId },
        orderBy: { created_at: 'desc' },
        limit: 1
      })

      if (lists.length > 0) {
        const listData = lists[0]
        return JSON.parse(listData.items || '[]')
      }

      return []
    } catch (error) {
      console.error('Failed to load family shopping list:', error)
      return []
    }
  }

  // Cleanup when user logs out
  public async cleanup(): Promise<void> {
    // Prevent cleanup during initialization
    if (this.isInitializing) {
      console.log('Waiting for initialization to complete before cleanup...')
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

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
          console.warn('Failed to unsubscribe from realtime channel:', unsubscribeError)
          // Continue with cleanup even if unsubscribe fails
        }
        this.realtimeChannel = null
      }
      
      // Clear all callbacks and state
      this.onUpdateCallbacks = []
      this.onPresenceCallbacks = []
      this.currentUser = null
      this.familyId = null
      this.isInitializing = false
      this.isInitialized = false
      this.connectionState = 'disconnected'
      
      console.log('Family sharing cleaned up successfully')
    } catch (error) {
      console.error('Failed to cleanup family sharing:', error)
      // Force reset state even if cleanup fails
      this.realtimeChannel = null
      this.onUpdateCallbacks = []
      this.onPresenceCallbacks = []
      this.currentUser = null
      this.familyId = null
      this.isInitializing = false
      this.isInitialized = false
      this.connectionState = 'disconnected'
    }
  }
}

export default FamilySharing.getInstance()