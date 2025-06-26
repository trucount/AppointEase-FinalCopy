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
  // New fields for appointment mode and details
  appointment_mode?: "online" | "in-person"
  appointment_url?: string
  appointment_password?: string
}

export interface Meeting {
  id: string
  title: string
  description?: string
  meeting_date: string
  start_time: string
  end_time: string
  created_by_user_id: string | null
  created_at: string
  updated_at: string
  participants?: User[]
  created_by_user_name?: string
  // New fields
  meeting_mode?: "online" | "in-person"
  meeting_url?: string
  meeting_password?: string
}

export interface RescheduleRequest {
  id: string
  appointment_id: string
  requested_by_user_id: string
  requested_date: string
  requested_start_time: string
  requested_end_time: string
  reason?: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  updated_at: string
  appointments?: Appointment
  users?: User
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

async function ensureDemoAdmin() {
  // Check if demo admin already exists
  const { data: existing } = await supabase.from("users").select("id").eq("username", "Head").single()

  if (existing) return existing

  // Create the demo admin record
  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        username: "Head",
        password: "Testplay",
        full_name: "Administrator",
        role: "admin",
      },
    ])
    .select()
    .single()

  if (error) {
    console.error("Failed to create demo admin:", error)
    throw error
  }

  return data
}

// Authentication helpers
export async function authenticateUser(username: string, password: string) {
  // If the demo creds are used, be sure the account exists
  if (username === "Head" && password === "Testplay") {
    await ensureDemoAdmin()
  }

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

// Meeting functions - Fixed to handle relationships properly
export async function createMeeting(
  meetingData: Omit<Meeting, "id" | "created_at" | "updated_at" | "participants">,
  participantIds: string[],
) {
  try {
    // Create the meeting first
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .insert([meetingData])
      .select()
      .single()

    if (meetingError) throw meetingError

    // Add participants if any
    if (participantIds.length > 0) {
      const participantsToInsert = participantIds.map((userId) => ({
        meeting_id: meeting.id,
        user_id: userId,
      }))

      const { error: participantsError } = await supabase.from("meeting_participants").insert(participantsToInsert)

      if (participantsError) throw participantsError
    }

    return meeting
  } catch (error) {
    console.error("Error creating meeting:", error)
    throw error
  }
}

export async function getMeetingsForUser(userId: string) {
  try {
    // Get meetings where user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from("meeting_participants")
      .select("meeting_id")
      .eq("user_id", userId)

    if (participantError) throw participantError

    if (!participantData || participantData.length === 0) {
      return []
    }

    const meetingIds = participantData.map((p) => p.meeting_id)

    // Get the actual meeting details
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(`
        *,
        users!meetings_created_by_user_id_fkey(full_name)
      `)
      .in("id", meetingIds)
      .order("meeting_date", { ascending: true })

    if (meetingsError) throw meetingsError

    return (
      meetings.map((meeting) => ({
        ...meeting,
        created_by_user_name: meeting.users?.full_name,
      })) || []
    )
  } catch (error) {
    console.error("Error getting user meetings:", error)
    throw error
  }
}

export async function getAllMeetings() {
  try {
    // Get all meetings with creator info
    const { data: meetings, error: meetingsError } = await supabase
      .from("meetings")
      .select(`
        *,
        users!meetings_created_by_user_id_fkey(full_name)
      `)
      .order("meeting_date", { ascending: true })

    if (meetingsError) throw meetingsError

    if (!meetings || meetings.length === 0) {
      return []
    }

    // Get participants for each meeting
    const meetingIds = meetings.map((m) => m.id)
    const { data: participants, error: participantsError } = await supabase
      .from("meeting_participants")
      .select(`
        meeting_id,
        users!meeting_participants_user_id_fkey(id, full_name)
      `)
      .in("meeting_id", meetingIds)

    if (participantsError) throw participantsError

    // Group participants by meeting
    const participantsByMeeting = (participants || []).reduce(
      (acc, p) => {
        if (!acc[p.meeting_id]) {
          acc[p.meeting_id] = []
        }
        acc[p.meeting_id].push(p.users)
        return acc
      },
      {} as Record<string, any[]>,
    )

    // Combine meetings with their participants
    return meetings.map((meeting) => ({
      ...meeting,
      created_by_user_name: meeting.users?.full_name,
      participants: participantsByMeeting[meeting.id] || [],
    }))
  } catch (error) {
    console.error("Error getting all meetings:", error)
    throw error
  }
}

export async function updateMeeting(
  id: string,
  updates: Partial<Omit<Meeting, "participants">>,
  participantIds?: string[],
) {
  try {
    // Update the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from("meetings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (meetingError) throw meetingError

    // Update participants if provided
    if (participantIds !== undefined) {
      // Delete existing participants
      const { error: deleteError } = await supabase.from("meeting_participants").delete().eq("meeting_id", id)

      if (deleteError) throw deleteError

      // Insert new participants
      if (participantIds.length > 0) {
        const participantsToInsert = participantIds.map((userId) => ({
          meeting_id: id,
          user_id: userId,
        }))

        const { error: insertError } = await supabase.from("meeting_participants").insert(participantsToInsert)

        if (insertError) throw insertError
      }
    }

    return meeting
  } catch (error) {
    console.error("Error updating meeting:", error)
    throw error
  }
}

export async function deleteMeeting(id: string) {
  try {
    const { error } = await supabase.from("meetings").delete().eq("id", id)
    if (error) throw error
  } catch (error) {
    console.error("Error deleting meeting:", error)
    throw error
  }
}

// Reschedule Request functions
export async function createRescheduleRequest(
  requestData: Omit<RescheduleRequest, "id" | "created_at" | "updated_at" | "appointments" | "users">,
) {
  const { data, error } = await supabase.from("reschedule_requests").insert([requestData]).select().single()

  if (error) throw error
  return data
}

export async function getRescheduleRequests() {
  const { data, error } = await supabase
    .from("reschedule_requests")
    .select(`
      *,
      appointments(*),
      users!reschedule_requests_requested_by_user_id_fkey(id, full_name, username, phone)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateRescheduleRequest(id: string, updates: Partial<RescheduleRequest>) {
  const { data, error } = await supabase
    .from("reschedule_requests")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
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

// Helper function to get meetings data
export async function getMeetings() {
  const { data, error } = await supabase.from("meetings").select("*").order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching meetings:", error)
    throw error
  }

  return data || []
}
