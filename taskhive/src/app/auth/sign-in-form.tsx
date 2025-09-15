"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from 'next/image';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function SignInForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  
  const { login } = useAuth()
  const router = useRouter()
  
  // Check for success message from registration and load saved credentials
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const message = urlParams.get('message')
    const emailParam = urlParams.get('email')
    
    if (message) {
      setSuccessMessage(decodeURIComponent(message))
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname)
    }

    // Load saved credentials if "Remember Me" was used
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedPassword = localStorage.getItem('rememberedPassword')
    const wasRemembered = localStorage.getItem('rememberMe') === 'true'

    if (wasRemembered && savedEmail && savedPassword) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        password: savedPassword,
        rememberMe: true
      }))
  } else if (emailParam) {
      // Pre-fill email from registration redirect
      setFormData(prev => ({
        ...prev,
        email: decodeURIComponent(emailParam)
      }))
    }
  }, [])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      setIsLoading(false)
      return
    }

    try {
      // Attempt login via API
      const response = await authApi.login({
        user_id: formData.email, // Using email as user_id for login
        password: formData.password
      })

      // If login succeeded, persist credentials (optional) and set user in context
      if (response && (response as any).success && (response as any).user) {
        const respUser = (response as any).user;
        // Handle Remember Me functionality
        if (formData.rememberMe) {
          // Save credentials to localStorage
          localStorage.setItem('rememberedEmail', formData.email)
          localStorage.setItem('rememberedPassword', formData.password)
          localStorage.setItem('rememberMe', 'true')
        } else {
          // Clear saved credentials if not remembering
          localStorage.removeItem('rememberedEmail')
          localStorage.removeItem('rememberedPassword')
          localStorage.removeItem('rememberMe')
        }

        // Store user in context with all data from backend response
        const userData = {
          user_id: respUser.user_id, // This should be the numeric ID from backend
          email: respUser.email || formData.email,
          firstName: respUser.firstName,
          lastName: respUser.lastName
        };
        
  // store user in context
  login(userData, (response as any).token)
        
        // Redirect to dashboard after successful login
        router.push('/dashboard')
      } else {
        setError((response && (response as any).message) || 'Invalid credentials')
      }
    } catch (error: unknown) {
      console.error('Login error:', error)
      let message = 'Login failed. Please try again.'
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
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <p className="text-sm text-green-700">{successMessage}</p>
          )}
          {error && (
            <p className="text-sm text-destructive/90">{error}</p>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
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
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className="pl-9 pr-9"
                required
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

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="rememberMe"
                checked={formData.rememberMe}
                onCheckedChange={(checked) => 
                  handleInputChange("rememberMe", checked as boolean)
                }
              />
              <Label htmlFor="rememberMe" className="text-sm">
                Remember me
              </Label>
            </div>
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
         
        </form>

        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}