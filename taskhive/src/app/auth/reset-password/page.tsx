'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''
  const tidParam = searchParams.get('tid') || ''
  const tid = tidParam ? Number(tidParam) : null

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [validState, setValidState] = useState<'unknown' | 'valid' | 'invalid'>('unknown')

  useEffect(() => {
    if (!token || !tid) {
      toast.error('Missing reset token')
      setValidState('invalid')
      return
    }

    // Validate token via API
    ;(async () => {
      try {
        const res = await authApi.validateReset(tid!, token)
        const body = res as any
        if (body && body.success) {
          setValidState('valid')
        } else {
          toast.error(body?.message || 'Invalid or expired token')
          setValidState('invalid')
        }
      } catch {
        toast.error('Failed to validate token')
        setValidState('invalid')
      }
    })()
  }, [token, tid])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validState !== 'valid') {
      toast.error('Token invalid or expired')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

  setIsSubmitting(true)
    try {
  const res = await authApi.resetPasswordWithTid(tid!, token, newPassword)
      toast.success((res as any)?.message || 'Password reset successful')
      // Navigate to sign-in
      router.push('/auth/sign-in')
    } catch {
      // Error details intentionally ignored here (handled via toast)
      const msg = 'Failed to reset password'
      // If token invalid/expired, show friendly UI
      // If token invalid/expired, redirect to request a new link
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (validState === 'unknown') {
    return <div className="max-w-md mx-auto mt-16">Checking token...</div>
  }

  if (validState === 'invalid') {
    return (
      <div className="max-w-md mx-auto mt-16">
        <h2 className="text-2xl font-semibold mb-4">Invalid or expired link</h2>
        <p className="mb-4">This password reset link is invalid or has expired. You can request a new link below.</p>
        <div>
          <Button onClick={() => router.push('/auth/forgot-password')}>Request new reset link</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h2 className="text-2xl font-semibold mb-4">Reset your password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">New password</label>
          <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <Input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" />
        </div>
        <div>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Resetting...' : 'Reset password'}</Button>
        </div>
      </form>
    </div>
  )
}
