"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import UserSettings from "./UserSettings"

interface UserHeaderProps {
  user: any
  onUserUpdate?: (user: any) => void
}

export default function UserHeader({ user, onUserUpdate }: UserHeaderProps) {
  const [showSettings, setShowSettings] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("appointease_user")
    router.push("/auth")
  }

  return (
    <>
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">AE</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AppointEase</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.full_name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowSettings(true)} variant="ghost" size="sm" className="p-2">
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden">
            <UserSettings user={user} onClose={() => setShowSettings(false)} onUserUpdate={onUserUpdate} />
          </div>
        </div>
      )}
    </>
  )
}
