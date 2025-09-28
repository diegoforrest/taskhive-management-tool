"use client"

import * as React from "react"
import { useState } from "react"
import { Input } from "@/presentation/components/ui/input"
import { Label } from "@/presentation/components/ui/label"
import { Button } from "@/presentation/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/presentation/components/ui/card"
import { toast } from 'react-hot-toast'
import { useAuth } from '@/presentation/hooks/useAuth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // TODO: Implement password reset use case
      // const res = await userRepository.requestPasswordReset(new Email(email))
      toast.success('If that email exists we sent reset instructions.', { position: 'top-center' })
    } catch (err: any) {
      console.error('Forgot password error', err)
      const msg = (err && (err.message || err.error)) || 'Failed to request password reset'
      toast.error(String(msg), { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
          <CardDescription>Enter your account email and we'll send reset instructions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</Button>
            </div>
          </form>
          {resetLink && (
            <div className="mt-4 p-3 border rounded bg-gray-50">
              <div className="text-sm mb-2">Development reset link (copy & paste into browser):</div>
              <div className="flex gap-2">
                <input readOnly className="flex-1 p-2 border rounded" value={resetLink} />
                <Button onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(resetLink)
                    toast.success('Link copied to clipboard', { position: 'top-center' })
                  } catch {
                    // fallback: open the link in a new tab
                    window.open(resetLink, '_blank')
                  }
                }}>Copy</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
