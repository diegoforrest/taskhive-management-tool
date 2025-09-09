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
import { tasksApi } from "@/lib/api"

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
  const [loading, setLoading] = useState(false)

  // Load user's projects from API
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user?.user_id || !isAuthenticated) {
        setUserProjects([])
        return
      }
      
      try {
        setLoading(true)
        const [projectsData, tasksData] = await Promise.all([
          tasksApi.getAllProjects(),
          tasksApi.getAllTasks()
        ])
        
        // Filter projects for current user and add task counts
        const userProjectsData = projectsData
          .filter((project: any) => {
            // Convert user_id to number for comparison since API returns numbers
            const userIdNum = parseInt(user.user_id);
            return project.user_id === userIdNum;
          })
          .map((project: any) => {
            const projectTasks = tasksData.filter((task: any) => task.project_id === project.id)
            const completedTasks = projectTasks.filter((task: any) => task.status === "Done")
            
            // Determine priority based on tasks
            let priority: "High" | "Medium" | "Low" = "Low"
            if (projectTasks.some((t: any) => t.priority === "High")) priority = "High"
            else if (projectTasks.some((t: any) => t.priority === "Medium")) priority = "Medium"
            
            return {
              id: project.id,
              name: project.name || project.title || `Project ${project.id}`,
              url: `/dashboard/projects/${project.id}`,
              icon: Target,
              priority,
              taskCount: projectTasks.length,
              completedCount: completedTasks.length,
              items: [
                {
                  title: "Overview",
                  url: `/dashboard/projects/${project.id}`,
                  priority: "High" as const,
                },
                {
                  title: "Tasks",
                  url: `/dashboard/projects/${project.id}/tasks`,
                  priority: "Medium" as const,
                },
                {
                  title: "Settings", 
                  url: `/dashboard/projects/${project.id}/settings`,
                  priority: "Low" as const,
                },
              ],
            }
          })
        
        setUserProjects(userProjectsData)
      } catch (error) {
        console.error('Failed to load user projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserProjects()
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
              <SidebarGroupAction asChild>
                <Link href="/dashboard/projects/new">
                  <Plus />
                  <span className="sr-only">Create Project</span>
                </Link>
              </SidebarGroupAction>
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
                                  <span className="mr-2 text-base">
                                    {getPriorityEmoji(project.priority)}
                                  </span>
                                  <span>{project.name}</span>
                                </Link>
                              </SidebarMenuButton>
                              
                              {/* Task count badge */}
                              {project.taskCount > 0 && (
                                <SidebarMenuBadge>
                                  {project.completedCount}/{project.taskCount}
                                </SidebarMenuBadge>
                              )}
                              
                              {/* Dropdown Toggle - Separate clickable area */}
                              {project.items?.length ? (
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                    <ChevronRight />
                                    <span className="sr-only">Toggle {project.name} tasks</span>
                                  </SidebarMenuAction>
                                </CollapsibleTrigger>
                              ) : null}
                            </div>
                            
                            {/* Collapsible Content */}
                            {project.items?.length ? (
                              <CollapsibleContent>
                                <SidebarMenuSub>
                                  {project.items?.map((subItem: any) => (
                                    <SidebarMenuSubItem key={subItem.title}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={subItem.url} className="flex items-center">
                                          <span className="mr-2 text-xs">
                                            {getPriorityEmoji(subItem.priority)}
                                          </span>
                                          <span>{subItem.title}</span>
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
                      {isAuthenticated ? user?.user_id || 'User' : 'Guest'}
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