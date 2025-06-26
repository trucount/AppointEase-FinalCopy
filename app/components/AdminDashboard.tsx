"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, RefreshCw, Users, Clock, Video, BarChart3, PieChart } from "lucide-react"
import { getAppointments, getUsers, getAllMeetings, supabase } from "../../lib/supabase"
import type { User } from "../../lib/supabase"
import { useRouter } from "next/navigation" // Import useRouter

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    completedAppointments: 0,
    rejectedAppointments: 0,
    totalUsers: 0,
    totalMeetings: 0,
    todayAppointments: 0,
    thisWeekAppointments: 0,
    thisMonthAppointments: 0,
    upcomingMeetings: 0,
    completedMeetings: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState("week")
  const router = useRouter() // Initialize useRouter

  useEffect(() => {
    loadStats()

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel("admin_appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadStats()
      })
      .subscribe()

    const meetingsSubscription = supabase
      .channel("admin_meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        loadStats()
      })
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
      meetingsSubscription.unsubscribe()
    }
  }, [timeFilter])

  const loadStats = async () => {
    try {
      setError(null)

      // Load data
      const appointments = await getAppointments()
      const users = await getUsers()
      const meetings = await getAllMeetings()
      const regularUsers = users.filter((user: User) => user.role === "user")

      // Calculate date-based stats
      const today = new Date().toISOString().split("T")[0]
      const now = new Date()

      // Time periods
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

      // Appointment stats
      const todayAppointments = appointments.filter((apt: any) => apt.appointment_date === today)
      const thisWeekAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.created_at)
        return aptDate >= oneWeekAgo
      })
      const thisMonthAppointments = appointments.filter((apt: any) => {
        const aptDate = new Date(apt.created_at)
        return aptDate >= oneMonthAgo
      })

      const pendingAppointments = appointments.filter((apt: any) => apt.status === "pending")
      const approvedAppointments = appointments.filter((apt: any) => apt.status === "approved")
      const completedAppointments = appointments.filter((apt: any) => apt.status === "completed")
      const rejectedAppointments = appointments.filter((apt: any) => apt.status === "rejected")

      // Meeting stats
      const upcomingMeetings = meetings.filter((meeting: any) => {
        const meetingDateTime = new Date(`${meeting.meeting_date} ${meeting.start_time}`)
        return meetingDateTime > now
      })
      const completedMeetings = meetings.filter((meeting: any) => {
        const meetingDateTime = new Date(`${meeting.meeting_date} ${meeting.start_time}`)
        return meetingDateTime <= now
      })

      // Update stats
      const newStats = {
        totalAppointments: appointments.length,
        pendingAppointments: pendingAppointments.length,
        approvedAppointments: approvedAppointments.length,
        completedAppointments: completedAppointments.length,
        rejectedAppointments: rejectedAppointments.length,
        totalUsers: regularUsers.length,
        totalMeetings: meetings.length,
        todayAppointments: todayAppointments.length,
        thisWeekAppointments: thisWeekAppointments.length,
        thisMonthAppointments: thisMonthAppointments.length,
        upcomingMeetings: upcomingMeetings.length,
        completedMeetings: completedMeetings.length,
      }

      setStats(newStats)
    } catch (error) {
      console.error("Error loading stats:", error)
      setError("Failed to load dashboard data")
    }
  }

  const refreshStats = async () => {
    setLoading(true)
    await loadStats()
    setLoading(false)
  }

  const getCompletionRate = () => {
    if (stats.totalAppointments === 0) return 0
    return Math.round((stats.completedAppointments / stats.totalAppointments) * 100)
  }

  const getApprovalRate = () => {
    if (stats.totalAppointments === 0) return 0
    return Math.round(((stats.approvedAppointments + stats.completedAppointments) / stats.totalAppointments) * 100)
  }

  const getTimeBasedAppointments = () => {
    switch (timeFilter) {
      case "today":
        return stats.todayAppointments
      case "week":
        return stats.thisWeekAppointments
      case "month":
        return stats.thisMonthAppointments
      default:
        return stats.thisWeekAppointments
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">{""}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshStats} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Total Appointments</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Meetings</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalMeetings}</p>
              </div>
              <Video className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-600 text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold text-orange-900">{stats.pendingAppointments}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Appointment Status
            </CardTitle>
            <CardDescription>Distribution of appointment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Pending</span>
                </div>
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  {stats.pendingAppointments}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Approved</span>
                </div>
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {stats.approvedAppointments}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium">Completed</span>
                </div>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  {stats.completedAppointments}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium">Rejected</span>
                </div>
                <Badge variant="outline" className="text-red-700 border-red-300">
                  {stats.rejectedAppointments}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completion Rate</span>
                  <span className="text-sm font-bold text-green-600">{getCompletionRate()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getCompletionRate()}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Approval Rate</span>
                  <span className="text-sm font-bold text-blue-600">{getApprovalRate()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getApprovalRate()}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {timeFilter === "today" ? "Today's" : timeFilter === "week" ? "This Week's" : "This Month's"}{" "}
                    Appointments
                  </span>
                  <span className="font-bold text-lg">{getTimeBasedAppointments()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Analytics
          </CardTitle>
          <CardDescription>Overview of scheduled meetings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.upcomingMeetings}</div>
              <div className="text-sm text-blue-700">Upcoming Meetings</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{stats.completedMeetings}</div>
              <div className="text-sm text-gray-700">Completed Meetings</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
