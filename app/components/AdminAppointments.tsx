"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, Clock, User, Calendar, RotateCcw, Filter, Link, Lock, MapPin } from "lucide-react"
import {
  getAppointments,
  updateAppointment,
  getRescheduleRequests,
  updateRescheduleRequest,
  supabase,
} from "../../lib/supabase"
import type { Appointment } from "../../lib/supabase" // Import Appointment type
import AdminRescheduleModal from "./AdminRescheduleModal" // Import the new modal

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [isMobile, setIsMobile] = useState(false)
  const [showAdminRescheduleModal, setShowAdminRescheduleModal] = useState(false)
  const [currentAppointmentToReschedule, setCurrentAppointmentToReschedule] = useState<Appointment | null>(null)

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    loadData()

    // Set up real-time subscriptions
    const appointmentsSubscription = supabase
      .channel("appointments_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadAppointments()
      })
      .subscribe()

    const rescheduleSubscription = supabase
      .channel("reschedule_requests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reschedule_requests" }, () => {
        loadRescheduleRequests()
      })
      .subscribe()

    return () => {
      appointmentsSubscription.unsubscribe()
      rescheduleSubscription.unsubscribe()
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const loadData = async () => {
    await Promise.all([loadAppointments(), loadRescheduleRequests()])
  }

  const loadAppointments = async () => {
    try {
      const data = await getAppointments()
      setAppointments(data)
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
    }
  }

  const loadRescheduleRequests = async () => {
    try {
      const data = await getRescheduleRequests()
      setRescheduleRequests(data)
    } catch (error) {
      console.error("Error loading reschedule requests:", error)
      setRescheduleRequests([])
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

  const handleRescheduleRequest = async (
    requestId: string,
    action: "approved" | "rejected",
    appointmentId?: string,
    newDate?: string,
    newStartTime?: string,
    newEndTime?: string,
  ) => {
    try {
      await updateRescheduleRequest(requestId, { status: action })

      if (action === "approved" && appointmentId && newDate && newStartTime && newEndTime) {
        // Update the original appointment with new date/time
        await updateAppointment(appointmentId, {
          appointment_date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
        })
        loadAppointments()
      }

      loadRescheduleRequests()
      alert(`Reschedule request ${action} successfully!`)
    } catch (error) {
      console.error("Error handling reschedule request:", error)
      alert("Failed to process reschedule request")
    }
  }

  const handleOpenAdminRescheduleModal = (appointment: Appointment) => {
    setCurrentAppointmentToReschedule(appointment)
    setShowAdminRescheduleModal(true)
  }

  const handleCloseAdminRescheduleModal = () => {
    setShowAdminRescheduleModal(false)
    setCurrentAppointmentToReschedule(null)
  }

  const handleAdminRescheduleSuccess = () => {
    loadAppointments() // Reload appointments after successful reschedule
    handleCloseAdminRescheduleModal()
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

  const getModeBadge = (mode: string) => {
    const variants = {
      online: "bg-purple-100 text-purple-800 border-purple-300",
      "in-person": "bg-orange-100 text-orange-800 border-orange-300",
    }
    return (
      <Badge variant="outline" className={variants[mode as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {mode.charAt(0).toUpperCase() + mode.slice(1)}
      </Badge>
    )
  }

  const getFilteredAppointments = () => {
    if (statusFilter === "all") return appointments
    if (statusFilter === "reschedule") return rescheduleRequests.filter((req: any) => req.status === "pending")
    return appointments.filter((apt) => apt.status === statusFilter)
  }

  const renderAppointmentCard = (appointment: any) => {
    const user = appointment.users

    return (
      <Card key={appointment.id} className="mb-4 hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg leading-tight">{appointment.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>{user?.full_name || "Unknown User"}</span>
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {appointment.appointment_mode && getModeBadge(appointment.appointment_mode)}
              {getStatusBadge(appointment.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{appointment.description || "No description provided"}</p>

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

            {appointment.appointment_mode === "online" && appointment.appointment_url && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Link className="h-4 w-4 flex-shrink-0" />
                <a
                  href={appointment.appointment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:no-underline"
                >
                  Join Online Meeting
                </a>
                {appointment.appointment_password && (
                  <span className="flex items-center gap-1 text-gray-600">
                    <Lock className="h-3 w-3" />
                    <span>{appointment.appointment_password}</span>
                  </span>
                )}
              </div>
            )}

            {appointment.appointment_mode === "in-person" && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>In-person meeting (details provided separately)</span>
              </div>
            )}

            {user && (
              <div className="text-sm text-gray-600">
                <strong>Contact:</strong> {user.phone || "No phone provided"}
              </div>
            )}

            {(appointment.status === "pending" || appointment.status === "approved") && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {appointment.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateAppointmentStatus(appointment.id, "approved")}
                      className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateAppointmentStatus(appointment.id, "rejected")}
                      className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenAdminRescheduleModal(appointment)}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reschedule
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderRescheduleRequestCard = (request: any) => {
    const appointment = request.appointments
    const user = request.users

    return (
      <Card key={request.id} className="mb-4 border-orange-200 hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <span>Reschedule Request</span>
              </CardTitle>
              <CardDescription className="mt-1">
                {appointment?.title} - {user?.full_name}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              {request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Appointment Details */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Current:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{new Date(appointment?.appointment_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {appointment?.start_time} - {appointment?.end_time}
                  </span>
                </div>
              </div>
            </div>

            {/* Requested New Time */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700 mb-2">Requested:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-blue-600">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>{new Date(request.requested_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {request.requested_start_time} - {request.requested_end_time}
                  </span>
                </div>
              </div>
            </div>

            {/* Reason */}
            {request.reason && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{request.reason}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="text-sm text-gray-600">
              <strong>Contact:</strong> {user?.phone || "No phone provided"}
            </div>

            {/* Action Buttons */}
            {request.status === "pending" && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() =>
                    handleRescheduleRequest(
                      request.id,
                      "approved",
                      appointment?.id,
                      request.requested_date,
                      request.requested_start_time,
                      request.requested_end_time,
                    )
                  }
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Approve Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRescheduleRequest(request.id, "rejected")}
                  className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}

            <div className="text-xs text-gray-500">Requested: {new Date(request.created_at).toLocaleDateString()}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingAppointments = appointments.filter((apt: any) => apt.status === "pending")
  const approvedAppointments = appointments.filter((apt: any) => apt.status === "approved")
  const completedAppointments = appointments.filter((apt: any) => apt.status === "completed")
  const pendingRescheduleRequests = rescheduleRequests.filter((req: any) => req.status === "pending")

  const getStatusCounts = () => ({
    all: appointments.length,
    pending: pendingAppointments.length,
    approved: approvedAppointments.length,
    completed: completedAppointments.length,
    reschedule: pendingRescheduleRequests.length,
  })

  const statusCounts = getStatusCounts()

  // Mobile view with filter dropdown
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Appointments</h2>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({statusCounts.all})</SelectItem>
              <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
              <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
              <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
              <SelectItem value="reschedule">
                Reschedule ({statusCounts.reschedule})
                {statusCounts.reschedule > 0 && <span className="ml-1 text-orange-600">●</span>}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {statusFilter === "reschedule" ? (
          pendingRescheduleRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <RotateCcw className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reschedule requests</h3>
                <p className="text-gray-500">Reschedule requests will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">{pendingRescheduleRequests.map(renderRescheduleRequestCard)}</div>
          )
        ) : getFilteredAppointments().length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-500">
                {statusFilter === "all" ? "No appointments yet." : `No ${statusFilter} appointments found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">{getFilteredAppointments().map(renderAppointmentCard)}</div>
        )}

        {showAdminRescheduleModal && currentAppointmentToReschedule && (
          <AdminRescheduleModal
            appointment={currentAppointmentToReschedule}
            onClose={handleCloseAdminRescheduleModal}
            onSuccess={handleAdminRescheduleSuccess}
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
          <TabsTrigger value="reschedule" className="flex flex-col py-2 relative">
            <span>Reschedule</span>
            <span className="text-xs opacity-70">({pendingRescheduleRequests.length})</span>
            {pendingRescheduleRequests.length > 0 && (
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full"></div>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending appointments</h3>
                <p className="text-gray-500">New appointment requests will appear here.</p>
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
                <Check className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
                <Check className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No completed appointments</h3>
                <p className="text-gray-500">Completed appointments will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{completedAppointments.map(renderAppointmentCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="reschedule" className="mt-6">
          {pendingRescheduleRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <RotateCcw className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reschedule requests</h3>
                <p className="text-gray-500">Reschedule requests will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">{pendingRescheduleRequests.map(renderRescheduleRequestCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      {showAdminRescheduleModal && currentAppointmentToReschedule && (
        <AdminRescheduleModal
          appointment={currentAppointmentToReschedule}
          onClose={handleCloseAdminRescheduleModal}
          onSuccess={handleAdminRescheduleSuccess}
        />
      )}
    </div>
  )
}
