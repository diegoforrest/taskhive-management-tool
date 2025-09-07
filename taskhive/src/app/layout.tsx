// app/layout.tsx
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import "./globals.css"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/sidebar/app-sidebar"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { TopBar } from "@/components/topbar/top-bar"
import { AuthProvider } from "@/lib/auth-context"
import { SearchProvider } from "@/lib/search-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TaskHive - Project Management Tool",
  description: "Modern project management and collaboration platform",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SearchProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <TopBar />
                  <main className="flex-1">
                    {children}
                  </main>
                </SidebarInset>
              </SidebarProvider>
            </SearchProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}