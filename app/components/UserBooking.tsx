"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Clock, Plus, AlertCircle, CheckCircle } from "lucide-react"
import { getAdminSettings, getAppointments, createAppointment } from "../../lib/supabase"
import type { User, AdminSettings } from "../../lib/supabase"

interface UserBookingProps {
  user: User
  onBookingSuccess: () => void
}

export default function UserBooking({ user, onBookingSuccess }: UserBookingProps) {
  const [selectedDate, setSelectedDate] = useState("")
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState<any>(null)
  const [appointmentData, setAppointmentData] = useState({
    title: "",
    description: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    id: "",
    start_time: "09:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",
    slot_duration: 60,
    created_at: "",
    updated_at: "",
  })

  useEffect(() => {
    loadAdminSettings()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      generateAvailableSlots()
    } else {
      setAvailableSlots([])
      setSelectedSlot(null)
    }
  }, [selectedDate, adminSettings])

  const loadAdminSettings = async () => {
    try {
      const settings = await getAdminSettings()
      setAdminSettings(settings)
    } catch (error) {
      console.error("Error loading admin settings:", error)
    }
  }

  const generateAvailableSlots = async () => {
    try {
      setMessage({ type: "info", text: "Loading available slots..." })

      // Load existing appointments for the selected date
      const appointments = await getAppointments()
      const bookedSlots = appointments
        .filter(
          (apt: any) =>
            apt.appointment_date === selectedDate && (apt.status === "approved" || apt.status === "pending"),
        )
        .map((apt: any) => ({
          startTime: apt.start_time,
          endTime: apt.end_time,
        }))

      // Generate all possible slots
      const slots = []
      const start = new Date(`2024-01-01 ${adminSettings.start_time}`)
      const end = new Date(`2024-01-01 ${adminSettings.end_time}`)
      const breakStart = new Date(`2024-01-01 ${adminSettings.break_start_time}`)
      const breakEnd = new Date(`2024-01-01 ${adminSettings.break_end_time}`)

      let current = new Date(start)

      while (current < end) {
        const slotEnd = new Date(current.getTime() + adminSettings.slot_duration * 60000)

        // Check if slot overlaps with break time
        const isBreakTime =
          (current >= breakStart && current < breakEnd) || (slotEnd > breakStart && slotEnd <= breakEnd)

        // Check if slot is already booked
        const isBooked = bookedSlots.some((booked: any) => {
          const bookedStart = new Date(`2024-01-01 ${booked.startTime}`)
          const bookedEnd = new Date(`2024-01-01 ${booked.endTime}`)
          return (current >= bookedStart && current < bookedEnd) || (slotEnd > bookedStart && slotEnd <= bookedEnd)
        })

        if (!isBreakTime && !isBooked && slotEnd <= end) {
          slots.push({
            startTime: current.toTimeString().slice(0, 5),
            endTime: slotEnd.toTimeString().slice(0, 5),
          })
        }

        current = slotEnd
      }

      setAvailableSlots(slots)
      setMessage(null)

      if (slots.length === 0) {
        setMessage({ type: "info", text: "No available slots for this date. Please try another date." })
      }
    } catch (error) {
      console.error("Error generating slots:", error)
      setAvailableSlots([])
      setMessage({ type: "error", text: "Failed to load available slots. Please try again." })
    }
  }

  const bookAppointment = async () => {
    if (!selectedSlot || !appointmentData.title.trim()) {
      setMessage({ type: "error", text: "Please fill in all required fields and select a time slot." })
      return
    }

    setLoading(true)
    setMessage({ type: "info", text: "Booking your appointment..." })

    try {
      // Check if slot is still available
      const appointments = await getAppointments()
      const existingAppointment = appointments.find(
        (apt: any) =>
          apt.appointment_date === selectedDate &&
          apt.start_time === selectedSlot.startTime &&
          (apt.status === "approved" || apt.status === "pending"),
      )

      if (existingAppointment) {
        setMessage({
          type: "error",
          text: "Sorry, this time slot has been taken by someone else. Please select another time.",
        })
        generateAvailableSlots()
        setLoading(false)
        return
      }

      // Create new appointment
      await createAppointment({
        user_id: user.id,
        title: appointmentData.title.trim(),
        description: appointmentData.description.trim() || null,
        appointment_date: selectedDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        status: "pending",
      })

      setMessage({ type: "success", text: "Appointment booked successfully! Waiting for admin approval." })

      // Reset form
      setSelectedDate("")
      setSelectedSlot(null)
      setAppointmentData({ title: "", description: "" })
      setAvailableSlots([])

      // Clear success message after 5 seconds
      setTimeout(() => setMessage(null), 5000)
      onBookingSuccess()
    } catch (error) {
      console.error("Error booking appointment:", error)
      setMessage({ type: "error", text: "Failed to book appointment. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3) // Allow booking up to 3 months in advance
  const maxDateString = maxDate.toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      {message && (
        <Alert
          className={
            message.type === "error"
              ? "border-red-200 bg-red-50"
              : message.type === "success"
                ? "border-green-200 bg-green-50"
                : "border-blue-200 bg-blue-50"
          }
        >
          {message.type === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
          {message.type === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
          {message.type === "info" && <Clock className="h-4 w-4 text-blue-600" />}
          <AlertDescription
            className={
              message.type === "error"
                ? "text-red-800"
                : message.type === "success"
                  ? "text-green-800"
                  : "text-blue-800"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Book New Appointment</span>
          </CardTitle>
          <CardDescription>Schedule a meeting with the admin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Appointment Title *</Label>
            <Input
              id="title"
              placeholder="e.g., UI Discussion, Project Review"
              value={appointmentData.title}
              onChange={(e) => setAppointmentData({ ...appointmentData, title: e.target.value })}
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1">{appointmentData.title.length}/100 characters</div>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of your appointment..."
              value={appointmentData.description}
              onChange={(e) => setAppointmentData({ ...appointmentData, description: e.target.value })}
              maxLength={500}
              rows={3}
            />
            <div className="text-xs text-gray-500 mt-1">{appointmentData.description.length}/500 characters</div>
          </div>

          <div>
            <Label htmlFor="date">Select Date *</Label>
            <Input
              id="date"
              type="date"
              min={today}
              max={maxDateString}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <div className="text-xs text-gray-500 mt-1">You can book up to 3 months in advance</div>
          </div>

          {selectedDate && (
            <div>
              <Label>Available Time Slots</Label>
              {availableSlots.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg mt-2">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No available slots for this date</p>
                  <p className="text-sm text-gray-400 mt-1">Try selecting a different date</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {availableSlots.map((slot: any, index) => (
                    <Button
                      key={index}
                      variant={selectedSlot === slot ? "default" : "outline"}
                      className="text-sm h-10"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {slot.startTime} - {slot.endTime}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={bookAppointment}
            disabled={loading || !selectedSlot || !appointmentData.title.trim()}
            className="w-full h-12"
          >
            {loading ? "Booking..." : "Book Appointment"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Availability</CardTitle>
          <CardDescription>Current working hours and schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Working Hours:</span>
              <span className="font-medium text-blue-600">
                {adminSettings.start_time} - {adminSettings.end_time}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Break Time:</span>
              <span className="font-medium text-orange-600">
                {adminSettings.break_start_time} - {adminSettings.break_end_time}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">Slot Duration:</span>
              <span className="font-medium text-green-600">{adminSettings.slot_duration} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
