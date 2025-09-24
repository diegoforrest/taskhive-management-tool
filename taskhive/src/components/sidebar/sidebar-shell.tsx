"use client"

import React from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { TopBar } from "@/components/topbar/top-bar"
import { useAuth } from "@/lib/auth-context"

interface Props {
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function SidebarShell({ children, defaultOpen }: Props) {
  const { isAuthenticated, isLoading } = useAuth()

  // While auth is loading or unauthenticated, always provide SidebarProvider so
  // UI components that call sidebar hooks (TopBar's SidebarTrigger) do not throw.
  if (isLoading || !isAuthenticated) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
        {/* Do not render AppSidebar for guests; still provide SidebarInset so TopBar can use SidebarTrigger */}
        <SidebarInset>
          <TopBar />
          <main className="flex-1">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  // Authenticated users get the full sidebar layout
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
