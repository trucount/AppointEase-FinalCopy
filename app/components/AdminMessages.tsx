"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User, MessageSquare } from "lucide-react"
import { getUsers, getMessages, createMessage, supabase } from "../../lib/supabase"
import type { User as UserType, Message } from "../../lib/supabase"

export default function AdminMessages() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [users, setUsers] = useState<UserType[]>([])

  useEffect(() => {
    loadUsers()
    loadMessages()

    // Set up real-time subscription for messages
    const subscription = supabase
      .channel("admin_messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        loadMessages()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.filter((user: UserType) => user.role === "user"))
    } catch (error) {
      console.error("Error loading users:", error)
      setUsers([])
    }
  }

  const loadMessages = async () => {
    try {
      const data = await getMessages()
      setMessages(data)

      // Group messages by user
      const grouped = data.reduce((acc: any, message: Message) => {
        const userId = message.sender_id === "admin" ? message.receiver_id : message.sender_id
        if (!acc[userId]) acc[userId] = []
        acc[userId].push(message)
        return acc
      }, {})

      setConversations(grouped)
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
      setConversations([])
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return

    try {
      await createMessage({
        sender_id: "admin",
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
      })

      setNewMessage("")
      loadMessages()
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message")
    }
  }

  const getUserMessages = (userId: string) => {
    return messages
      .filter(
        (msg: Message) =>
          (msg.sender_id === userId && msg.receiver_id === "admin") ||
          (msg.sender_id === "admin" && msg.receiver_id === userId),
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  }

  const getUnreadCount = (userId: string) => {
    return messages.filter((msg: Message) => msg.sender_id === userId && msg.receiver_id === "admin" && !msg.seen_at)
      .length
  }

  return (
    <div className="space-y-4">
      {!selectedUser ? (
        <div>
          <h3 className="text-lg font-semibold mb-4">Conversations</h3>
          {users.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No users to message</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {users.map((user: UserType) => {
                const userMessages = getUserMessages(user.id)
                const unreadCount = getUnreadCount(user.id)
                const lastMessage = userMessages[userMessages.length - 1]

                return (
                  <Card
                    key={user.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium">{user.full_name}</h4>
                            {lastMessage && (
                              <p className="text-sm text-gray-500 truncate max-w-48">
                                {lastMessage.sender_id === "admin" ? "You: " : ""}
                                {lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              ← Back
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold">{selectedUser.full_name}</h3>
            </div>
          </div>

          <Card className="h-96 flex flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {getUserMessages(selectedUser.id).map((message: Message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === "admin" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.sender_id === "admin" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${message.sender_id === "admin" ? "text-blue-100" : "text-gray-500"}`}
                      >
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
