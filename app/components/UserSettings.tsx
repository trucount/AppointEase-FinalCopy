"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Phone, Save, X, Settings } from "lucide-react"
import { updateUser } from "../../lib/supabase"
import type { User as UserType } from "../../lib/supabase"
import { ThemeToggle } from "./ThemeToggle" // Import ThemeToggle

interface UserSettingsProps {
  user: UserType
  onClose?: () => void
  onUserUpdate?: (user: UserType) => void
}

export default function UserSettings({ user, onClose, onUserUpdate }: UserSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    phone: user.phone || "",
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      const updatedUser = await updateUser(user.id, {
        full_name: formData.full_name,
        phone: formData.phone || null,
      })

      // Update localStorage
      localStorage.setItem("appointease_user", JSON.stringify(updatedUser))

      if (onUserUpdate) {
        onUserUpdate(updatedUser)
      }

      alert("Settings updated successfully!")

      if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      alert("Failed to update settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {onClose && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Profile Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile Settings</span>
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" value={user.username} disabled />
            <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
          </div>

          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="Enter phone number"
                className="pl-10"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Role:</span>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Member since:</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dark Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Theme Settings</span>
          </CardTitle>
          <CardDescription>Adjust the application's appearance</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="theme-toggle">Dark Mode</Label>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  )
}
