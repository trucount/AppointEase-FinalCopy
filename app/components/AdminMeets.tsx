"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Video, Calendar, Clock, Users, Edit, Trash2, X } from "lucide-react"
import { getAllMeetings, createMeeting, updateMeeting, deleteMeeting, getUsers, supabase } from "../../lib/supabase"
import type { User } from "../../lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AdminMeets() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    meeting_date: "",
    start_time: "",
    end_time: "",
    participant_ids: [] as string[],
  })
  const [activeTab, setActiveTab] = useState("upcoming")

  useEffect(() => {
    loadData()

    // Set up real-time subscriptions
    const meetingsSubscription = supabase
      .channel("admin_meetings")
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
  }, [])

  const loadData = async () => {
    await Promise.all([loadMeetings(), loadUsers()])
  }

  const loadMeetings = async () => {
    try {
      const data = await getAllMeetings()
      setMeetings(data)
    } catch (error) {
      console.error("Error loading meetings:", error)
      setMeetings([])
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await getUsers()
      const regularUsers = data.filter((user: User) => user.role === "user")
      setUsers(regularUsers)
    } catch (error) {
      console.error("Error loading users:", error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const adminUser = JSON.parse(localStorage.getItem("appointease_user") || "{}")

      const meetingData = {
        title: formData.title,
        description: formData.description,
        meeting_date: formData.meeting_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        created_by_user_id: adminUser.id,
      }

      if (editingMeeting) {
        await updateMeeting(editingMeeting.id, meetingData, formData.participant_ids)
      } else {
        await createMeeting(meetingData, formData.participant_ids)
      }

      resetForm()
      loadMeetings()
    } catch (error) {
      console.error("Error saving meeting:", error)
      alert("Failed to save meeting")
    }
  }

  const handleEdit = (meeting: any) => {
    setEditingMeeting(meeting)
    setFormData({
      title: meeting.title,
      description: meeting.description || "",
      meeting_date: meeting.meeting_date,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      participant_ids: meeting.participants?.map((p: any) => p.id) || [],
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (meetingId: string) => {
    if (confirm("Are you sure you want to delete this meeting?")) {
      try {
        await deleteMeeting(meetingId)
        loadMeetings()
      } catch (error) {
        console.error("Error deleting meeting:", error)
        alert("Failed to delete meeting")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      meeting_date: "",
      start_time: "",
      end_time: "",
      participant_ids: [],
    })
    setShowCreateForm(false)
    setEditingMeeting(null)
  }

  const toggleParticipant = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(userId)
        ? prev.participant_ids.filter((id) => id !== userId)
        : [...prev.participant_ids, userId],
    }))
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

  const upcomingMeetings = meetings.filter((meeting) => {
    const { status } = getMeetingStatus(meeting.meeting_date, meeting.start_time)
    return status === "upcoming"
  })

  const completedMeetings = meetings.filter((meeting) => {
    const { status } = getMeetingStatus(meeting.meeting_date, meeting.start_time)
    return status === "completed"
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="h-6 text-blue-600 w-0" />
          <h2 className="text-2xl font-bold">Meetings </h2>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Create/Edit Meeting Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingMeeting ? "Edit Meeting" : "Schedule New Meeting"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="meeting_date">Date</Label>
                  <Input
                    id="meeting_date"
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meeting_date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label>Select Participants</Label>
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`user-${user.id}`}
                        checked={formData.participant_ids.includes(user.id)}
                        onChange={() => toggleParticipant(user.id)}
                        className="rounded"
                      />
                      <label htmlFor={`user-${user.id}`} className="text-sm">
                        {user.full_name} ({user.username})
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">Selected: {formData.participant_ids.length} participants</p>
              </div>

              <div className="flex space-x-2">
                <Button type="submit">{editingMeeting ? "Update Meeting" : "Schedule Meeting"}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Desktop Tabs */}
        <div className="hidden md:grid w-full grid-cols-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming ({upcomingMeetings.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedMeetings.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Mobile Select */}
        <div className="md:hidden w-full">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter meetings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming ({upcomingMeetings.length})</SelectItem>
              <SelectItem value="completed">Completed ({completedMeetings.length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingMeetings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming meetings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{meeting.title}</CardTitle>
                        {meeting.description && (
                          <CardDescription className="mt-1">{meeting.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-blue-600 border-blue-600">
                          Upcoming
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(meeting)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(meeting.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{meeting.participants?.length || 0} participants</span>
                        </div>
                      </div>

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Participants:</p>
                          <div className="flex flex-wrap gap-1">
                            {meeting.participants.map((participant: any) => (
                              <Badge key={participant.id} variant="secondary" className="text-xs">
                                {participant.full_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedMeetings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No completed meetings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{meeting.title}</CardTitle>
                        {meeting.description && (
                          <CardDescription className="mt-1">{meeting.description}</CardDescription>
                        )}
                      </div>
                      <Badge variant="outline" className="text-gray-600 border-gray-600">
                        Completed
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
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{meeting.participants?.length || 0} participants</span>
                        </div>
                      </div>

                      {meeting.participants && meeting.participants.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Participants:</p>
                          <div className="flex flex-wrap gap-1">
                            {meeting.participants.map((participant: any) => (
                              <Badge key={participant.id} variant="secondary" className="text-xs">
                                {participant.full_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
