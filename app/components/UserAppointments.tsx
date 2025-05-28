"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Calendar, Clock, CheckCircle, X } from "lucide-react"
import {
  getUserAppointments,
  supabase,
} from "../../lib/supabase"
import type { User, Appointment } from "../../lib/supabase"

interface UserAppointmentsProps {
  user: User
}

export default function UserAppointments({ user }: UserAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])

  useEffect(() => {
    loadAppointments()

    const subscription = supabase
      .channel("user_appointments_list")
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
      setAppointments(data)
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
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
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{appointment.title}</CardTitle>
            <CardDescription className="mt-1">
              {appointment.description || "No description provided"}
            </CardDescription>
          </div>
          {getStatusBadge(appointment.status)}
        </div>
      </CardHeader>
      <CardContent>
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

        <div className="text-xs text-gray-500 mt-2">
          Booked on: {new Date(appointment.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  )

  const pendingAppointments = appointments.filter((apt) => apt.status === "pending")
  const approvedAppointments = appointments.filter((apt) => apt.status === "approved")
  const rejectedAppointments = appointments.filter((apt) => apt.status === "rejected")

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingAppointments.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedAppointments.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedAppointments.length})</TabsTrigger>
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
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No approved appointments</p>
              </CardContent>
            </Card>
          ) : (
            approvedAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <X className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No rejected appointments</p>
              </CardContent>
            </Card>
          ) : (
            rejectedAppointments.map(renderAppointmentCard)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
