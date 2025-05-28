import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  username: string
  password: string
  full_name: string
  phone?: string
  role: "user" | "admin"
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  user_id: string
  title: string
  description?: string
  appointment_date: string
  start_time: string
  end_time: string
  status: "pending" | "approved" | "rejected" | "completed"
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  seen_at?: string
  created_at: string
}

export interface AdminSettings {
  id: string
  start_time: string
  end_time: string
  break_start_time: string
  break_end_time: string
  slot_duration: number
  last_cleanup?: string
  created_at: string
  updated_at: string
}

// Authentication helpers
export async function authenticateUser(username: string, password: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Invalid credentials")
    }
    throw error
  }
  return data
}

export async function createUser(userData: Omit<User, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("users").insert([userData]).select().single()

  if (error) throw error
  return data
}

// User functions
export async function getUsers() {
  const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserById(id: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).single()

  if (error) throw error
  return data
}

export async function updateUser(id: string, updates: Partial<User>) {
  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Appointment functions
export async function getAppointments() {
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      users!appointments_user_id_fkey(
        id,
        username,
        full_name,
        phone,
        role
      )
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUserAppointments(userId: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createAppointment(appointmentData: Omit<Appointment, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("appointments").insert([appointmentData]).select().single()

  if (error) throw error
  return data
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  const { data, error } = await supabase
    .from("appointments")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Message functions
export async function getMessages(userId?: string) {
  let query = supabase.from("messages").select("*").order("created_at", { ascending: true })

  if (userId) {
    query = query.or(
      `and(sender_id.eq.${userId},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${userId})`,
    )
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function createMessage(messageData: Omit<Message, "id" | "created_at">) {
  const { data, error } = await supabase.from("messages").insert([messageData]).select().single()

  if (error) throw error
  return data
}

export async function markMessagesAsSeen(messageIds: string[]) {
  const { error } = await supabase.from("messages").update({ seen_at: new Date().toISOString() }).in("id", messageIds)

  if (error) throw error
}

// Admin settings functions
export async function getAdminSettings() {
  const { data, error } = await supabase.from("admin_settings").select("*").limit(1).single()

  if (error) {
    if (error.code === "PGRST116") {
      return await createDefaultAdminSettings()
    }
    throw error
  }
  return data
}

export async function createDefaultAdminSettings() {
  const defaultSettings = {
    start_time: "09:00",
    end_time: "17:00",
    break_start_time: "12:00",
    break_end_time: "13:00",
    slot_duration: 60,
  }

  const { data, error } = await supabase.from("admin_settings").insert([defaultSettings]).select().single()

  if (error) throw error
  return data
}

export async function updateAdminSettings(updates: Partial<AdminSettings>) {
  const currentSettings = await getAdminSettings()

  const { data, error } = await supabase
    .from("admin_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", currentSettings.id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper function to check if a username exists, optionally excluding a user ID
export async function checkUsernameExists(username: string, excludeUserId?: string) {
  let query = supabase.from("users").select("id").eq("username", username)

  if (excludeUserId) {
    query = query.neq("id", excludeUserId)
  }

  const { data, error } = await query.single()

  if (error && error.code === "PGRST116") {
    return false // Username doesn't exist
  }
  if (error) throw error
  return true // Username exists
}
