"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, CheckCircle, AlertCircle, User } from "lucide-react"
import { getUserAppointments, updateAppointment } from "@/lib/supabase"
import type { User as UserType, Appointment } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

interface UserDashboardProps {
  user: UserType
}

const supabaseUrl = "https://your-supabase-url.supabase.co"
const supabaseKey = "your-supabase-key"
const supabase = createClient(supabaseUrl, supabaseKey)

export default function UserDashboard({ user }: UserDashboardProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
  })

  useEffect(() => {
    loadAppointments()

    // Set up real-time subscription for user's appointments
    const subscription = supabase
      .channel("user_appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadAppointments()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const loadAppointments = async () => {
    try {
      const data = await getUserAppointments(user.id)

      // Auto-mark completed appointments
      const now = new Date()
      const appointmentsToUpdate: string[] = []

      const updatedAppointments = data.map((apt: Appointment) => {
        if (apt.status === "approved") {
          const endTime = new Date(`${apt.appointment_date} ${apt.end_time}`)
          if (endTime < now) {
            appointmentsToUpdate.push(apt.id)
            return { ...apt, status: "completed" as const }
          }
        }
        return apt
      })

      // Update completed appointments in database
      if (appointmentsToUpdate.length > 0) {
        await Promise.all(appointmentsToUpdate.map((id) => updateAppointment(id, { status: "completed" })))
      }

      setAppointments(updatedAppointments)

      // Calculate stats
      setStats({
        total: updatedAppointments.length,
        pending: updatedAppointments.filter((apt: Appointment) => apt.status === "pending").length,
        approved: updatedAppointments.filter((apt: Appointment) => apt.status === "approved").length,
        completed: updatedAppointments.filter((apt: Appointment) => apt.status === "completed").length,
      })
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
      setStats({ total: 0, pending: 0, approved: 0, completed: 0 })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            Rejected
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const upcomingAppointments = appointments
    .filter((apt: Appointment) => apt.status === "approved")
    .sort(
      (a: Appointment, b: Appointment) =>
        new Date(`${a.appointment_date} ${a.start_time}`).getTime() -
        new Date(`${b.appointment_date} ${b.start_time}`).getTime(),
    )
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Welcome back, {user.full_name}!</span>
          </CardTitle>
          <CardDescription>Here's your appointment overview</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Your next approved appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appointment: Appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{appointment.title}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span>{appointment.appointment_date}</span>
                      <span>
                        {appointment.start_time} - {appointment.end_time}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
