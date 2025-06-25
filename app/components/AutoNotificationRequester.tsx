"use client"

import { useEffect } from "react"

export default function AutoNotificationRequester() {
  useEffect(() => {
    // Request notification permission automatically on component mount
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          console.log("Notification permission granted.")
          // You can send a test notification here if needed
          // new Notification("Welcome to AppointEase!", {
          //   body: "You'll receive important updates here.",
          // });
        } else {
          console.warn("Notification permission denied.")
        }
      })
    }
  }, [])

  // This component does not render any UI
  return null
}
