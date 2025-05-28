"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Save, Clock } from "lucide-react"
import { getAdminSettings, updateAdminSettings } from "../../lib/supabase"
import type { AdminSettings as AdminSettingsType } from "../../lib/supabase"

export default function AdminSettings() {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<AdminSettingsType>({
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
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await getAdminSettings()
      setSettings(data)
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateAdminSettings({
        start_time: settings.start_time,
        end_time: settings.end_time,
        break_start_time: settings.break_start_time,
        break_end_time: settings.break_end_time,
        slot_duration: settings.slot_duration,
      })

      alert("Settings updated successfully!")
    } catch (error) {
      console.error("Error updating settings:", error)
      alert("Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Working Hours</span>
          </CardTitle>
          <CardDescription>Configure your availability and appointment slots</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={settings.start_time}
                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={settings.end_time}
                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="breakStart">Break Start</Label>
              <Input
                id="breakStart"
                type="time"
                value={settings.break_start_time}
                onChange={(e) => setSettings({ ...settings, break_start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="breakEnd">Break End</Label>
              <Input
                id="breakEnd"
                type="time"
                value={settings.break_end_time}
                onChange={(e) => setSettings({ ...settings, break_end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
            <Input
              id="slotDuration"
              type="number"
              min="15"
              max="240"
              step="15"
              value={settings.slot_duration}
              onChange={(e) => setSettings({ ...settings, slot_duration: Number.parseInt(e.target.value) })}
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Current Schedule</span>
          </CardTitle>
          <CardDescription>Preview of your current availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
              <span className="text-sm font-medium text-blue-700">Working Hours:</span>
              <span className="font-medium text-blue-600">
                {settings.start_time} - {settings.end_time}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-orange-50 rounded">
              <span className="text-sm font-medium text-orange-700">Break Time:</span>
              <span className="font-medium text-orange-600">
                {settings.break_start_time} - {settings.break_end_time}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="text-sm font-medium text-green-700">Slot Duration:</span>
              <span className="font-medium text-green-600">{settings.slot_duration} minutes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
