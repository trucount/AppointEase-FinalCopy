"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { X, Calendar, Clock } from "lucide-react"
import { createRescheduleRequest } from "../../lib/supabase"
import type { Appointment, User } from "../../lib/supabase"

interface RescheduleRequestModalProps {
  appointment: Appointment
  user: User
  onClose: () => void
  onSuccess: () => void
}

export default function RescheduleRequestModal({ appointment, user, onClose, onSuccess }: RescheduleRequestModalProps) {
  const [formData, setFormData] = useState({
    requested_date: "",
    requested_start_time: "",
    requested_end_time: "",
    reason: "",
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await createRescheduleRequest({
        appointment_id: appointment.id,
        requested_by_user_id: user.id,
        requested_date: formData.requested_date,
        requested_start_time: formData.requested_start_time,
        requested_end_time: formData.requested_end_time,
        reason: formData.reason,
        status: "pending",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error("Error creating reschedule request:", error)
      alert("Failed to submit reschedule request")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Request Reschedule</CardTitle>
              <CardDescription>Request to reschedule: {appointment.title}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto pb-6">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Current Appointment:</p>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{appointment.appointment_date}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {appointment.start_time} - {appointment.end_time}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="requested_date">Preferred New Date</Label>
              <Input
                id="requested_date"
                type="date"
                value={formData.requested_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, requested_date: e.target.value }))}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requested_start_time">Start Time</Label>
                <Input
                  id="requested_start_time"
                  type="time"
                  value={formData.requested_start_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requested_start_time: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="requested_end_time">End Time</Label>
                <Input
                  id="requested_end_time"
                  type="time"
                  value={formData.requested_end_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requested_end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Reschedule (Optional)</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="Please explain why you need to reschedule..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Submitting..." : "Submit Request"}
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
