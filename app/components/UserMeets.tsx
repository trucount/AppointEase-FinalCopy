"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Video, User, Link, Lock } from "lucide-react"
import { getMeetingsForUser, supabase } from "../../lib/supabase"
import type { User as UserType } from "../../lib/supabase"

interface UserMeetsProps {
  user: UserType
}

export default function UserMeets({ user }: UserMeetsProps) {
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMeetings()

    // Set up real-time subscription for meetings
    const meetingsSubscription = supabase
      .channel("user_meetings")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => {
        loadMeetings()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_participants" }, () => {
        loadMeetings()
      })
      .subscribe()

    return () => {
      meetingsSubscription.unsubscribe()
    }
  }, [user])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const data = await getMeetingsForUser(user.id)
      setMeetings(data)
    } catch (error) {
      console.error("Error loading meetings:", error)
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }

  const getMeetingStatus = (meetingDate: string, startTime: string) => {
    const now = new Date()
    const meetingDateTime = new Date(`${meetingDate} ${startTime}`)

    if (meetingDateTime > now) {
      return { status: "upcoming", color: "text-blue-600 border-blue-600" }
    } else {
      return { status: "completed", color: "text-gray-600 border-gray-600" }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <Video className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">My Meetings</h2>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings scheduled</h3>
            <p className="text-gray-500">You don't have any meetings scheduled yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const { status, color } = getMeetingStatus(meeting.meeting_date, meeting.start_time)

            return (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Video className="h-5 w-5 text-blue-600" />
                        <span>{meeting.title}</span>
                      </CardTitle>
                      {meeting.description && <CardDescription className="mt-2">{meeting.description}</CardDescription>}
                    </div>
                    <Badge variant="outline" className={color}>
                      {status === "upcoming" ? "Upcoming" : "Completed"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>{new Date(meeting.meeting_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>
                          {meeting.start_time} - {meeting.end_time}
                        </span>
                      </div>
                    </div>

                    {/* Display Meeting Mode and Details */}
                    {meeting.meeting_mode && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Badge variant="secondary">{meeting.meeting_mode === "online" ? "Online" : "In-person"}</Badge>
                      </div>
                    )}
                    {meeting.meeting_mode === "online" && meeting.meeting_url && (
                      <div className="flex items-center space-x-1 text-sm text-blue-600">
                        <Link className="h-4 w-4" />
                        <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer" className="underline">
                          Join Meeting
                        </a>
                      </div>
                    )}
                    {meeting.meeting_mode === "online" && meeting.meeting_password && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Lock className="h-4 w-4" />
                        <span>Password: {meeting.meeting_password}</span>
                      </div>
                    )}

                    {meeting.created_by_user_name && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>Organized by: {meeting.created_by_user_name}</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Created: {new Date(meeting.created_at).toLocaleDateString()}
                    </div>
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
