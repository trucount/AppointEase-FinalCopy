"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, Calendar, Users, Video, Settings } from "lucide-react" // Added Video icon, removed MessageSquare

import AdminDashboard from "../components/AdminDashboard"
import AdminAppointments from "../components/AdminAppointments"
import AdminUsers from "../components/AdminUsers"
import AdminMeets from "../components/AdminMeets" // New import for AdminMeets
import AdminSettings from "../components/AdminSettings"
import AdminHeader from "../components/AdminHeader"

// Bottom navigation component for Admin (internal to this file)
function MobileBottomNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "appointments", label: "Appointments", icon: Calendar },
    { id: "users", label: "Users", icon: Users },
    { id: "meets", label: "Meets", icon: Video }, // Changed from Messages to Meets
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50 md:hidden">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all min-w-0 flex-1 ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700 active:text-blue-600"
              }`}
            >
              <Icon className={`h-6 w-6 mb-1 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
              <span className={`text-xs font-medium truncate ${isActive ? "text-blue-600" : "text-gray-500"}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("dashboard")
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("appointease_user")
    if (!userData) {
      router.push("/auth")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "admin") {
      router.push("/auth")
      return
    }

    setUser(parsedUser)
  }, [router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Header */}
      <AdminHeader user={user} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <div className="grid grid-cols-5 gap-4 mb-6">
            {" "}
            {/* Changed grid-cols-4 to grid-cols-5 */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                activeTab === "dashboard" ? "bg-blue-100 text-blue-700" : "bg-white border"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("appointments")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                activeTab === "appointments" ? "bg-blue-100 text-blue-700" : "bg-white border"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Appointments
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                activeTab === "users" ? "bg-blue-100 text-blue-700" : "bg-white border"
              }`}
            >
              <Users className="h-4 w-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab("meets")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                activeTab === "meets" ? "bg-blue-100 text-blue-700" : "bg-white border"
              }`}
            >
              <Video className="h-4 w-4" />
              Meets
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                activeTab === "settings" ? "bg-blue-100 text-blue-700" : "bg-white border"
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "appointments" && <AdminAppointments />}
          {activeTab === "users" && <AdminUsers />}
          {activeTab === "meets" && <AdminMeets />} {/* Changed from AdminMessages to AdminMeets */}
          {activeTab === "settings" && <AdminSettings />}
        </div>
      </div>

      {/* Bottom Navigation (only on mobile) */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
