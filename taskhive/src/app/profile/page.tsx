"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/presentation/providers/AuthProvider"
import { Input } from "@/presentation/components/ui/input"
import { Button } from "@/presentation/components/ui/button"
import { Card } from "@/presentation/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogTrigger } from "@/presentation/components/ui/dialog"
import { toast } from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'

export default function ProfilePage() {
  const { user, logout, changePassword } = useAuthContext()
  const router = useRouter()
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [email, setEmail] = useState(user?.email?.value || "")
  const [saving, setSaving] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [original, setOriginal] = useState({ firstName: user?.firstName || "", lastName: user?.lastName || "", email: user?.email?.value || "" })
  
  // Use react-hot-toast for transient notices

  // Keep form fields in sync with the auth `user` when it becomes available (e.g., after refresh)
  React.useEffect(() => {
    if (!user) return
    setFirstName(user.firstName || "")
    setLastName(user.lastName || "")
    setEmail(user.email?.value || "")
    setOriginal({ firstName: user.firstName || "", lastName: user.lastName || "", email: user.email?.value || "" })
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
      if (user && user.id) {
        const updatedUser = await authApi.updateUser(user.id, { email, firstName, lastName })
        
        // The API returns the User entity directly (not wrapped in a response)
        if (updatedUser) {
          // Cast the response to the expected User type
          const userResponse = updatedUser as any;
          
          // Create updated user entity and update the AuthProvider
          try {
            const { User } = await import('@/core/domain/entities/User');
            const updatedUserEntity = User.fromData({
              user_id: userResponse.user_id || user.id,
              email: userResponse.email || email,
              firstName: userResponse.firstName || firstName,
              lastName: userResponse.lastName || lastName
            });
            
            // Get current token from localStorage
            const savedAuth = localStorage.getItem('authContext');
            let currentToken = null;
            if (savedAuth) {
              try {
                const authData = JSON.parse(savedAuth);
                currentToken = authData.token;
              } catch (e) {
                console.warn('Could not parse auth data:', e);
              }
            }
            
            // Update localStorage with new user data
            if (currentToken) {
              localStorage.setItem('authContext', JSON.stringify({
                user: updatedUserEntity.toData(),
                token: currentToken
              }));
              
              // Dispatch auth event to update AuthProvider immediately
              window.dispatchEvent(new CustomEvent('auth:login', {
                detail: { 
                  user: updatedUserEntity,
                  token: currentToken
                }
              }));
              
              toast.success('Profile updated successfully!', { position: 'top-center' });
              
              // Update the form state with the new values
              setFirstName(updatedUserEntity.firstName || '');
              setLastName(updatedUserEntity.lastName || '');
              setEmail(updatedUserEntity.email || '');
              
              // Update original values so hasProfileChanged works correctly
              setOriginal({
                firstName: updatedUserEntity.firstName || '',
                lastName: updatedUserEntity.lastName || '',
                email: updatedUserEntity.email || ''
              });

              
            } else {
              console.warn('No token found, reloading page');
              window.location.reload();
            }
          } catch (entityError) {
            console.warn('Could not create User entity, reloading page:', entityError);
            window.location.reload();
          }
        } else {
          toast.success('Profile updated successfully!', { position: 'top-center' });
          // Update form fields and original values even if we don't get user data back
          setFirstName(firstName);
          setLastName(lastName);
          setEmail(email);
          setOriginal({ firstName, lastName, email });
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
  const [currentPasswordFieldType, setCurrentPasswordFieldType] = useState<'text' | 'password'>('text') // Start as text to prevent autofill
  const [newPasswordFieldType, setNewPasswordFieldType] = useState<'text' | 'password'>('text') // Start as text to prevent autofill

  // Debounced verification of current password
  React.useEffect(() => {
    if (!user || !user.id) {
      return
    }

    if (!currentPassword) {
      return
    }

    const t = setTimeout(async () => {
      try {
        await authApi.verifyPassword(user.id, currentPassword)
      } catch {
        /* ignore verification errors */
      }
    }, 300)

    return () => clearTimeout(t)
  }, [currentPassword, user])

  const handleChangePassword = async () => {
    setChanging(true)
    try {
      if (!user || !user.id) {
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
      const res = await authApi.changePassword(user.id, currentPassword, newPassword)
      if (res && (res as any).success) {
        toast.success('Password changed successfully. You will be signed out.', { position: 'top-center' })
        setCurrentPassword("")
        setNewPassword("")
        // close confirmation dialog on success
        setChangePasswordDialogOpen(false)
        
        // Sign out the user after successful password change for security
        setTimeout(() => {
          logout()
          router.push('/auth/sign-in')
        }, 2000) // Give user time to see the success message
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
      </Card>
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
                  type={showCurrentPassword ? 'text' : currentPasswordFieldType}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (e.target.value.length > 0 && !showCurrentPassword && currentPasswordFieldType === 'text') {
                      setCurrentPasswordFieldType('password');
                    }
                  }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  name="not-a-password-field"
                  placeholder="Enter your current password"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    // Keep as text initially to prevent autofill dropdown
                    e.currentTarget.setAttribute('autocomplete', 'off');
                    e.currentTarget.setAttribute('data-lpignore', 'true');
                  }}
                  onKeyDown={(e) => {
                    // Switch to password type on first keypress if not showing password
                    if (!showCurrentPassword && currentPasswordFieldType === 'text') {
                      setTimeout(() => setCurrentPasswordFieldType('password'), 0);
                    }
                  }}
                />
                <button 
                  type="button" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground" 
                  onClick={() => {
                    setShowCurrentPassword(s => !s);
                    // Always use password type when toggling visibility
                    if (currentPasswordFieldType === 'text' && currentPassword.length > 0) {
                      setCurrentPasswordFieldType('password');
                    }
                  }} 
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">New password</label>
              <div className="relative">
                <Input 
                  className="w-full pr-10 text-sm" 
                  value={newPassword} 
                  type={showNewPassword ? 'text' : newPasswordFieldType}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    // Switch to password type after user starts typing (unless they want to show it)
                    if (e.target.value.length > 0 && !showNewPassword && newPasswordFieldType === 'text') {
                      setNewPasswordFieldType('password');
                    }
                  }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  name="not-a-new-password"
                  placeholder="Enter your new password"
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.setAttribute('autocomplete', 'off');
                    e.currentTarget.setAttribute('data-lpignore', 'true');
                  }}
                  onKeyDown={(e) => {
                    // Switch to password type on first keypress if not showing password
                    if (!showNewPassword && newPasswordFieldType === 'text') {
                      setTimeout(() => setNewPasswordFieldType('password'), 0);
                    }
                  }}
                />
                <button 
                  type="button" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground" 
                  onClick={() => {
                    setShowNewPassword(s => !s);
                    // Always use password type when toggling visibility
                    if (newPasswordFieldType === 'text' && newPassword.length > 0) {
                      setNewPasswordFieldType('password');
                    }
                  }} 
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => { 
                setCurrentPassword(''); 
                setNewPassword('');
                // Reset field types to text to prevent autofill on next use
                setCurrentPasswordFieldType('text');
                setNewPasswordFieldType('text');
              }}>Reset</Button>

              {/* Change password confirmation dialog */}
              <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={changing || !currentPassword || !newPassword || newPassword.length < 8}>{changing ? 'Changing...' : 'Change password'}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm password change</DialogTitle>
                    <DialogDescription>Do you want to change your password now? You'll be sign-out after confirming</DialogDescription>
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
