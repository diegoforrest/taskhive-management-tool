"use client"

import * as React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from 'react-hot-toast'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await authApi.requestPasswordReset(email)
      if ((res as any)?.success || (res as any)?.message) {
        toast.success('If that email exists we sent reset instructions.', { position: 'top-center' })
      } else {
        toast.success('If that email exists we sent reset instructions.', { position: 'top-center' })
      }
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
        </CardContent>
      </Card>
    </div>
  )
}
