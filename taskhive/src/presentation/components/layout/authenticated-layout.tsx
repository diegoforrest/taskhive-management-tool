"use client"

import { SidebarProvider, SidebarInset } from "@/presentation/components/ui/sidebar"
import { AppSidebar } from "@/presentation/components/sidebar/app-sidebar"
import { TopBar } from "@/presentation/components/topbar/top-bar"
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
