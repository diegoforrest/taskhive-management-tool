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

  if (isLoading || !isAuthenticated) {
    return (
      <SidebarProvider defaultOpen={defaultOpen}>
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
