"use client"

import * as React from "react"
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  Home,
  MoreHorizontal,
  Plus,
  Settings,
  User2,
  Users,
  BarChart3,
  CheckSquare,
  Target,
  LogOut,
  ClipboardCheck,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/lib/auth-context"
import { authApi, tasksApi } from "@/lib/api"

// Helper function to get priority emoji
const getPriorityEmoji = (priority: "High" | "Medium" | "Low") => {
  switch (priority) {
    case "High":
      return "🔥"
    case "Medium":
      return "⚡"
    case "Low":
      return "🌱"
    default:
      return "🌱"
  }
}

export function AppSidebar() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [projectTasks, setProjectTasks] = useState<{[key: number]: any[]}>({})
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    
    // Use firstName and lastName if available
    if (user.firstName && user.lastName) {
      const firstName = user.firstName.trim().charAt(0).toUpperCase() + user.firstName.trim().slice(1).toLowerCase()
      const lastName = user.lastName.trim().charAt(0).toUpperCase() + user.lastName.trim().slice(1).toLowerCase()
      return `${firstName} ${lastName}`
    }
    
    // Use firstName only if available
    if (user.firstName) {
      return user.firstName.trim().charAt(0).toUpperCase() + user.firstName.trim().slice(1).toLowerCase()
    }
    
    // Use email if no name available
    if (user.email) {
      return user.email.split('@')[0]
    }
    
    // Fallback to user_id
    return `User ${user.user_id}`
  }

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return 'G'
    
    // Use firstName and lastName if available
    if (user.firstName && user.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase()
    }
    
    // Use email if firstName/lastName not available
    if (user.email) {
      const parts = user.email.split('@')[0].split('.')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return user.email.substring(0, 2).toUpperCase()
    }
    
    // Fallback to user_id
    return user.user_id.toString().substring(0, 2).toUpperCase() || 'U'
  }

  // Load user's projects from API (same as dashboard)
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user?.user_id || !isAuthenticated) {
        setUserProjects([])
        setProjectTasks({})
        return
      }
      
      try {
        setLoading(true)
        console.log('🔍 Sidebar loading projects for user_id:', user.user_id, 'type:', typeof user.user_id)
        
        // Use the same approach as dashboard
        const [projectsResponse, allTasks] = await Promise.all([
          authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id)),
          tasksApi.getAllTasks()
        ]);
        
        console.log('📦 Sidebar Projects API Response:', projectsResponse)
        console.log('📋 Sidebar Tasks API Response:', allTasks)
        
        // Extract projects from the response (same as dashboard)
        const projectsData = projectsResponse.data || []
        console.log('📊 Sidebar processed projects data:', projectsData)
        
        // Group tasks by project_id
        const tasksData: {[key: number]: any[]} = {}
        projectsData.forEach((project: any) => {
          const projectTasksList = allTasks.filter((task: any) => task.project_id === project.id)
          tasksData[project.id] = projectTasksList
        })
        
        // Transform projects for sidebar display - simplified version
        const transformedProjects = projectsData.map((project: any) => {
          const projectTasksList = tasksData[project.id] || []
          const completedTasks = projectTasksList.filter((task: any) => task.status === "Done" || task.status === "Completed")
          
          return {
            id: project.id,
            name: project.name,
            url: `/dashboard/projects/${project.id}`,
            icon: Target,
            priority: project.priority || "Medium",
            taskCount: projectTasksList.length,
            completedCount: completedTasks.length,
            // Simplified tasks list - just show task names and status
            tasks: projectTasksList.map((task: any) => ({
              id: task.id,
              title: task.title || task.name,
              url: `/task`, // Simple redirect to task board
              status: task.status,
              priority: task.priority || "Medium",
            }))
          }
        })
        
        setUserProjects(transformedProjects)
        setProjectTasks(tasksData)
        console.log('✅ Sidebar final transformed projects:', transformedProjects)
      } catch (error) {
        console.error('Failed to load user projects:', error)
        setUserProjects([])
        setProjectTasks({})
      } finally {
        setLoading(false)
      }
    }

    loadUserProjects()
  }, [user?.user_id, isAuthenticated, refreshKey]) // Added refreshKey as dependency

  // Auto-refresh sidebar when window gains focus or becomes visible (same as dashboard)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.user_id && isAuthenticated) {
        console.log('🔄 Sidebar: Window focused, reloading projects...')
        setRefreshKey(prev => prev + 1) // Trigger refresh by updating key
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && user?.user_id && isAuthenticated) {
        console.log('🔄 Sidebar: Page became visible, reloading projects...')
        setRefreshKey(prev => prev + 1) // Trigger refresh by updating key
      }
    }

    // Listen for custom events from other components
    const handleProjectCreated = () => {
      if (user?.user_id && isAuthenticated) {
        console.log('🔄 Sidebar: Project created event received, reloading...')
        setTimeout(() => {
          setRefreshKey(prev => prev + 1) // Trigger refresh after small delay
        }, 300) // Small delay to ensure backend has saved the project
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('projectCreated', handleProjectCreated)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('projectCreated', handleProjectCreated)
    }
  }, [user?.user_id, isAuthenticated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Dynamic navigation items based on authentication status
  const navigationItems = [
    {
      title: "Home",
      url: isAuthenticated ? "/dashboard" : "/",
      icon: Home,
    },
    {
      title: "Projects Dashboard",
      url: "/dashboard",
      icon: FolderOpen,
      badge: userProjects.length.toString(),
    },
    {
      title: "Tasks Board",
      url: "/task",
      icon: CheckSquare,
    },
    {
      title: "Review Dashboard",
      url: "/dashboard/review",
      icon: ClipboardCheck,
    },
    {
      title: "Team",
      url: "/team",
      icon: Users,
    },
    {
      title: "Calendar",
      url: "/calendar",
      icon: Calendar,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: BarChart3,
    },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          {/* Make entire content clickable */}
          <Link href={isAuthenticated ? "/task" : "/"} className="flex items-center w-full">
            {/* Logo */}
            <img
              src="/logo.png"
              alt="My Logo"
              className="h-8 w-8 rounded"
            />
            <div className="grid flex-1 text-left text-sm leading-tight ml-2">
              <span className="truncate font-bold text-xl">taskHive</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Projects Section - Only show for authenticated users */}
        {isAuthenticated && (
          <Collapsible defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger>
                  Projects ({userProjects.length})
                  <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {loading ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>
                          <span>Loading...</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : userProjects.length === 0 ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link href="/dashboard/projects/new" className="text-muted-foreground">
                            <Plus />
                            <span>Create your first project</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      userProjects.map((project) => (
                        <Collapsible key={project.id} asChild>
                          <SidebarMenuItem>
                            <div className="flex items-center w-full">
                              {/* Project Name - Clickable link */}
                              <SidebarMenuButton asChild tooltip={project.name} className="flex-1">
                                <Link href={project.url} className="flex items-center">
                                  <Target className="mr-2 h-4 w-4" />
                                  <span className="truncate">{project.name}</span>
                                </Link>
                              </SidebarMenuButton>
                              
                              {/* Task count badge */}
                              {project.taskCount > 0 && (
                                <SidebarMenuBadge>
                                  {project.taskCount}
                                </SidebarMenuBadge>
                              )}
                              
                              {/* Dropdown Toggle - Only show if has tasks */}
                              {project.tasks?.length > 0 ? (
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                    <ChevronRight />
                                    <span className="sr-only">Toggle {project.name} tasks</span>
                                  </SidebarMenuAction>
                                </CollapsibleTrigger>
                              ) : null}
                            </div>
                            
                            {/* Tasks under each project - Simple list */}
                            {project.tasks?.length > 0 ? (
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {project.tasks.map((task: any) => (
                                    <SidebarMenuSubItem key={task.id}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={task.url} className="flex items-center justify-between">
                                          <span className="flex-1 truncate text-sm">{task.title}</span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {task.status === "Done" || task.status === "Completed" ? "✓" : 
                                             task.status === "In Progress" ? "⏳" : "○"}
                                          </span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            ) : null}
                          </SidebarMenuItem>
                        </Collapsible>
                      ))
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
        
       
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <img
                    src="/bee.png"      
                    alt="User Avatar"
                    className="w-8 h-8 rounded-lg transition-all data-[sidebar-collapsed]:mx-auto data-[sidebar-collapsed]:block"
                  />

                  <div className="grid flex-1 text-left text-sm leading-tight data-[sidebar-collapsed]:hidden">
                    <span className="truncate font-semibold">
                      {isAuthenticated ? getUserDisplayName() : 'Guest'}
                    </span>
                    <span className="truncate text-xs">
                      {isAuthenticated ? (user?.email || 'No email') : 'Not signed in'}
                    </span>
                  </div>

                  {/* Chevron (hidden when collapsed) */}
                  <ChevronUp className="ml-auto size-4 data-[sidebar-collapsed]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="start"
                sideOffset={4}
              >
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User2 className="mr-2 size-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings className="mr-2 size-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 size-4" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/auth/sign-in">
                      <User2 className="mr-2 size-4" />
                      Sign in
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}