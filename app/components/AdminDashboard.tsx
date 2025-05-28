"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, RefreshCw, TrendingUp, AlertTriangle, Database } from "lucide-react"
import { getAppointments, getUsers, supabase } from "../../lib/supabase"
import type { User } from "../../lib/supabase"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    completedAppointments: 0,
    totalUsers: 0,
    todayAppointments: 0,
    thisWeekAppointments: 0,
    unreadMessages: 0,
  })
  const [loading, setLoading] = useState(false)
  const [systemHealth, setSystemHealth] = useState<"healthy" | "warning" | "critical">("healthy")
  const [error, setError] = useState<string | null>(null)
  const [dataStatus, setDataStatus] = useState<"loading" | "online" | "error">("loading")

  useEffect(() => {
    loadStats()

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel("admin_appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadStats()
      })
      .subscribe()

    const messagesSubscription = supabase
      .channel("admin_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadStats()
      })
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
      messagesSubscription.unsubscribe()
    }
  }, [])

  const loadStats = async () => {
    try {
      setError(null)
      setDataStatus("loading")

      // Load appointments with user data
      const appointments = await getAppointments()
      const users = await getUsers()
      const regularUsers = users.filter((user: User) => user.role === "user")

      // Load messages
      const { data: messages } = await supabase.from("messages").select("*").order("created_at", { ascending: true })

      // Calculate date-based stats
      const today = new Date().toISOString().split("T")[0]
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const todayAppointments = appointments.filter((apt: any) => apt.appointment_date === today)
      const thisWeekAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.created_at)
        return aptDate >= oneWeekAgo
      })

      const unreadMessages = (messages || []).filter((msg: any) => msg.receiver_id === "admin" && !msg.seen_at)
      const pendingAppointments = appointments.filter((apt: any) => apt.status === "pending")
      const approvedAppointments = appointments.filter((apt: any) => apt.status === "approved")
      const completedAppointments = appointments.filter((apt: any) => apt.status === "completed")

      // Update stats
      const newStats = {
        totalAppointments: appointments.length,
        pendingAppointments: pendingAppointments.length,
        approvedAppointments: approvedAppointments.length,
        completedAppointments: completedAppointments.length,
        totalUsers: regularUsers.length,
        todayAppointments: todayAppointments.length,
        thisWeekAppointments: thisWeekAppointments.length,
        unreadMessages: unreadMessages.length,
      }

      setStats(newStats)

      // Determine system health
      const pendingCount = pendingAppointments.length
      if (pendingCount > 10) {
        setSystemHealth("critical")
      } else if (pendingCount > 5 || unreadMessages.length > 10) {
        setSystemHealth("warning")
      } else {
        setSystemHealth("healthy")
      }

      setDataStatus("online")
    } catch (error) {
      console.error("Error loading stats:", error)
      setError("Failed to load dashboard data")
      setDataStatus("error")
    }
  }

  const refreshStats = async () => {
    setLoading(true)
    await loadStats()
    setLoading(false)
  }

  const getHealthBadge = () => {
    switch (systemHealth) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Warning</Badge>
      case "critical":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getDataStatusBadge = () => {
    switch (dataStatus) {
      case "loading":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Loading...</Badge>
      case "online":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Live Data</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>System Overview</span>
              </CardTitle>
              <CardDescription></CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              
              
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-blue-700">Total Users</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.totalAppointments}</div>
              <div className="text-sm text-green-700">Total Appointments</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingAppointments}</div>
              <div className="text-sm text-yellow-700">Pending Approval</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.unreadMessages}</div>
              <div className="text-sm text-purple-700">Unread Messages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
          <CardDescription>Current day statistics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{stats.todayAppointments}</div>
                <div className="text-sm text-gray-600">Today's Appointments</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-lg font-bold">{stats.thisWeekAppointments}</div>
                <div className="text-sm text-gray-600">This Week</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supabase Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Supabase Database Status</span>
          </CardTitle>
          <CardDescription>Database connection and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Database Status</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>Features:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Real-time data synchronization</li>
                <li>• Automatic backups</li>
                <li>• Row Level Security (RLS)</li>
                <li>• PostgreSQL database</li>
                <li>• 99.9% uptime guarantee</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completion Rate:</span>
              <span className="font-medium text-green-600">
                {stats.totalAppointments > 0
                  ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Approval Rate:</span>
              <span className="font-medium text-blue-600">
                {stats.totalAppointments > 0
                  ? Math.round(
                      ((stats.approvedAppointments + stats.completedAppointments) / stats.totalAppointments) * 100,
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Database Status:</span>
              <span className="font-medium text-green-600">● Connected</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
