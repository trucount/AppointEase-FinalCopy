"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAppointment, getAdminSettings } from "../../lib/supabase"
import type { User, AdminSettings } from "../../lib/supabase"

interface UserBookingProps {
  user: User
}

export default function UserBooking({ user }: UserBookingProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointment_date: "",
    start_time: "",
    end_time: "",
    appointment_mode: "online", // Default to online
    appointment_url: "",
    appointment_password: "",
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const fetchAdminSettings = async () => {
      try {
        const settings = await getAdminSettings()
        setAdminSettings(settings)
      } catch (error) {
        console.error("Error fetching admin settings:", error)
      }
    }
    fetchAdminSettings()
  }, [])

  useEffect(() => {
    if (formData.appointment_date && adminSettings) {
      generateTimeSlots()
    }
  }, [formData.appointment_date, adminSettings])

  const generateTimeSlots = () => {
    if (!adminSettings) return []

    const slots: string[] = []
    const start = new Date(`2000-01-01T${adminSettings.start_time}`)
    const end = new Date(`2000-01-01T${adminSettings.end_time}`)
    const breakStart = new Date(`2000-01-01T${adminSettings.break_start_time}`)
    const breakEnd = new Date(`2000-01-01T${adminSettings.break_end_time}`)
    const slotDuration = adminSettings.slot_duration

    let currentTime = start
    while (currentTime.getTime() < end.getTime()) {
      const slotEndTime = new Date(currentTime.getTime() + slotDuration * 60 * 1000)

      // Check for overlap with break time
      const isDuringBreak =
        (currentTime.getTime() >= breakStart.getTime() && currentTime.getTime() < breakEnd.getTime()) ||
        (slotEndTime.getTime() > breakStart.getTime() && slotEndTime.getTime() <= breakEnd.getTime()) ||
        (breakStart.getTime() > currentTime.getTime() && breakEnd.getTime() < slotEndTime.getTime())

      if (!isDuringBreak && slotEndTime.getTime() <= end.getTime()) {
        slots.push(currentTime.toTimeString().slice(0, 5))
      }
      currentTime = slotEndTime
    }
    setAvailableSlots(slots)
  }

  const handleTimeChange = (value: string) => {
    if (value === "unavailable") return
    const selectedTime = value
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const startTimeDate = new Date(0, 0, 0, hours, minutes)
    const endTimeDate = new Date(startTimeDate.getTime() + (adminSettings?.slot_duration || 60) * 60 * 1000)
    const endTime = endTimeDate.toTimeString().slice(0, 5)

    setFormData((prev) => ({
      ...prev,
      start_time: selectedTime,
      end_time: endTime,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { appointment_mode, appointment_url, appointment_password, ...rest } = formData
      const dataToInsert = {
        ...rest,
        user_id: user.id,
        status: "pending",
        appointment_mode: appointment_mode,
        appointment_url: appointment_mode === "online" ? appointment_url : null,
        appointment_password: appointment_mode === "online" ? appointment_password : null,
      }

      await createAppointment(dataToInsert)
      setMessage({ type: "success", text: "Appointment booked successfully! Awaiting admin approval." })
      setFormData({
        title: "",
        description: "",
        appointment_date: "",
        start_time: "",
        end_time: "",
        appointment_mode: "online",
        appointment_url: "",
        appointment_password: "",
      })
    } catch (error) {
      console.error("Error booking appointment:", error)
      setMessage({ type: "error", text: "Failed to book appointment. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Book New Appointment</CardTitle>
        <CardDescription>Fill out the details below to request an appointment.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Appointment Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Project Discussion, Consultation"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Provide more details about your appointment."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="appointment_date">Date</Label>
              <Input
                id="appointment_date"
                type="date"
                value={formData.appointment_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, appointment_date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div>
              <Label htmlFor="start_time">Time</Label>
              <Select value={formData.start_time} onValueChange={handleTimeChange} required>
                <SelectTrigger id="start_time" disabled={availableSlots.length === 0}>
                  <SelectValue placeholder="Select a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {availableSlots.length > 0 ? (
                    availableSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot} -{" "}
                        {new Date(
                          new Date(`2000-01-01T${slot}`).getTime() + (adminSettings?.slot_duration || 60) * 60 * 1000,
                        )
                          .toTimeString()
                          .slice(0, 5)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="unavailable" disabled>
                      No slots available for this date or settings not loaded.
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="appointment_mode">Meeting Mode</Label>
            <Select
              value={formData.appointment_mode}
              onValueChange={(value: "online" | "in-person") =>
                setFormData((prev) => ({ ...prev, appointment_mode: value }))
              }
              required
            >
              <SelectTrigger id="appointment_mode">
                <SelectValue placeholder="Select meeting mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in-person">In-person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.appointment_mode === "online" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="appointment_url">Meeting URL</Label>
                <Input
                  id="appointment_url"
                  type="url"
                  value={formData.appointment_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, appointment_url: e.target.value }))}
                  placeholder="e.g., https://zoom.us/j/1234567890"
                  required={formData.appointment_mode === "online"}
                />
              </div>
              <div>
                <Label htmlFor="appointment_password">Meeting Password (Optional)</Label>
                <Input
                  id="appointment_password"
                  type="text"
                  value={formData.appointment_password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, appointment_password: e.target.value }))}
                  placeholder="e.g., 12345"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Booking..." : "Request Appointment"}
          </Button>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-sm ${
                message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
