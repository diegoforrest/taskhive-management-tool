// app/layout.tsx - Updated to use new architecture
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import type { Metadata } from "next"
import "./globals.css"
import SidebarShell from "../presentation/components/sidebar/sidebar-shell"
import { ThemeProvider } from "@/presentation/components/theme/theme-provider"
import { AuthProvider } from "@/presentation/providers/AuthProvider"
import { SearchProvider } from "@/lib/search-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TaskHive",
  description: "TaskHive - Modern Task Management",
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
      <body suppressHydrationWarning className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <SearchProvider>
              <SidebarShell defaultOpen={defaultOpen}>
                {children}
              </SidebarShell>
            </SearchProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}