"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { authApi } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog"
import { toast } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const { user, login, logout } = useAuth()
  const router = useRouter()
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [email, setEmail] = useState(user?.email || "")
  const [saving, setSaving] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  
  // Use react-hot-toast for transient notices
  const original = { firstName: user?.firstName || "", lastName: user?.lastName || "", email: user?.email || "" }

  // Keep form fields in sync with the auth `user` when it becomes available (e.g., after refresh)
  React.useEffect(() => {
    if (!user) return
    setFirstName(user.firstName || "")
    setLastName(user.lastName || "")
    setEmail(user.email || "")
    // we intentionally do not reset notice/other UI state here
  }, [user])

  // Validation helpers
  const isEmailValid = (e: string) => {
    // Simple regex for email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  }

  const hasProfileChanged = () => {
    return firstName.trim() !== (original.firstName || '').trim() || lastName.trim() !== (original.lastName || '').trim() || email.trim() !== (original.email || '').trim()
  }

  const handleSave = async () => {
  setSaving(true)
    try {
      // Call backend to persist profile changes
      if (user && user.user_id) {
        const res = await authApi.updateUser(user.user_id, { email, firstName, lastName })
        // If backend returns updated user, update auth context too
          if (res && typeof res === 'object' && (res as any).user) {
          const updated = (res as any).user
          // preserve existing auth token by not passing a second argument
          login({ ...(user || { user_id: 0 }), firstName: updated.firstName, lastName: updated.lastName, email: updated.email })
          toast.success('Profile saved.', { position: 'top-center' })
        } else {
          // Fallback: update local context and preserve token
          const updatedUser = { ...(user || { user_id: 0 }), firstName, lastName, email }
          login(updatedUser)
          toast.success('Successfully saved', { position: 'top-center' })
        }
      } else {
        toast.error('Not signed in', { position: 'top-center' })
      }

      // Optionally navigate back to dashboard
      // router.push('/dashboard')
    } catch (err) {
      console.error('Failed to save profile:', err)
      const msg = extractErrorMessage(err)
      // show inline notice and toast
      toast.error(msg, { position: 'top-center' })
    } finally {
      setSaving(false)
    }
  }

  // Change password flow
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [changing, setChanging] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false)

  // Debounced verification of current password
  React.useEffect(() => {
    if (!user || !user.user_id) {
      return
    }

    if (!currentPassword) {
      return
    }

    const t = setTimeout(async () => {
      try {
        await authApi.verifyPassword(user.user_id, currentPassword)
      } catch {
        /* ignore verification errors */
      }
    }, 300)

    return () => clearTimeout(t)
  }, [currentPassword, user])

  const handleChangePassword = async () => {
    setChanging(true)
    try {
      if (!user || !user.user_id) {
        toast.error('Not signed in', { position: 'top-center' })
        return
      }
      if (newPassword.length < 8) {
        toast.error('New password must be at least 8 characters', { position: 'top-center' })
        return
      }

      // New password must differ from current password
      if (currentPassword === newPassword) {
        toast.error('New password must be different from the current password', { position: 'top-center' })
        return
      }
      const res = await authApi.changePassword(user.user_id, currentPassword, newPassword)
      if (res && (res as any).success) {
        toast.success('Password changed successfully', { position: 'top-center' })
        setCurrentPassword("")
        setNewPassword("")
        // close confirmation dialog on success
        setChangePasswordDialogOpen(false)
        // Sign out the user after changing password for security and force re-login
        try {
          logout()
        } catch {
          /* ignore logout errors */
        }
        try {
          router.push('/auth/sign-in')
        } catch {
          // ignore navigation errors
        }
      } else {
        toast.error('Failed to change password', { position: 'top-center' })
      }
    } catch (err: any) {
      console.error('Password change error', err)
      toast.error(extractErrorMessage(err), { position: 'top-center' })
    } finally {
      setChanging(false)
    }
  }

  // Helper to extract a friendly error message from various error shapes
  const extractErrorMessage = (err: any) => {
    if (!err) return 'Server error'

    const normalize = (s: string) => s.trim()

    const looksLikeCurrentPasswordError = (s: string) => {
      if (!s) return false
      const low = s.toLowerCase()
      // common phrases backends might return
      return (
        (low.includes('current') && low.includes('password') && (low.includes('incorrect') || low.includes('invalid') || low.includes('does not match') || low.includes('wrong'))) ||
        low.includes('invalid current password') ||
        low.includes('current password is incorrect') ||
        low.includes('current password incorrect')
      )
    }

    if (typeof err === 'string') {
      const s = normalize(err)
      if (s.toLowerCase().includes('internal server')) return 'Current password is incorrect.'
      if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
      return s
    }

    // If backend returns { message: '...' } or { error: '...' }
    if (err?.message && typeof err.message === 'string') {
      const s = normalize(err.message)
      if (s.toLowerCase().includes('internal server')) return 'Current password is incorrect.'
      if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
      return s
    }
    if (err?.error && typeof err.error === 'string') {
      const s = normalize(err.error)
      if (s.toLowerCase().includes('internal server')) return 'Server error — please try again later.'
      if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
      return s
    }

    // Some responses place the payload on a `data` property
    if (err?.data) {
      const d = err.data
      if (typeof d === 'string') {
        const s = normalize(d)
        if (s.toLowerCase().includes('internal server')) return 'Server error — please try again later.'
        if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
        return s
      }
      if (d?.message && typeof d.message === 'string') {
        const s = normalize(d.message)
        if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
        return s
      }
      if (d?.error && typeof d.error === 'string') {
        const s = normalize(d.error)
        if (looksLikeCurrentPasswordError(s)) return 'Current password is incorrect'
        return s
      }
    }

    // Fallback to generic
    try {
      return JSON.stringify(err)
    } catch {
      return 'Server error'
    }
  }

  // savingToast auto-hide is handled by the Toast component

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-lg sm:text-2xl font-semibold">Profile</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">View and edit your account details.</p>

      <Card className="mt-4 sm:mt-6 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium">First name</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Last name</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 sm:mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>

          {/* Save confirmation dialog trigger */}
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={saving || !hasProfileChanged() || !isEmailValid(email)}>{saving ? 'Saving...' : 'Save'}</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm changes</DialogTitle>
                <DialogDescription>Are you sure you want to save your profile changes?</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setSaveDialogOpen(false); }}>Cancel</Button>
                <Button onClick={async () => { setSaveDialogOpen(false); await handleSave(); }} disabled={!hasProfileChanged() || !isEmailValid(email)}>
                  Confirm and save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Notices are handled by react-hot-toast via the TopBar Toaster */}
      </Card>

        {/* Toaster is provided globally in TopBar; profile triggers toasts with react-hot-toast */}

        {/*
          Prevent browser password autofill: include hidden dummy username/password inputs
          and set explicit autocomplete attributes on real password fields below.
        */}
        <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden>
          <input name="fake-username" autoComplete="username" tabIndex={-1} />
          <input name="fake-password" type="password" autoComplete="new-password" tabIndex={-1} />
        </div>

        <Card className="mt-4 sm:mt-6 p-3 sm:p-4">
          <h2 className="text-sm sm:text-lg font-medium">Change password</h2>
          <div className="mt-2 sm:mt-3 grid grid-cols-1 gap-2 sm:gap-3 max-w-md">
            <div>
              <label className="text-xs font-medium">Current password</label>
              <div className="relative">
                <Input
                  className="w-full pr-10 text-sm"
                  value={currentPassword}
                  type={showCurrentPassword ? 'text' : 'password'}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  // Use a non-standard name and new-password autocomplete to avoid
                  // triggering browser password manager dropdowns for saved credentials.
                  autoComplete="new-password"
                  data-lpignore="true"
                  name="_current_pwd_fake"

                  readOnly
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Remove readonly on focus so the field becomes editable, and
                    // ensure we don't show the saved-password UI by keeping the
                    // field name/autocomplete non-standard. Also ensure the input
                    // shows as password (if it was switched by password-visibility toggle).
                    e.currentTarget.readOnly = false;
                    setShowCurrentPassword(false);
                  }}
                />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground" onClick={() => setShowCurrentPassword(s => !s)} aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}>
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">New password</label>
              <div className="relative">
                <Input className="w-full pr-10 text-sm" value={newPassword} type={showNewPassword ? 'text' : 'password'} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" name="new-password" />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground" onClick={() => setShowNewPassword(s => !s)} aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { setCurrentPassword(''); setNewPassword('') }}>Reset</Button>

              {/* Change password confirmation dialog */}
              <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={changing || !currentPassword || !newPassword || newPassword.length < 8}>{changing ? 'Changing...' : 'Change password'}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm password change</DialogTitle>
                    <DialogDescription>Do you want to change your password now? You will be sign-out shortly</DialogDescription>
                  </DialogHeader>
                    <DialogFooter>
                    <Button variant="ghost">Cancel</Button>
                    <Button onClick={async () => { await handleChangePassword(); }} disabled={changing || !currentPassword || !newPassword || newPassword.length < 8}>
                      {changing ? 'Changing Password' : 'Yes, change password'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

          </div>
        </Card>
    </div>
  )
}
