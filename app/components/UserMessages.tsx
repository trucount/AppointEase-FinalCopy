"use client"

import { useState, useEffect } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, MessageSquare } from "lucide-react"
import { getMessages, createMessage, markMessagesAsSeen, supabase } from "../../lib/supabase"
import type { User, Message } from "../../lib/supabase"

interface UserMessagesProps {
  user: User
}

export default function UserMessages({ user }: UserMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")

  useEffect(() => {
    loadMessages()

    // Set up real-time subscription for messages
    const subscription = supabase
      .channel("user_messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user])

  const loadMessages = async () => {
    try {
      const data = await getMessages(user.id)
      setMessages(data)

      // Mark admin messages as seen
      const adminMessages = data.filter(
        (msg: Message) => msg.sender_id === "admin" && msg.receiver_id === user.id && !msg.seen_at,
      )

      if (adminMessages.length > 0) {
        await markMessagesAsSeen(adminMessages.map((msg) => msg.id))
      }
    } catch (error) {
      console.error("Error loading messages:", error)
      setMessages([])
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      await createMessage({
        sender_id: user.id,
        receiver_id: "admin",
        content: newMessage.trim(),
      })

      setNewMessage("")
      loadMessages()
    } catch (error) {
      console.error("Error sending message:", error)
      alert("Failed to send message")
    }
  }

  return (
    <div className="space-y-4">
      <Card className="h-96 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Chat with Admin</span>
          </CardTitle>
          <CardDescription>Send messages to the administrator</CardDescription>
        </CardHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.sender_id === user.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.sender_id === user.id ? "text-blue-100" : "text-gray-500"}`}>
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
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
  )
}
