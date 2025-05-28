"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Database, Info, Wifi, WifiOff } from "lucide-react"

interface PantryEndpoint {
  name: string
  url: string
  description: string
  testData?: any
  fallbackData?: any
}

const PANTRY_ENDPOINTS: PantryEndpoint[] = [
  {
    name: "Users",
    url: "https://getpantry.cloud/apiv1/pantry/dbd4c2ee-734b-410d-b19b-4f7ac0f31344/basket/user",
    description: "User accounts and authentication data",
    testData: [
      {
        id: "admin",
        username: "Head",
        fullName: "Administrator",
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ],
    fallbackData: [],
  },
  {
    name: "Appointments",
    url: "https://getpantry.cloud/apiv1/pantry/983b8ccc-3b24-4e7b-bdbb-945616b52dea/basket/data",
    description: "Appointment bookings and schedules",
    testData: [],
    fallbackData: [],
  },
  {
    name: "Settings",
    url: "https://getpantry.cloud/apiv1/pantry/c955f325-12a6-4c2a-bf7f-8c02c5cc7c8a/basket/other",
    description: "Admin settings and configuration",
    testData: {
      adminSettings: {
        startTime: "09:00",
        endTime: "17:00",
        breakStartTime: "12:00",
        breakEndTime: "13:00",
        slotDuration: 60,
      },
      lastCleanup: new Date().toISOString(),
    },
    fallbackData: {},
  },
  {
    name: "Messages",
    url: "https://getpantry.cloud/apiv1/pantry/550a1eb0-98f1-4022-a86b-de8fbb405c40/basket/message",
    description: "Chat messages between users and admin",
    testData: [],
    fallbackData: [],
  },
  {
    name: "Features",
    url: "https://getpantry.cloud/apiv1/pantry/34a010a7-e232-4063-af78-dfbf6f00c2f3/basket/otherfeature",
    description: "Additional features and configurations",
    testData: {
      features: {
        notifications: true,
        analytics: false,
        autoCleanup: true,
      },
    },
    fallbackData: {},
  },
]

interface PantryStatus {
  name: string
  status: "online" | "offline" | "error" | "initializing" | "fallback"
  responseTime: number
  lastChecked: string
  dataCount?: number
  error?: string
  initialized?: boolean
  usingFallback?: boolean
}

export default function PantryStatus() {
  const [statuses, setStatuses] = useState<PantryStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [initializing, setInitializing] = useState(false)
  const [offlineMode, setOfflineMode] = useState(false)
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online")

  // Check network connectivity
  useEffect(() => {
    const updateNetworkStatus = () => {
      setNetworkStatus(navigator.onLine ? "online" : "offline")
    }

    window.addEventListener("online", updateNetworkStatus)
    window.addEventListener("offline", updateNetworkStatus)

    return () => {
      window.removeEventListener("online", updateNetworkStatus)
      window.removeEventListener("offline", updateNetworkStatus)
    }
  }, [])

  const makeSecureRequest = async (url: string, options: RequestInit = {}) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

    try {
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
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  const initializePantryBaskets = async () => {
    if (networkStatus === "offline") {
      console.log("🔌 Network is offline, skipping initialization")
      return
    }

    setInitializing(true)
    const newStatuses: PantryStatus[] = []

    for (const endpoint of PANTRY_ENDPOINTS) {
      const startTime = Date.now()

      try {
        console.log(`🔄 Checking ${endpoint.name} basket...`)

        // First, try to read the basket
        const readResponse = await makeSecureRequest(endpoint.url)
        const responseTime = Date.now() - startTime

        if (readResponse.ok) {
          const data = await readResponse.json()
          let dataCount = 0

          if (Array.isArray(data)) {
            dataCount = data.length
          } else if (data && typeof data === "object") {
            if (data.message && data.message.includes("basket")) {
              // Basket exists but is empty
              dataCount = 0
            } else {
              dataCount = Object.keys(data).length
            }
          }

          newStatuses.push({
            name: endpoint.name,
            status: "online",
            responseTime,
            lastChecked: new Date().toLocaleTimeString(),
            dataCount,
            initialized: true,
          })

          console.log(`✅ ${endpoint.name} basket is accessible (${dataCount} records)`)
        } else if (readResponse.status === 400) {
          // Basket doesn't exist, try to initialize it
          console.log(`🔧 Initializing ${endpoint.name} basket...`)

          try {
            const initResponse = await makeSecureRequest(endpoint.url, {
              method: "POST",
              body: JSON.stringify(endpoint.testData),
            })

            if (initResponse.ok) {
              newStatuses.push({
                name: endpoint.name,
                status: "online",
                responseTime: Date.now() - startTime,
                lastChecked: new Date().toLocaleTimeString(),
                dataCount: Array.isArray(endpoint.testData) ? endpoint.testData.length : 1,
                initialized: true,
              })
              console.log(`✅ ${endpoint.name} basket initialized successfully`)
            } else {
              throw new Error(`Initialization failed: ${initResponse.status}`)
            }
          } catch (initError) {
            console.log(`⚠️ ${endpoint.name} initialization failed, using fallback`)
            newStatuses.push({
              name: endpoint.name,
              status: "fallback",
              responseTime,
              lastChecked: new Date().toLocaleTimeString(),
              error: "Using local fallback data",
              initialized: false,
              usingFallback: true,
            })
          }
        } else {
          throw new Error(`HTTP ${readResponse.status}: ${readResponse.statusText}`)
        }
      } catch (error) {
        const responseTime = Date.now() - startTime
        let errorMessage = "Connection failed"

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            errorMessage = "Request timeout"
          } else if (error.message.includes("CORS")) {
            errorMessage = "CORS policy blocked"
          } else if (error.message.includes("Failed to fetch")) {
            errorMessage = "Network error or CORS blocked"
          } else {
            errorMessage = error.message
          }
        }

        console.log(`❌ ${endpoint.name} failed: ${errorMessage}`)

        newStatuses.push({
          name: endpoint.name,
          status: "offline",
          responseTime,
          lastChecked: new Date().toLocaleTimeString(),
          error: errorMessage,
          initialized: false,
          usingFallback: true,
        })
      }
    }

    setStatuses(newStatuses)
    setInitializing(false)

    // Check if we should enable offline mode
    const onlineCount = newStatuses.filter((s) => s.status === "online").length
    if (onlineCount === 0) {
      setOfflineMode(true)
      console.log("🔌 All endpoints failed, enabling offline mode")
    } else {
      setOfflineMode(false)
    }
  }

  const checkPantryStatus = async () => {
    if (networkStatus === "offline") {
      console.log("🔌 Network is offline, skipping status check")
      return
    }

    setLoading(true)
    const newStatuses: PantryStatus[] = []

    for (const endpoint of PANTRY_ENDPOINTS) {
      const startTime = Date.now()
      try {
        const response = await makeSecureRequest(endpoint.url)
        const responseTime = Date.now() - startTime

        if (response.ok) {
          const data = await response.json()
          let dataCount = 0

          if (Array.isArray(data)) {
            dataCount = data.length
          } else if (data && typeof data === "object") {
            if (data.message && data.message.includes("basket")) {
              dataCount = 0
            } else {
              dataCount = Object.keys(data).length
            }
          }

          newStatuses.push({
            name: endpoint.name,
            status: "online",
            responseTime,
            lastChecked: new Date().toLocaleTimeString(),
            dataCount,
            initialized: true,
          })
        } else {
          newStatuses.push({
            name: endpoint.name,
            status: "error",
            responseTime,
            lastChecked: new Date().toLocaleTimeString(),
            error: `HTTP ${response.status}`,
            initialized: false,
          })
        }
      } catch (error) {
        const responseTime = Date.now() - startTime
        let errorMessage = "Connection failed"

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            errorMessage = "Request timeout"
          } else if (error.message.includes("Failed to fetch")) {
            errorMessage = "Network/CORS error"
          } else {
            errorMessage = error.message
          }
        }

        newStatuses.push({
          name: endpoint.name,
          status: "offline",
          responseTime,
          lastChecked: new Date().toLocaleTimeString(),
          error: errorMessage,
          initialized: false,
          usingFallback: true,
        })
      }
    }

    setStatuses(newStatuses)
    setLastUpdate(new Date().toLocaleTimeString())
    setLoading(false)

    // Update offline mode status
    const onlineCount = newStatuses.filter((s) => s.status === "online").length
    setOfflineMode(onlineCount === 0)
  }

  useEffect(() => {
    // Initialize baskets first, then check status
    initializePantryBaskets()

    // Auto-refresh every 10 minutes (to be conservative with rate limits)
    const interval = setInterval(() => {
      if (networkStatus === "online") {
        checkPantryStatus()
      }
    }, 600000) // 10 minutes

    return () => clearInterval(interval)
  }, [networkStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "offline":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case "fallback":
        return <Database className="h-4 w-4 text-blue-600" />
      case "initializing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Database className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Online</Badge>
      case "offline":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Offline</Badge>
      case "error":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Error</Badge>
      case "fallback":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Fallback</Badge>
      case "initializing":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Initializing</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const overallStatus = statuses.every((s) => s.status === "online")
    ? "online"
    : statuses.some((s) => s.status === "online")
      ? "partial"
      : offlineMode
        ? "offline"
        : "error"

  const uninitializedBaskets = statuses.filter((s) => !s.initialized && s.status !== "fallback")

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Pantry Cloud Status</span>
              {networkStatus === "offline" && <WifiOff className="h-4 w-4 text-red-500" />}
              {networkStatus === "online" && <Wifi className="h-4 w-4 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Real-time status of all data endpoints
              {lastUpdate && ` • Last updated: ${lastUpdate}`}
              {offlineMode && " • Running in offline mode"}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {uninitializedBaskets.length > 0 && networkStatus === "online" && (
              <Button variant="outline" size="sm" onClick={initializePantryBaskets} disabled={initializing}>
                <Database className={`h-4 w-4 mr-2 ${initializing ? "animate-spin" : ""}`} />
                Initialize
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={checkPantryStatus}
              disabled={loading || networkStatus === "offline"}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Status */}
        {networkStatus === "offline" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <WifiOff className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Network Offline</p>
                <p className="text-red-700 mt-1">
                  Your device is offline. The app will use cached data and sync when connection is restored.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Offline Mode Notice */}
        {offlineMode && networkStatus === "online" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Offline Mode Active</p>
                <p className="text-blue-700 mt-1">
                  Pantry services are unavailable. The app is using local fallback data. Some features may be limited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pantry Free Plan Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-800">Pantry Free Plan Limits:</p>
              <ul className="text-blue-700 mt-1 space-y-1">
                <li>• 100 requests per day</li>
                <li>• 20MB storage per pantry</li>
                <li>• 100 baskets per pantry</li>
                <li>• CORS restrictions may apply</li>
                <li>• Auto-refresh every 10 minutes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Overall Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallStatus)}
            <span className="font-medium">Overall System Status</span>
          </div>
          {getStatusBadge(overallStatus)}
        </div>

        {/* Individual Endpoints */}
        <div className="space-y-3">
          {statuses.map((status, index) => {
            const endpoint = PANTRY_ENDPOINTS[index]
            return (
              <div key={status.name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status.status)}
                    <span className="font-medium">{status.name}</span>
                    {status.usingFallback && <span className="text-xs text-blue-600">(Fallback)</span>}
                  </div>
                  {getStatusBadge(status.status)}
                </div>

                <p className="text-sm text-gray-600 mb-2">{endpoint.description}</p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Response: {status.responseTime}ms</span>
                    {status.dataCount !== undefined && <span>Records: {status.dataCount}</span>}
                    <span>Checked: {status.lastChecked}</span>
                  </div>
                </div>

                {status.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    Error: {status.error}
                    {!status.initialized && status.status !== "fallback" && (
                      <div className="mt-1 text-blue-600">💡 Try clicking "Initialize" to create this basket</div>
                    )}
                  </div>
                )}

                {status.status === "online" && status.initialized && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✅ Basket is properly initialized and accessible
                  </div>
                )}

                {status.status === "fallback" && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                    🔄 Using local fallback data. App functionality is maintained with limited sync.
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* System Health Summary */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-green-600">
                {statuses.filter((s) => s.status === "online").length}
              </div>
              <div className="text-xs text-gray-500">Online</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">
                {statuses.filter((s) => s.status === "fallback").length}
              </div>
              <div className="text-xs text-gray-500">Fallback</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">
                {statuses.filter((s) => s.status === "error").length}
              </div>
              <div className="text-xs text-gray-500">Errors</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {statuses.filter((s) => s.status === "offline").length}
              </div>
              <div className="text-xs text-gray-500">Offline</div>
            </div>
          </div>
        </div>

        {/* Troubleshooting Tips */}
        {statuses.some((s) => s.status !== "online") && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Troubleshooting Tips:</p>
                <ul className="text-yellow-700 mt-1 space-y-1">
                  <li>• CORS errors are common with Pantry free plan</li>
                  <li>• App works in fallback mode when Pantry is unavailable</li>
                  <li>• Check your internet connection</li>
                  <li>• Try refreshing in a few minutes</li>
                  <li>• Some browsers block cross-origin requests</li>
                  <li>• Consider using a CORS proxy for production</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
