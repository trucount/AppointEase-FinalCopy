import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "./components/ThemeProvider" // Import ThemeProvider
import AutoNotificationRequester from "./components/AutoNotificationRequester" // Import AutoNotificationRequester

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AppointEase - Smart Appointment Booking System",
  description: "Modern mobile-first appointment booking system with admin and user dashboards",
  keywords: "appointment booking, scheduling, admin dashboard, user management, mobile app",
  authors: [{ name: "AppointEase Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  robots: "index, follow",
  themeColor: "#2563eb",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AppointEase",
  },
  openGraph: {
    title: "AppointEase - Smart Appointment Booking",
    description: "Modern mobile-first appointment booking system",
    type: "website",
    locale: "en_US",
  },
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning for next-themes */}
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AppointEase" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        {/* Removed manifest link as service worker is not used for notifications */}
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="appointease-theme">
          <AutoNotificationRequester /> {/* Render the notification requester */}
          <div id="root" className="min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
