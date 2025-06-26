"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet, RefreshCw, Download, Copy } from "lucide-react"
import { getAppointments, getUsers, getAllMeetings } from "@/lib/supabase"

interface GoogleSheetsConfig {
  connected: boolean
  lastSync: string | null
  autoSync: boolean
}

export default function GoogleSheetsSync() {
  const [config, setConfig] = useState<GoogleSheetsConfig>({
    connected: false,
    lastSync: null,
    autoSync: true,
  })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [csvData, setCsvData] = useState<{
    appointments: string
    users: string
    meetings: string
  } | null>(null)

  useEffect(() => {
    loadConfig()
    if (config.connected && config.autoSync) {
      syncData()
    }
  }, [])

  const loadConfig = () => {
    const savedConfig = localStorage.getItem("appointease-sheets-config")
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig))
    }
  }

  const saveConfig = (newConfig: GoogleSheetsConfig) => {
    setConfig(newConfig)
    localStorage.setItem("appointease-sheets-config", JSON.stringify(newConfig))
  }

  const connectToGoogleSheets = async () => {
    setLoading(true)
    try {
      // Simulate connection by generating CSV data
      await syncData()

      // Save configuration
      const newConfig: GoogleSheetsConfig = {
        connected: true,
        lastSync: new Date().toISOString(),
        autoSync: true,
      }
      saveConfig(newConfig)

      alert(
        "Successfully prepared data for Google Sheets! You can now download CSV files or copy data to paste into Google Sheets.",
      )
    } catch (error) {
      console.error("Error preparing data:", error)
      alert("Failed to prepare data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const syncData = async () => {
    setSyncing(true)
    try {
      // Fetch data from Supabase
      const [appointments, users, meetings] = await Promise.all([getAppointments(), getUsers(), getAllMeetings()])

      // Generate CSV data
      const appointmentsCsv = generateAppointmentsCsv(appointments)
      const usersCsv = generateUsersCsv(users, appointments, meetings)
      const meetingsCsv = generateMeetingsCsv(meetings)

      setCsvData({
        appointments: appointmentsCsv,
        users: usersCsv,
        meetings: meetingsCsv,
      })

      // Update last sync time
      const updatedConfig = {
        ...config,
        connected: true,
        lastSync: new Date().toISOString(),
      }
      saveConfig(updatedConfig)
    } catch (error) {
      console.error("Error syncing data:", error)
      alert("Failed to sync data")
    } finally {
      setSyncing(false)
    }
  }

  const generateAppointmentsCsv = (appointments: any[]) => {
    const headers = ["ID", "User Name", "Title", "Date", "Start Time", "End Time", "Status", "Created At"]
    const rows = appointments.map((apt) => [
      apt.id,
      apt.users?.full_name || "Unknown User",
      apt.title || "",
      apt.appointment_date || "",
      apt.start_time || "",
      apt.end_time || "",
      apt.status || "",
      apt.created_at || "",
    ])

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  }

  const generateUsersCsv = (users: any[], appointments: any[], meetings: any[]) => {
    const headers = ["ID", "Username", "Full Name", "Total Appointments", "Meetings Joined", "Created At"]
    const rows = users.map((user) => {
      const userAppointments = appointments.filter((apt) => apt.user_id === user.id)
      const userMeetings = meetings.filter((meeting) => meeting.participants?.some((p: any) => p.id === user.id))

      return [
        user.id,
        user.username || "",
        user.full_name || "",
        userAppointments.length,
        userMeetings.length,
        user.created_at || "",
      ]
    })

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  }

  const generateMeetingsCsv = (meetings: any[]) => {
    const headers = ["ID", "Title", "Description", "Date", "Start Time", "End Time", "Participants", "Created At"]
    const rows = meetings.map((meeting) => [
      meeting.id,
      meeting.title || "",
      meeting.description || "",
      meeting.meeting_date || "",
      meeting.start_time || "",
      meeting.end_time || "",
      meeting.participants?.map((p: any) => p.full_name).join("; ") || "",
      meeting.created_at || "",
    ])

    return [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  }

  const downloadCsv = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyToClipboard = async (data: string, type: string) => {
    try {
      await navigator.clipboard.writeText(data)
      alert(`${type} data copied to clipboard! You can now paste it into Google Sheets.`)
    } catch (err) {
      console.error("Failed to copy: ", err)
      alert("Failed to copy data to clipboard")
    }
  }

  const createGoogleSheet = () => {
    const url = "https://guileless-gumption-313518.netlify.app/"
    window.open(url, "_blank")
  }

  const disconnectSheets = () => {
    const newConfig: GoogleSheetsConfig = {
      connected: false,
      lastSync: null,
      autoSync: false,
    }
    saveConfig(newConfig)
    setCsvData(null)
    alert("Disconnected from Google Sheets sync")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5" />
          <span>Google Sheets</span>
        </CardTitle>
        <CardDescription>Export appointment data to Google Sheets for reporting and analysis</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.connected && config.lastSync && (
          <div className="text-sm text-muted-foreground">Last synced: {new Date(config.lastSync).toLocaleString()}</div>
        )}

        {!config.connected ? (
          <div className="space-y-4">
            <Button onClick={connectToGoogleSheets} disabled={loading}>
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Prepare Data for Google Sheets
            </Button>

            <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
              <p className="font-medium mb-2">How to use:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click "Prepare Data for Google Sheets" to generate CSV data</li>
                <li>Use the download buttons to get CSV files, or copy data to clipboard</li>
                <li>Create a new Google Sheet or open an existing one</li>
                <li>Paste the data or import the CSV files</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {csvData && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Appointments</h4>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCsv(csvData.appointments, "appointments.csv")}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(csvData.appointments, "Appointments")}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Users</h4>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => downloadCsv(csvData.users, "users.csv")}>
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(csvData.users, "Users")}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Meetings</h4>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => downloadCsv(csvData.meetings, "meetings.csv")}>
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(csvData.meetings, "Meetings")}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex space-x-2">
              <Button onClick={createGoogleSheet} variant="default">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Create New Google Sheet
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Data refreshes automatically when the app opens</p>
              <p>• Download CSV files or copy data to paste into Google Sheets</p>
              <p>• User stats include appointment count and meetings joined</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
