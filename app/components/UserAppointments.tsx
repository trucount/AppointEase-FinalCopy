"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, CheckCircle, X, AlertCircle, RotateCcw, Filter } from "lucide-react"
import { getUserAppointments, updateAppointment, supabase } from "../../lib/supabase"
import type { User, Appointment } from "../../lib/supabase"
import RescheduleRequestModal from "./RescheduleRequestModal"

interface UserAppointmentsProps {
  user: User
}

export default function UserAppointments({ user }: UserAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    loadAppointments()

    // Set up real-time subscription
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
      window.removeEventListener("resize", checkMobile)
    }
  }, [user])

  const loadAppointments = async () => {
    try {
      const data = await getUserAppointments(user.id)

      // Mark completed appointments
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
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
    }
  }

  const handleRescheduleRequest = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowRescheduleModal(true)
  }

  const handleRescheduleSuccess = () => {
    alert("Reschedule request submitted successfully! Admin will review your request.")
    loadAppointments()
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      approved: "bg-green-100 text-green-800 border-green-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      completed: "bg-blue-100 text-blue-800 border-blue-300",
    }

    return (
      <Badge variant="outline" className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const canRequestReschedule = (appointment: Appointment) => {
    return (
      appointment.status === "approved" &&
      new Date(`${appointment.appointment_date} ${appointment.start_time}`) > new Date()
    )
  }

  const getFilteredAppointments = () => {
    if (statusFilter === "all") return appointments
    return appointments.filter((apt) => apt.status === statusFilter)
  }

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="mb-4 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{appointment.title}</CardTitle>
            <CardDescription className="mt-1 text-sm">
              {appointment.description || "No description provided"}
            </CardDescription>
          </div>
          {getStatusBadge(appointment.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span>
                {appointment.start_time} - {appointment.end_time}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500">Booked: {new Date(appointment.created_at).toLocaleDateString()}</div>

          {/* Reschedule Button */}
          {canRequestReschedule(appointment) && (
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRescheduleRequest(appointment)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Request Reschedule</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  const pendingAppointments = appointments.filter((apt: Appointment) => apt.status === "pending")
  const approvedAppointments = appointments.filter((apt: Appointment) => apt.status === "approved")
  const completedAppointments = appointments.filter((apt: Appointment) => apt.status === "completed")
  const rejectedAppointments = appointments.filter((apt: Appointment) => apt.status === "rejected")

  const getStatusCounts = () => ({
    all: appointments.length,
    pending: pendingAppointments.length,
    approved: approvedAppointments.length,
    completed: completedAppointments.length,
    rejected: rejectedAppointments.length,
  })

  const statusCounts = getStatusCounts()

  // Mobile view with filter dropdown
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">My Appointments</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
              <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
              <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {getFilteredAppointments().length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-500">
                {statusFilter === "all"
                  ? "You don't have any appointments yet."
                  : `No ${statusFilter} appointments found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{getFilteredAppointments().map(renderAppointmentCard)}</div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedAppointment && (
          <RescheduleRequestModal
            appointment={selectedAppointment}
            user={user}
            onClose={() => {
              setShowRescheduleModal(false)
              setSelectedAppointment(null)
            }}
            onSuccess={handleRescheduleSuccess}
          />
        )}
      </div>
    )
  }

  // Desktop view with tabs
  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="pending" className="flex flex-col py-2">
            <span>Pending</span>
            <span className="text-xs opacity-70">({pendingAppointments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex flex-col py-2">
            <span>Approved</span>
            <span className="text-xs opacity-70">({approvedAppointments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex flex-col py-2">
            <span>Completed</span>
            <span className="text-xs opacity-70">({completedAppointments.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex flex-col py-2">
            <span>Rejected</span>
            <span className="text-xs opacity-70">({rejectedAppointments.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending appointments</h3>
                <p className="text-gray-500">Your appointment requests will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{pendingAppointments.map(renderAppointmentCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approvedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No approved appointments</h3>
                <p className="text-gray-500">Approved appointments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{approvedAppointments.map(renderAppointmentCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed appointments</h3>
                <p className="text-gray-500">Completed appointments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{completedAppointments.map(renderAppointmentCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <X className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rejected appointments</h3>
                <p className="text-gray-500">Rejected appointments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{rejectedAppointments.map(renderAppointmentCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <RescheduleRequestModal
          appointment={selectedAppointment}
          user={user}
          onClose={() => {
            setShowRescheduleModal(false)
            setSelectedAppointment(null)
          }}
          onSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  )
}
