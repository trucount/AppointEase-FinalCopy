"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { User, Phone, Search } from "lucide-react"
import { getUsers, getAppointments, supabase } from "../../lib/supabase"
import type { User as UserType } from "../../lib/supabase"

export default function AdminUsers() {
  const [users, setUsers] = useState<UserType[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
    loadAppointments()

    // Set up real-time subscriptions
    const usersSubscription = supabase
      .channel("admin_users")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => {
        loadUsers()
      })
      .subscribe()

    const appointmentsSubscription = supabase
      .channel("admin_user_appointments")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadAppointments()
      })
      .subscribe()

    return () => {
      usersSubscription.unsubscribe()
      appointmentsSubscription.unsubscribe()
    }
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.filter((user: UserType) => user.role === "user"))
    } catch (error) {
      console.error("Error loading users:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const loadAppointments = async () => {
    try {
      const data = await getAppointments()
      setAppointments(data)
    } catch (error) {
      console.error("Error loading appointments:", error)
      setAppointments([])
    }
  }

  const getUserAppointments = (userId: string) => {
    return appointments.filter((apt: any) => apt.user_id === userId)
  }

  const filteredUsers = users.filter(
    (user: UserType) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm),
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Management</h2>
        
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? "No users found matching your search" : "No users registered yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user: UserType) => {
            const userAppointments = getUserAppointments(user.id)

            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{user.full_name}</h3>
                        <p className="text-sm text-gray-500">@{user.username}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{user.phone || "No phone"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-500">{userAppointments.length} total appointments</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 mt-3 text-xs">
                    <span className="text-yellow-600">
                      {userAppointments.filter((apt) => apt.status === "pending").length} pending
                    </span>
                    <span className="text-green-600">
                      {userAppointments.filter((apt) => apt.status === "approved").length} approved
                    </span>
                    <span className="text-blue-600">
                      {userAppointments.filter((apt) => apt.status === "completed").length} completed
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
