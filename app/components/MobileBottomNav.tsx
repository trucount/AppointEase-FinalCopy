"use client"

import { Calendar, User, MessageSquare } from "lucide-react"

interface MobileBottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const tabs = [
    { id: "booking", label: "Book", icon: Calendar },
    { id: "appointments", label: "Appointments", icon: User },
    { id: "messages", label: "Messages", icon: MessageSquare },
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
