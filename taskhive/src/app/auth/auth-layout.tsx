"use client"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ReactNode } from "react"

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="flex flex-col items-center justify-center mt-20 p-6 bg-background" style={{ minHeight: 'auto' }}>
        <div className="w-full max-w-md relative">
          <Link
            href="/"
            className="absolute -top-10 left-0 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </ThemeProvider>
  )
}