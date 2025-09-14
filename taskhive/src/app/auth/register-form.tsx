"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from 'next/image'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { authApi } from "@/lib/api"
import { TermsOfService } from "@/components/auth/terms-of-service"
import { PrivacyPolicy } from "@/components/auth/privacy-policy"

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [hasViewedTerms, setHasViewedTerms] = useState(false)
  const [hasViewedPrivacy, setHasViewedPrivacy] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToPrivacy: false,
    agreeToTerms: false,
    subscribeToUpdates: false,
  })

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.")
      setIsLoading(false)
      return
    }

    if (!formData.agreeToPrivacy || !formData.agreeToTerms) {
      setError("You must agree to both the Privacy Policy and Terms of Service.")
      setIsLoading(false)
      return
    }

    if (!hasViewedTerms || !hasViewedPrivacy) {
      setError("You must read both the Terms of Service and Privacy Policy before agreeing.")
      setIsLoading(false)
      return
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all required fields.")
      setIsLoading(false)
      return
    }

    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Email:', formData.email);
      
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      })
      
      console.log('Registration response:', response);
      
      if (response.success) {
        console.log('Registration successful, returned user_id:', response.user_id);
        
        // Registration successful - redirect to sign-in with success message
        const message = encodeURIComponent('Registration successful! Please sign in with your credentials.');
        router.push(`/auth/sign-in?message=${message}&email=${encodeURIComponent(formData.email)}`);
      } else {
        setError(response.message || 'Registration failed.')
      }
    } catch (error: unknown) {
      console.error('Registration error:', error)
      let message = 'Registration failed. Please try again.'
      if (typeof error === 'object' && error !== null) {
        const errObj = error as Record<string, unknown>
        if (typeof errObj.message === 'string') message = errObj.message
      }
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    // Prevent checking each agreement checkbox if its document hasn't been viewed
    if (
      (field === "agreeToPrivacy" && value === true && !hasViewedPrivacy) ||
      (field === "agreeToTerms" && value === true && !hasViewedTerms)
    ) {
      setError("Please read the document first before agreeing.")
      return
    }

    // Clear error when user starts typing or makes changes
    if (error) setError("")

    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="TaskHive Logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <span className="font-bold -ml-3 text-xl">taskHive</span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Create your account</CardTitle>
        <CardDescription className="text-center">
          Get started with TaskHive today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-9 pr-9"
                required
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                className="pl-9 pr-9"
                required
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Privacy checkbox */}
            <div className="flex items-center space-x-2">
              { !formData.agreeToPrivacy ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Checkbox
                        id="agreeToPrivacy"
                        checked={formData.agreeToPrivacy}
                        onCheckedChange={(checked) => handleInputChange("agreeToPrivacy", checked as boolean)}
                        disabled={!hasViewedPrivacy}
                        required
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Please read the Privacy Policy</TooltipContent>
                </Tooltip>
              ) : (
                <Checkbox
                  id="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onCheckedChange={(checked) => handleInputChange("agreeToPrivacy", checked as boolean)}
                  disabled={!hasViewedPrivacy}
                  required
                />
              )}

              <Label htmlFor="agreeToPrivacy" className="text-sm flex items-center">
                <span className="text-muted-foreground font-medium">Agree to</span>
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Privacy Policy
                </button>
              </Label>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-center space-x-2">
              { !formData.agreeToTerms ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                        disabled={!hasViewedTerms}
                        required
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Please read the Terms of Service</TooltipContent>
                </Tooltip>
              ) : (
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked as boolean)}
                  disabled={!hasViewedTerms}
                  required
                />
              )}

              <Label htmlFor="agreeToTerms" className="text-sm flex items-center">
                <span className="text-muted-foreground font-medium">Agree to</span>
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Terms and Conditions
                </button>
              </Label>
            </div>

            {(!hasViewedTerms || !hasViewedPrivacy) && (
              <p className="text-xs text-muted-foreground ml-6 block sm:hidden">
                Please read both documents above before agreeing to the terms
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
    Already have an account?{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </CardContent>

      {/* Terms of Service Modal */}
      <TermsOfService
        open={showTerms}
        onOpenChange={setShowTerms}
        onAccept={() => {
          setHasViewedTerms(true)
          // mark the terms checkbox as checked immediately
          setFormData(prev => ({ ...prev, agreeToTerms: true }))
        }}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicy
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        onAccept={() => {
          setHasViewedPrivacy(true)
          // mark the privacy checkbox as checked immediately
          setFormData(prev => ({ ...prev, agreeToPrivacy: true }))
        }}
      />
    </Card>
  )
}