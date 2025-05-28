"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Clock, User, Calendar } from "lucide-react"
import { getAppointments, updateAppointment, supabase } from "../../lib/supabase"

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<any[]>([])

  useEffect(() => {
    loadAppointments()

    // Set up real-time subscription for appointments
    const appointmentsSubscription = supabase
      .channel("appointments_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadAppointments()
      })
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
    }
  }, [])

  const loadAppointments = async () => {
    try {
      const data = await getAppointments()
      setAppointments(data)
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await updateAppointment(appointmentId, { status: status as any })
      setAppointments((prev) => prev.map((apt) => (apt.id === appointmentId ? { ...apt, status } : apt)))
    } catch (error) {
      console.error("Error updating appointment:", error)
      alert("Failed to update appointment status")
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

  const renderAppointmentCard = (appointment: any) => {
    const user = appointment.users

    return (
      <Card key={appointment.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{appointment.title}</CardTitle>
              <CardDescription className="flex items-center space-x-2 mt-1">
                <User className="h-4 w-4" />
                <span>{user?.full_name || "Unknown User"}</span>
              </CardDescription>
            </div>
            {getStatusBadge(appointment.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{appointment.description || "No description provided"}</p>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>{appointment.appointment_date}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>
                  {appointment.start_time} - {appointment.end_time}
                </span>
              </div>
            </div>

            {user && (
              <div className="text-sm text-gray-600">
                <strong>Contact:</strong> {user.phone || "No phone provided"}
              </div>
            )}

            {appointment.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => updateAppointmentStatus(appointment.id, "approved")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateAppointmentStatus(appointment.id, "rejected")}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingAppointments = appointments.filter((apt: any) => apt.status === "pending")
  const approvedAppointments = appointments.filter((apt: any) => apt.status === "approved")
  const completedAppointments = appointments.filter((apt: any) => apt.status === "completed")

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingAppointments.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedAppointments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedAppointments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No pending appointments</p>
              </CardContent>
            </Card>
          ) : (
            pendingAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Check className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No approved appointments</p>
              </CardContent>
            </Card>
          ) : (
            approvedAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Check className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No completed appointments</p>
              </CardContent>
            </Card>
          ) : (
            completedAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
