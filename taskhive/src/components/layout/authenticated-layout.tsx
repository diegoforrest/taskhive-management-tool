// components/layout/authenticated-layout.tsx
"use client"

import { cookies } from "next/headers"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { TopBar } from "@/components/topbar/top-bar"
import { useEffect, useState } from "react"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const [defaultOpen, setDefaultOpen] = useState(true)

  useEffect(() => {
    // Get sidebar state from localStorage in client-side
    const sidebarState = localStorage.getItem("sidebar_state")
    setDefaultOpen(sidebarState === "true")
  }, [])

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
