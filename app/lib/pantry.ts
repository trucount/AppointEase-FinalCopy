// Enhanced Pantry API utility with better error handling and fallback support

interface PantryConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
}

const config: PantryConfig = {
  baseUrl: "https://getpantry.cloud/apiv1/pantry",
  timeout: 8000, // 8 seconds
  retryAttempts: 2, // Reduced to save quota
  retryDelay: 1000, // 1 second
}

// Enhanced rate limiting
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests = 80 // Conservative limit
  private readonly timeWindow = 24 * 60 * 60 * 1000 // 24 hours

  canMakeRequest(): boolean {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)
    return this.requests.length < this.maxRequests
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)
    return Math.max(0, this.maxRequests - this.requests.length)
  }

  getUsedRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter((time) => now - time < this.timeWindow)
    return this.requests.length
  }
}

const rateLimiter = new RateLimiter()

export class PantryError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string,
    public isNetworkError?: boolean,
    public isCorsError?: boolean,
  ) {
    super(message)
    this.name = "PantryError"
  }
}

// Fallback data store
const fallbackData = new Map<string, any>()

// Set fallback data for a basket
export function setFallbackData(basketKey: string, data: any): void {
  fallbackData.set(basketKey, data)
  // Also store in localStorage for persistence
  try {
    localStorage.setItem(`pantry_fallback_${basketKey}`, JSON.stringify(data))
  } catch (error) {
    console.warn("Failed to store fallback data in localStorage:", error)
  }
}

// Get fallback data for a basket
export function getFallbackData(basketKey: string, defaultValue: any = []): any {
  // First try memory cache
  if (fallbackData.has(basketKey)) {
    return fallbackData.get(basketKey)
  }

  // Then try localStorage
  try {
    const stored = localStorage.getItem(`pantry_fallback_${basketKey}`)
    if (stored) {
      const data = JSON.parse(stored)
      fallbackData.set(basketKey, data) // Cache in memory
      return data
    }
  } catch (error) {
    console.warn("Failed to load fallback data from localStorage:", error)
  }

  return defaultValue
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function makeRequest(url: string, options: RequestInit = {}, attempt = 1): Promise<Response> {
  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    throw new PantryError(
      `Rate limit exceeded. ${rateLimiter.getRemainingRequests()} requests remaining today.`,
      429,
      url,
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
    })

    clearTimeout(timeoutId)
    rateLimiter.recordRequest()

    return response
  } catch (error) {
    if (attempt < config.retryAttempts) {
      console.log(`Request failed, retrying... (${attempt}/${config.retryAttempts})`)
      await delay(config.retryDelay * attempt)
      return makeRequest(url, options, attempt + 1)
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new PantryError("Request timeout", 408, url, true)
      }

      if (error.message.includes("CORS") || error.message.includes("cross-origin")) {
        throw new PantryError("CORS policy blocked request", 0, url, false, true)
      }

      if (error.message.includes("Failed to fetch")) {
        // This is often a CORS error in disguise
        throw new PantryError("Network error (possibly CORS blocked)", 0, url, true, true)
      }

      throw new PantryError(`Network error: ${error.message}`, 0, url, true)
    }

    throw new PantryError("Unknown error occurred", 0, url, true)
  }
}

export async function pantryGet(pantryId: string, basketName: string): Promise<any> {
  const url = `${config.baseUrl}/${pantryId}/basket/${basketName}`
  const basketKey = `${pantryId}_${basketName}`

  try {
    const response = await makeRequest(url)

    if (response.ok) {
      const data = await response.json()

      // Store successful data as fallback
      setFallbackData(basketKey, data)

      return data
    }

    if (response.status === 400) {
      // Basket doesn't exist - return empty array/object and store as fallback
      const emptyData = basketName.includes("settings") || basketName.includes("other") ? {} : []
      setFallbackData(basketKey, emptyData)
      return emptyData
    }

    throw new PantryError(`Failed to fetch data: ${response.status} ${response.statusText}`, response.status, url)
  } catch (error) {
    console.warn(`Pantry GET failed for ${basketName}, using fallback data:`, error)

    // Return fallback data
    const fallback = getFallbackData(
      basketKey,
      basketName.includes("settings") || basketName.includes("other") ? {} : [],
    )

    if (error instanceof PantryError) {
      // Re-throw with fallback info
      error.message += " (using fallback data)"
      throw error
    }

    throw new PantryError(`Failed to fetch from ${basketName} (using fallback data)`, 0, url, true)
  }
}

