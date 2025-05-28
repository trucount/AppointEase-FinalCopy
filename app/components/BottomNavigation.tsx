"use client"

import type { LucideIcon } from "lucide-react"

interface Tab {
  id: string
  label: string
  icon: LucideIcon
}

interface BottomNavigationProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export default function BottomNavigation({ tabs, activeTab, onTabChange }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${
                isActive ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className={`h-5 w-5 mb-1 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
              <span className={`text-xs font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
