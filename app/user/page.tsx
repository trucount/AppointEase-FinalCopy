"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, User, Video } from "lucide-react" // Added Video icon, removed MessageSquare
import UserBooking from "../components/UserBooking"
import UserAppointments from "../components/UserAppointments"
import UserMeets from "../components/UserMeets" // New import for UserMeets
import UserHeader from "../components/UserHeader"
import MobileBottomNav from "../components/MobileBottomNav"

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("booking")
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("appointease_user")
    if (!userData) {
      router.push("/auth")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "user") {
      router.push("/auth")
      return
    }

    setUser(parsedUser)
  }, [router])

  const handleUserUpdate = (updatedUser: any) => {
    setUser(updatedUser)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case "booking":
        return <UserBooking user={user} onBookingSuccess={() => {}} />
      case "appointments":
        return <UserAppointments user={user} />
      case "meets": // Changed from messages to meets
        return <UserMeets user={user} /> // Render UserMeets
      default:
        return <UserBooking user={user} onBookingSuccess={() => {}} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader user={user} onUserUpdate={handleUserUpdate} />

      {/* Desktop Tabs - Hidden on mobile */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="booking" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Book Appointment
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                My Appointments
              </TabsTrigger>
              <TabsTrigger value="meets" className="flex items-center gap-2">
                {" "}
                {/* Changed from messages to meets */}
                <Video className="h-4 w-4" /> {/* Changed icon */}
                Meets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="booking" className="mt-6">
              <UserBooking user={user} onBookingSuccess={() => {}} />
            </TabsContent>

            <TabsContent value="appointments" className="mt-6">
              <UserAppointments user={user} />
            </TabsContent>

            <TabsContent value="meets" className="mt-6">
              {" "}
              {/* Changed from messages to meets */}
              <UserMeets user={user} /> {/* Render UserMeets */}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Mobile Content - Shown on mobile */}
      <div className="md:hidden">
        <div className="px-4 py-6 pb-20">{renderContent()}</div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