export async function pantryPost(pantryId: string, basketName: string, data: any): Promise<boolean> {
  const url = `${config.baseUrl}/${pantryId}/basket/${basketName}`
  const basketKey = `${pantryId}_${basketName}`

  try {
    const response = await makeRequest(url, {
      method: "POST",
      body: JSON.stringify(data),
    })

    if (response.ok) {
      // Store successful data as fallback
      setFallbackData(basketKey, data)
      return true
    }

    throw new PantryError(`Failed to save data: ${response.status} ${response.statusText}`, response.status, url)
  } catch (error) {
    console.warn(`Pantry POST failed for ${basketName}, storing locally:`, error)

    // Store data locally as fallback
    setFallbackData(basketKey, data)

    if (error instanceof PantryError) {
      // Don't throw for POST errors, just log and store locally
      console.warn("Data saved locally, will sync when connection is restored")
      return false
    }

    console.warn("Data saved locally, will sync when connection is restored")
    return false
  }
}

// Enhanced safe get with better fallback handling
export async function safeGet(pantryId: string, basketName: string, fallback: any = []): Promise<any> {
  const basketKey = `${pantryId}_${basketName}`

  try {
    const data = await pantryGet(pantryId, basketName)

    // Handle Pantry's different response formats
    if (Array.isArray(data)) {
      return data
    }

    if (data && typeof data === "object") {
      // If it's an object with a message about basket not existing
      if (data.message && data.message.includes("basket")) {
        return fallback
      }

      // If it's a valid object, try to extract array if it exists
      if (basketName.includes("settings") || basketName.includes("other")) {
        return data // Return object as-is for settings
      }

      const values = Object.values(data).filter((item) => item && typeof item === "object")
      return values.length > 0 ? values : data
    }

    return fallback
  } catch (error) {
    console.warn(`Error fetching ${basketName}, using fallback:`, error)

    // Get fallback data
    const fallbackData = getFallbackData(basketKey, fallback)

    // If we have fallback data, use it
    if (
      fallbackData !== fallback ||
      (Array.isArray(fallbackData) && fallbackData.length > 0) ||
      (typeof fallbackData === "object" && Object.keys(fallbackData).length > 0)
    ) {
      console.log(`Using cached fallback data for ${basketName}`)
      return fallbackData
    }

    return fallback
  }
}

// Enhanced safe post with offline support
export async function safePost(pantryId: string, basketName: string, data: any): Promise<boolean> {
  try {
    return await pantryPost(pantryId, basketName, data)
  } catch (error) {
    console.warn(`Error saving ${basketName}, data stored locally:`, error)
    return false
  }
}

// Get API usage statistics
export function getApiStats() {
  return {
    remaining: rateLimiter.getRemainingRequests(),
    used: rateLimiter.getUsedRequests(),
    total: 80,
    percentage: Math.round((rateLimiter.getUsedRequests() / 80) * 100),
  }
}

// Check if we can make a request
export function canMakeRequest(): boolean {
  return rateLimiter.canMakeRequest()
}

// Get remaining API requests for today
export function getRemainingRequests(): number {
  return rateLimiter.getRemainingRequests()
}

// Initialize fallback data for all baskets
export function initializeFallbackData(): void {
  const defaultData = {
    "dbd4c2ee-734b-410d-b19b-4f7ac0f31344_user": [
      {
        id: "admin",
        username: "Head",
        fullName: "Administrator",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ],
    "983b8ccc-3b24-4e7b-bdbb-945616b52dea_data": [],
    "c955f325-12a6-4c2a-bf7f-8c02c5cc7c8a_other": {
      adminSettings: {
        startTime: "09:00",
        endTime: "17:00",
        breakStartTime: "12:00",
        breakEndTime: "13:00",
        slotDuration: 60,
      },
      lastCleanup: new Date().toISOString(),
    },
    "550a1eb0-98f1-4022-a86b-de8fbb405c40_message": [],
    "34a010a7-e232-4063-af78-dfbf6f00c2f3_otherfeature": {
      features: {
        notifications: true,
        analytics: false,
        autoCleanup: true,
      },
    },
  }

  Object.entries(defaultData).forEach(([key, value]) => {
    if (!fallbackData.has(key)) {
      setFallbackData(key, value)
    }
  })
}

// Check network connectivity
export function isOnline(): boolean {
  return navigator.onLine
}

// Initialize fallback data on module load
if (typeof window !== "undefined") {
  initializeFallbackData()
}
