"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const user = localStorage.getItem("appointease_user")
    if (user) {
      const userData = JSON.parse(user)
      if (userData.role === "admin") {
        router.push("/admin")
      } else {
        router.push("/user")
      }
    } else {
      router.push("/auth")
    }
  }, [router])

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-2xl">
          <span className="text-2xl font-bold text-blue-600">AE</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">AppointEase</h1>
        <p className="text-blue-100">Redirecting...</p>
      </div>
    </div>
  )
}
