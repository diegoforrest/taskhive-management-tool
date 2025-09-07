"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/page.tsx (Example dashboard page)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart3,
  CheckSquare,
  Clock,
  Users,
  TrendingUp,
  Plus,
} from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              +2 from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <p className="text-xs text-muted-foreground">
              +12% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142h</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>
              Your most recently updated projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Website Redesign</p>
                <div className="flex items-center space-x-2">
                  <Progress value={75} className="w-20" />
                  <span className="text-xs text-muted-foreground">75%</span>
                </div>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Mobile App</p>
                <div className="flex items-center space-x-2">
                  <Progress value={45} className="w-20" />
                  <span className="text-xs text-muted-foreground">45%</span>
                </div>
              </div>
              <Badge variant="secondary">In Progress</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Marketing Campaign</p>
                <div className="flex items-center space-x-2">
                  <Progress value={100} className="w-20" />
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
              </div>
              <Badge variant="default">Completed</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div className="space-y-1">
                <p className="text-sm">Sarah completed task "Design homepage mockup"</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div className="space-y-1">
                <p className="text-sm">New milestone reached in Website Redesign</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div className="space-y-1">
                <p className="text-sm">Mike commented on Mobile App project</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div className="space-y-1">
                <p className="text-sm">Marketing Campaign project completed</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks Overview</CardTitle>
          <CardDescription>
            Your upcoming tasks and deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Update homepage design</p>
                  <p className="text-xs text-muted-foreground">Website Redesign • Due tomorrow</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">High Priority</Badge>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Implement user authentication</p>
                  <p className="text-xs text-muted-foreground">Mobile App • Due in 3 days</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Medium Priority</Badge>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Review project requirements</p>
                  <p className="text-xs text-muted-foreground">New Project • Due next week</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">Low Priority</Badge>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}