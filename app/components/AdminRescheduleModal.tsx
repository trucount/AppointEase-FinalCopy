"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Calendar, Clock, Link, Lock, MapPin } from "lucide-react"
import { updateAppointment } from "../../lib/supabase"
import type { Appointment } from "../../lib/supabase"

interface AdminRescheduleModalProps {
  appointment: Appointment
  onClose: () => void
  onSuccess: () => void
}

export default function AdminRescheduleModal({ appointment, onClose, onSuccess }: AdminRescheduleModalProps) {
  const [formData, setFormData] = useState({
    new_date: appointment.appointment_date,
    new_start_time: appointment.start_time,
    new_end_time: appointment.end_time,
    appointment_mode: appointment.appointment_mode || "online", // Default to online
    appointment_url: appointment.appointment_url || "",
    appointment_password: appointment.appointment_password || "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { new_date, new_start_time, new_end_time, appointment_mode, appointment_url, appointment_password } =
        formData
      const updates: Partial<Appointment> = {
        appointment_date: new_date,
        start_time: new_start_time,
        end_time: new_end_time,
        appointment_mode: appointment_mode,
        appointment_url: appointment_mode === "online" ? appointment_url : null,
        appointment_password: appointment_mode === "online" ? appointment_password : null,
      }

      await updateAppointment(appointment.id, updates)

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error rescheduling appointment:", error)
      alert("Failed to reschedule appointment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reschedule Appointment</CardTitle>
              <CardDescription>Rescheduling: {appointment.title}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Current Appointment:</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{appointment.appointment_date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {appointment.start_time} - {appointment.end_time}
                </span>
              </div>
              {appointment.appointment_mode === "online" && appointment.appointment_url && (
                <div className="flex items-center gap-1">
                  <Link className="h-4 w-4" />
                  <a
                    href={appointment.appointment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Online
                  </a>
                  {appointment.appointment_password && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>{appointment.appointment_password}</span>
                    </span>
                  )}
                </div>
              )}
              {appointment.appointment_mode === "in-person" && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>In-person</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new_date">New Date</Label>
              <Input
                id="new_date"
                type="date"
                value={formData.new_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, new_date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new_start_time">New Start Time</Label>
                <Input
                  id="new_start_time"
                  type="time"
                  value={formData.new_start_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, new_start_time: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new_end_time">New End Time</Label>
                <Input
                  id="new_end_time"
                  type="time"
                  value={formData.new_end_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, new_end_time: e.target.value }))}
                  required
                />
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

            <div className="flex space-x-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Updating..." : "Update Appointment"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
