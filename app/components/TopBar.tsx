"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { User, Settings, LogOut, Save, Eye, EyeOff, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateUser, checkUsernameExists, updateAdminSettings } from "@/lib/supabase"
import type { User as UserType, AdminSettings } from "@/lib/supabase"

interface TopBarProps {
  user: UserType
  onUserUpdate?: (updatedUser: UserType) => void
}

export default function TopBar({ user, onUserUpdate }: TopBarProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const [profileData, setProfileData] = useState({
    fullName: user?.full_name || "",
    username: user?.username || "",
    phone: user?.phone || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [adminSettings, setAdminSettings] = useState<Partial<AdminSettings>>({
    start_time: "09:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",
    slot_duration: 60,
  })

  const updateProfile = async () => {
    if (!profileData.fullName.trim() || !profileData.username.trim()) {
      alert("Please fill in all required fields.")
      return
    }

    if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
      alert("New passwords don't match.")
      return
    }

    if (profileData.newPassword && profileData.newPassword.length < 4) {
      alert("Password must be at least 4 characters long.")
      return
    }

    setLoading(true)
    try {
      // Check if username is taken by another user
      const usernameExists = await checkUsernameExists(profileData.username.trim(), user.id)
      if (usernameExists) {
        alert("Username already taken. Please choose a different username.")
        setLoading(false)
        return
      }

      const updates: Partial<UserType> = {
        full_name: profileData.fullName.trim(),
        username: profileData.username.trim(),
        phone: profileData.phone.trim() || null,
      }

      if (profileData.newPassword) {
        updates.password = profileData.newPassword
      }

      const updatedUser = await updateUser(user.id, updates)

      localStorage.setItem("appointease_user", JSON.stringify(updatedUser))

      if (onUserUpdate) {
        onUserUpdate(updatedUser)
      }

      alert("Profile updated successfully!")
      setShowProfile(false)
      setProfileData({
        ...profileData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const saveAdminSettings = async () => {
    setLoading(true)
    try {
      await updateAdminSettings(adminSettings)
      alert("Settings saved successfully!")
      setShowSettings(false)
    } catch (error) {
      console.error("Error saving settings:", error)
      alert("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("appointease_user")
    router.push("/auth")
  }

  return (
    <>
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">AE</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {user?.role === "admin" ? "Admin Panel" : "AppointEase"}
                </h1>
                <p className="text-xs text-gray-500">Hello, {user?.full_name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setShowProfile(true)} className="p-2">
                <User className="h-5 w-5" />
              </Button>

              {user?.role === "admin" && (
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="p-2">
                  <Settings className="h-5 w-5" />
                </Button>
              )}

              <Button variant="ghost" size="sm" onClick={logout} className="p-2 text-red-600">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Profile Settings</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowProfile(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Change Password (Optional)</h4>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={profileData.newPassword}
                        onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                        placeholder="Enter new password (min 4 chars)"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User ID:</span>
                    <span className="font-medium">{user?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Role:</span>
                    <Badge variant="outline" className="capitalize">
                      {user?.role}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since:</span>
                    <span className="font-medium">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button onClick={updateProfile} disabled={loading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setShowProfile(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Settings Modal */}
      {showSettings && user?.role === "admin" && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Admin Settings</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Configure working hours and appointment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={adminSettings.start_time}
                    onChange={(e) => setAdminSettings({ ...adminSettings, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={adminSettings.end_time}
                    onChange={(e) => setAdminSettings({ ...adminSettings, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breakStartTime">Break Start</Label>
                  <Input
                    id="breakStartTime"
                    type="time"
                    value={adminSettings.break_start_time}
                    onChange={(e) => setAdminSettings({ ...adminSettings, break_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="breakEndTime">Break End</Label>
                  <Input
                    id="breakEndTime"
                    type="time"
                    value={adminSettings.break_end_time}
                    onChange={(e) => setAdminSettings({ ...adminSettings, break_end_time: e.target.value })}
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
                  value={adminSettings.slot_duration}
                  onChange={(e) =>
                    setAdminSettings({ ...adminSettings, slot_duration: Number.parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button onClick={saveAdminSettings} disabled={loading} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : "Save Settings"}
                </Button>
                <Button variant="outline" onClick={() => setShowSettings(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
