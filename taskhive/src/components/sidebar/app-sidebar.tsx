"use client"

import * as React from "react"
import {
  // Calendar (unused)
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  Flame,
  Zap,
  Leaf,
  // Home (unused)
  // MoreHorizontal (unused)
  Plus,
  Settings,
  User2,
  // Users (unused)
  BarChart3,
  CheckSquare,
  Target,
  LogOut,
  ClipboardCheck,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
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
import { Badge } from "@/components/ui/badge"

import { useAuth } from "@/lib/auth-context"
import { authApi, Task, Project } from "@/lib/api"

// Sidebar project shape (Project plus UI fields)
type SidebarProject = Project & {
  tasks: Task[];
  project_status?: string;
  state?: string;
  status_name?: string;
  priority?: Task['priority'];
  url: string;
  taskCount?: number;
  completedCount?: number;
};

// Helper function to get priority icon component (accepts 'Critical' too)
const getPriorityIcon = (priority?: Task['priority']) => {
  switch (priority) {
    case "High":
  return <Flame className="h-4 w-4 text-red-600" />
    case "Medium":
  return <Zap className="h-4 w-4 text-yellow-400" />
    case "Low":
  return <Leaf className="h-4 w-4 text-gray-500" />
    case "Critical":
  return <Flame className="h-4 w-4 text-red-700" />
    default:
  return <Leaf className="h-4 w-4 text-gray-500" />
  }
}

// Type guard to detect ApiResponse-like objects with a data property
function hasDataProp<T>(v: unknown): v is { data: T } {
  return typeof v === 'object' && v !== null && 'data' in v;
}

export function AppSidebar() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [userProjects, setUserProjects] = useState<SidebarProject[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  // Track which project collapsibles are open (controlled)
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({})
  // Track inner project-level collapsibles (project -> tasks)
  // (not used currently)
  // Track whether the Projects group (parent) is open
  const [projectsGroupOpen, setProjectsGroupOpen] = useState(false)
  // Track whether the Review group (parent) is open
  const [reviewGroupOpen, setReviewGroupOpen] = useState(false)
  // Track whether the Completed group (parent) is open
  const [completedGroupOpen, setCompletedGroupOpen] = useState(false)

  // Auto-open Review group when on the review page
  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/dashboard/review')) {
      setReviewGroupOpen(true)
    }
    // Auto-open Completed group when on the completed page
    if (pathname.startsWith('/dashboard/completed')) {
      setCompletedGroupOpen(true)
    }
  }, [pathname])

  // Debug: log userProjects and their tasks (only once, after state declarations)
  useEffect(() => {
    if (userProjects.length > 0) {
      console.log('[Sidebar] userProjects:', userProjects);
      userProjects.forEach((proj) => {
        console.log(`[Sidebar] Project ${proj.name} tasks:`, proj.tasks);
      });
    }
  }, [userProjects]);

  // Automatically open the Projects group and the matching project when on a project route.
  // Otherwise, keep Projects closed (so dashboard shows all closed)
  useEffect(() => {
    if (!pathname) return

    // If we're on a specific project page, open Projects and that project
    const match = userProjects.find((p) => pathname.startsWith(`/dashboard/projects/${p.id}`))
    if (match) {
      setProjectsGroupOpen(true)
      setOpenProjects((prev) => ({ ...prev, [match.id]: true }))
      return
    }

    // If we're on the dashboard index, keep the Projects group open but don't auto-open any project
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      setProjectsGroupOpen(true)
      setOpenProjects({})
      return
    }

    // Otherwise (not dashboard nor project page) collapse Projects
    setProjectsGroupOpen(false)
    setOpenProjects({})
  }, [pathname, userProjects])

  // ...existing code...


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

  // Avatar initials are derived inline where needed; helper removed to
  // reduce unused-symbol lint noise.

  // Small usage to avoid unused function warning in some build configs
  // (renders as aria-label fallback in case avatar image fails)
  // Load user's projects from API (same as dashboard)
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user?.user_id || !isAuthenticated) {
        setUserProjects([])
        return
      }

      try {
        setLoading(true)

        // Get projects for the user
        const projectsResponse = await authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id));

  // Extract projects (response may be ApiResponse<Project[]> or raw array)
  const projectsData: Project[] = hasDataProp<Project[]>(projectsResponse) ? projectsResponse.data : (Array.isArray(projectsResponse) ? projectsResponse : []);

        // Fetch tasks per project in parallel using the backend endpoint
  const tasksData: Record<number, Task[]> = {}
        if (projectsData.length > 0) {
          const taskPromises = projectsData.map(async (project: Project) => {
            try {
              const resp = await authApi.getTasks(project.id)
              const tasks: Task[] = hasDataProp<Task[]>(resp) ? resp.data : (Array.isArray(resp) ? resp : [])
              return { projectId: project.id, tasks }
            } catch (err) {
              console.error(`Failed to load tasks for project ${project.id}:`, err)
              return { projectId: project.id, tasks: [] as Task[] }
            }
          })

          const taskResults = await Promise.all(taskPromises)
          taskResults.forEach(({ projectId, tasks }) => {
            tasksData[projectId] = tasks
          })
        }

        // Transform projects for sidebar display - simplified version
        const transformedProjects = projectsData.map((project: Project) => {
          const projectTasksList = tasksData[project.id] || []
          const completedTasks = projectTasksList.filter((task: Task) => task.status === "Done")
          // Read optional fields safely via index access on Project (may include backend variants)
          const raw = project as unknown as Record<string, unknown>
          const status = typeof raw['status'] === 'string' ? (raw['status'] as string) : (typeof raw['project_status'] === 'string' ? (raw['project_status'] as string) : (typeof raw['state'] === 'string' ? (raw['state'] as string) : (typeof raw['status_name'] === 'string' ? (raw['status_name'] as string) : null)))
          const priorityRaw = typeof raw['priority'] === 'string' ? (raw['priority'] as string) : undefined
          const priority = (priorityRaw as Task['priority']) ?? 'Medium'

          return {
            ...project,
            status,
            url: `/dashboard/projects/${project.id}`,
            icon: Target,
            priority,
            taskCount: projectTasksList.length,
            completedCount: completedTasks.length,
            tasks: projectTasksList.map((task: Task) => ({
              ...task,
              title: task.name || task.title || 'Untitled Task',
              url: `/dashboard/projects/${project.id}#task-${task.id}`,
            }))
          } as SidebarProject
        })

  setUserProjects(transformedProjects)
      } catch (error) {
        console.error('Failed to load user projects:', error)
        setUserProjects([])
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

    // Listen for custom events from other components (supports multiple event names)
    const handleProjectCreated = () => {
      if (user?.user_id && isAuthenticated) {
        console.log('🔄 Sidebar: Project created event received, reloading...')
        // small delay to allow backend write-through
        setTimeout(() => setRefreshKey(prev => prev + 1), 300)
      }
    }

    const handleGenericUpdate = (e?: Event) => {
      if (user?.user_id && isAuthenticated) {
        console.log('🔄 Sidebar: received update event', e && (e as CustomEvent).type)
        setRefreshKey(prev => prev + 1)
      }
    }

    const events = [
      'focus',
      'visibilitychange',
      'projectCreated',
      'projectsUpdated',
      'projectUpdated',
      'projectDeleted',
      'taskCreated',
      'taskUpdated',
      'taskDeleted',
      'tasksUpdated',
      'appRefresh',
    ]

    // attach listeners
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('projectCreated', handleProjectCreated)
    // generic handlers
    events.forEach((ev) => {
      // skip 'focus' and 'visibilitychange' since already attached above
      if (ev === 'focus' || ev === 'visibilitychange') return
      window.addEventListener(ev, handleGenericUpdate)
    })

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('projectCreated', handleProjectCreated)
      events.forEach((ev) => {
        if (ev === 'focus' || ev === 'visibilitychange') return
        window.removeEventListener(ev, handleGenericUpdate)
      })
    }
  }, [user?.user_id, isAuthenticated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Dynamic navigation items based on authentication status
  const navigationItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: FolderOpen,
      badge: userProjects.length.toString(),
    },
    {
      title: "Projects",
      url: "/dashboard?tab=all",
      icon: FolderOpen,
      badge: userProjects.length > 0 ? userProjects.length.toString() : undefined,
    },
    {
      title: "Review Dashboard",
      url: "/dashboard?tab=review",
      icon: ClipboardCheck,
    },
    {
      title: "Completed",
      url: "/dashboard?tab=completed",
      icon: CheckSquare,
    },
  
  ]

  // Projects that are in Review status (case-insensitive)
  const reviewProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    // Treat several variants as review state coming from the DB
    return s === 'review' || s === 'in review' || s === 'to review' || s === 'to-review' || s === 'toreview'
  })

  // Projects that are Completed (case-insensitive)
  const completedProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return s === 'completed' || s === 'done'
  })

  // Projects that are not in review (to show under Projects)
  const otherProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return !(s === 'review' || s === 'in review' || s === 'to review' || s === 'to-review' || s === 'toreview')
  })

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
          <Link href={isAuthenticated ? "/task" : "/"} className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
            {/* Logo */}
            <Image
              src="/logo.png"
              alt="My Logo"
              width={40}
              height={40}
              className="rounded"
            />
            <div className="grid flex-1 text-left text-sm leading-tight">
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
                  <Link href={item.url} className="flex items-center w-full">
                    <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="ml-2 group-data-[state=collapsed]:hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.badge && (
                  <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
            {/* Test dropdown: Project-test (acts like Projects group) */}
            <SidebarMenuItem>
              <Collapsible open={!!projectsGroupOpen} onOpenChange={setProjectsGroupOpen} className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="#" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto"><FolderOpen className="h-5 w-5" /></span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Project-test</span>
                    </Link>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="ml-2 data-[state=open]:rotate-90 transform transition-transform duration-200">
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                <CollapsibleContent className="group-data-[state=collapsed]:absolute group-data-[state=collapsed]:left-14 group-data-[state=collapsed]:top-2 group-data-[state=collapsed]:z-50 group-data-[state=collapsed]:w-64">
                  <SidebarMenu>
                    {otherProjects.map((project) => (
                      <Collapsible key={`test-folder-${project.id}`} open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))} className="w-full">
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                              <SidebarMenuButton asChild>
                              <Link href={project.url || `/dashboard/projects/${project.id}`} className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                                <span className="flex-shrink-0"><div className="w-6 h-6 rounded-full flex items-center justify-center">{getPriorityIcon(project.priority)}</div></span>
                                <span className="ml-2 truncate text-sm font-medium">{project.name}</span>
                              </Link>
                            </SidebarMenuButton>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="ml-2 transform transition-transform duration-200">
                                <ChevronRight />
                              </SidebarMenuAction>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            { (project.tasks || []).length > 0 ? (
                              <SidebarMenuSub>
                                {(project.tasks || []).map((task: Task) => (
                                  <SidebarMenuSubItem key={`test-task-${task.id}`}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                        <span className={
                                          `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                          (task.status === "Done" || task.status === "Completed"
                                            ? "bg-green-500"
                                            : task.status === "In Progress"
                                            ? "bg-blue-500"
                                            : "bg-gray-400")
                                        } />
                                        <span className="truncate flex-1 text-sm">{task.title}</span>
                                        <Badge className={task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                                          {task.priority}
                                        </Badge>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            ) : (
                              <div className="px-4 py-2 text-xs text-muted-foreground">No tasks</div>
                            )}
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Test dropdown: Review-test */}
            <SidebarMenuItem>
              <Collapsible open={!!reviewGroupOpen} onOpenChange={setReviewGroupOpen} className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="#" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto"><BarChart3 className="h-5 w-5" /></span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Review-test</span>
                    </Link>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="ml-2"><ChevronRight /></SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                <CollapsibleContent className="group-data-[state=collapsed]:absolute group-data-[state=collapsed]:left-14 group-data-[state=collapsed]:top-2 group-data-[state=collapsed]:z-50 group-data-[state=collapsed]:w-64">
                  <SidebarMenu>
                    {reviewProjects.map((project) => (
                      <Collapsible key={`review-test-${project.id}`} open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))} className="w-full">
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                              <SidebarMenuButton asChild>
                              <Link href={`/dashboard/review?projectId=${project.id}`} className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                                <span className="flex-shrink-0"><div className="w-6 h-6 rounded-full flex items-center justify-center">{getPriorityIcon(project.priority)}</div></span>
                                <span className="ml-2 truncate text-sm font-medium">{project.name}</span>
                              </Link>
                            </SidebarMenuButton>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="ml-2 transform transition-transform duration-200"><ChevronRight /></SidebarMenuAction>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            { (project.tasks || []).length > 0 ? (
                              <SidebarMenuSub>
                                {(project.tasks || []).map((task: Task) => (
                                  <SidebarMenuSubItem key={`review-test-task-${task.id}`}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={task.url || `/dashboard/review?projectId=${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                        <span className={
                                          `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                          (task.status === "Done" || task.status === "Completed"
                                            ? "bg-green-500"
                                            : task.status === "In Progress"
                                            ? "bg-blue-500"
                                            : "bg-gray-400")
                                        } />
                                        <span className="truncate flex-1 text-sm">{task.title}</span>
                                        <Badge className={task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                                          {task.priority}
                                        </Badge>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            ) : (
                              <div className="px-4 py-2 text-xs text-muted-foreground">No tasks</div>
                            )}
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Test dropdown: Completed-test */}
            <SidebarMenuItem>
              <Collapsible open={!!completedGroupOpen} onOpenChange={setCompletedGroupOpen} className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="#" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto"><CheckSquare className="h-5 w-5" /></span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Completed-test</span>
                    </Link>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="ml-2"><ChevronRight /></SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                <CollapsibleContent className="group-data-[state=collapsed]:absolute group-data-[state=collapsed]:left-14 group-data-[state=collapsed]:top-2 group-data-[state=collapsed]:z-50 group-data-[state=collapsed]:w-64">
                  <SidebarMenu>
                    {completedProjects.map((project) => (
                      <Collapsible key={`completed-test-${project.id}`} open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))} className="w-full">
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                            <SidebarMenuButton asChild>
                            <Link href={`/dashboard/projects/${project.id}`} className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                                <span className="flex-shrink-0"><div className="w-6 h-6 rounded-full flex items-center justify-center">{getPriorityIcon(project.priority)}</div></span>
                                <span className="ml-2 truncate text-sm font-medium">{project.name}</span>
                              </Link>
                            </SidebarMenuButton>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="ml-2"><ChevronRight /></SidebarMenuAction>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent>
                            { (project.tasks || []).length > 0 ? (
                              <SidebarMenuSub>
                                {(project.tasks || []).filter((t: Task) => (t.status === 'Done' || t.status === 'Completed')).map((task: Task) => (
                                  <SidebarMenuSubItem key={`completed-test-task-${task.id}`}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                        <span className={
                                          `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                          (task.status === "Done" || task.status === "Completed"
                                            ? "bg-green-500"
                                            : task.status === "In Progress"
                                            ? "bg-blue-500"
                                            : "bg-gray-400")
                                        } />
                                        <span className="truncate flex-1 text-sm">{task.title}</span>
                                        <Badge className={task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                                          {task.priority}
                                        </Badge>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            ) : (
                              <div className="px-4 py-2 text-xs text-muted-foreground">No tasks</div>
                            )}
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Projects Navigation Group - Show all projects as dropdowns with tasks */}
        {isAuthenticated && (
          <Collapsible open={projectsGroupOpen} onOpenChange={setProjectsGroupOpen} className="w-full">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer select-none pr-2 group">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                    <span className="font-semibold">Projects</span>
                  </div>
                  <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out -rotate-90 group-data-[state=open]:rotate-0" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
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
                    otherProjects.map((project) => (
                      <Collapsible
                        key={project.id}
                        className="w-full"
                        open={!!openProjects[project.id]}
                        onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}
                      >
                        <SidebarMenuItem>
                          <div className="flex items-center w-full">
                            <SidebarMenuButton asChild tooltip={project.name} className="flex-1">
                              <Link href={project.url} className="flex items-center w-full">
                                <div className="flex items-center gap-2 truncate">
                                  {/* Neutral circular project icon (no colored background) */}
                                  <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                                    {getPriorityIcon(project.priority)}
                                  </div>
                                  {/* Project title */}
                                  <span className="truncate text-sm font-medium">{project.name}</span>
                                </div>

                                {/* project-level priority removed here; tasks keep priority */}
                              </Link>
                            </SidebarMenuButton>

                            {/* Dropdown Toggle - Always show for projects, even if no tasks */}
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-2">
                                <ChevronRight />
                                <span className="sr-only">Toggle {project.name} tasks</span>
                              </SidebarMenuAction>
                            </CollapsibleTrigger>
                          </div>

                          {/* Tasks under each project */}
                          <CollapsibleContent>
                            { (project.tasks || []).length > 0 ? (
                              <SidebarMenuSub>
                                {(project.tasks || []).map((task: Task) => (
                                  <SidebarMenuSubItem key={task.id}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                        {/* Status small color dot */}
                                        <span
                                          title={task.status}
                                          className={
                                            `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                            (task.status === "Done" || task.status === "Completed"
                                              ? "bg-green-500"
                                              : task.status === "In Progress"
                                              ? "bg-blue-500"
                                              : "bg-gray-400")
                                          }
                                        />

                                        {/* Task title */}
                                        <span className="truncate flex-1 text-sm">{task.title}</span>

                                        {/* Priority pill (shadcn Badge) */}
                                        <Badge className={
                                          task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                        }>
                                          {task.priority === 'High' && '🔥 '}
                                          {task.priority === 'Medium' && '⚡ '}
                                          {task.priority === 'Low' && '🌱 '}
                                          {task.priority}
                                        </Badge>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            ) : (
                              <div className="px-4 py-2 text-xs text-muted-foreground">No tasks</div>
                            )}
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ))
                  )}
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Review Navigation Group - like Projects but always visible (shows message when empty) */}
        {isAuthenticated && (
          <Collapsible open={reviewGroupOpen} onOpenChange={setReviewGroupOpen} className="w-full">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer select-none pr-2 group">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
                    <span className="font-semibold">Reviews</span>
                  </div>
                  <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out -rotate-90 group-data-[state=open]:rotate-0" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarMenu>
                  {reviewProjects.length === 0 ? (
                    <SidebarMenuItem key="no-review">
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/review" className="text-muted-foreground flex items-center gap-2">
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          <span className="text-sm">No projects in review</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                  reviewProjects.map((project) => (
                    <Collapsible
                      key={`review-${project.id}`}
                      className="w-full"
                      open={!!openProjects[project.id]}
                      onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center w-full">
                            <SidebarMenuButton asChild tooltip={project.name} className="flex-1">
                            <Link href={`/dashboard/review?projectId=${project.id}`} className="flex items-center w-full">
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                                  {getPriorityIcon(project.priority)}
                                </div>
                                <span className="truncate text-sm font-medium">{project.name}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>

                          <CollapsibleTrigger asChild>
                            <SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-2 transform transition-transform duration-200">
                              <ChevronRight />
                              <span className="sr-only">Toggle {project.name} tasks</span>
                            </SidebarMenuAction>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent>
                          { (project.tasks || []).length > 0 ? (
                            <SidebarMenuSub>
                              {(project.tasks || []).map((task: Task) => (
                                <SidebarMenuSubItem key={`review-task-${task.id}`}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={task.url || `/dashboard/review?projectId=${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                      <span
                                        title={task.status}
                                        className={
                                          `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                          (task.status === "Done" || task.status === "Completed"
                                            ? "bg-green-500"
                                            : task.status === "In Progress"
                                            ? "bg-blue-500"
                                            : "bg-gray-400")
                                        }
                                      />
                                      <span className="truncate flex-1 text-sm">{task.title}</span>
                                      <Badge className={
                                        task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                      }>
                                        {task.priority === 'High' && '🔥 '}
                                        {task.priority === 'Medium' && '⚡ '}
                                        {task.priority === 'Low' && '🌱 '}
                                        {task.priority}
                                      </Badge>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          ) : (
                            <div className="px-4 py-2 text-xs text-muted-foreground">No tasks</div>
                          )}
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))) }
                </SidebarMenu>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
        
        {/* Completed Navigation Group - shows projects marked Completed */}
        {isAuthenticated && (
          <Collapsible open={completedGroupOpen} onOpenChange={setCompletedGroupOpen} className="w-full mt-2">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer select-none pr-2 group">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-6 w-6 text-muted-foreground" />
                    <span className="font-semibold">Completed</span>
                  </div>
                  <ChevronDown className="ml-2 h-5 w-5 text-muted-foreground transition-transform duration-300 ease-in-out -rotate-90 group-data-[state=open]:rotate-0" />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarMenu>
                  {completedProjects.length === 0 ? (
                    <SidebarMenuItem key="no-completed">
                      <SidebarMenuButton asChild>
                        <Link href="/dashboard/completed" className="text-muted-foreground flex items-center gap-2">
                          <CheckSquare className="mr-2 h-4 w-4" />
                          <span className="text-sm">No completed projects</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                  completedProjects.map((project) => (
                    <Collapsible
                      key={`completed-${project.id}`}
                      className="w-full"
                      open={!!openProjects[project.id]}
                      onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center w-full">
                            <SidebarMenuButton asChild tooltip={project.name} className="flex-1">
                            <Link href={`/dashboard/projects/${project.id}`} className="flex items-center w-full">
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                                  {getPriorityIcon(project.priority)}
                                </div>
                                <span className="truncate text-sm font-medium">{project.name}</span>
                              </div>
                            </Link>
                          </SidebarMenuButton>

                          <CollapsibleTrigger asChild>
                            <SidebarMenuAction className="data-[state=open]:rotate-90 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ml-2">
                              <ChevronRight />
                              <span className="sr-only">Toggle {project.name} tasks</span>
                            </SidebarMenuAction>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent>
                          { (project.tasks || []).length > 0 ? (
                            <SidebarMenuSub>
                              {(project.tasks || []).filter((t: Task) => (t.status === 'Done' || t.status === 'Completed')).map((task: Task) => (
                                <SidebarMenuSubItem key={`completed-task-${task.id}`}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                      <span
                                        title={task.status}
                                        className={
                                          `inline-block w-2 h-2 rounded-full shrink-0 ` +
                                          (task.status === "Done" || task.status === "Completed"
                                            ? "bg-green-500"
                                            : task.status === "In Progress"
                                            ? "bg-blue-500"
                                            : "bg-gray-400")
                                        }
                                      />
                                      <span className="truncate flex-1 text-sm">{task.title}</span>
                                      <Badge className={
                                        task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                      }>
                                        {task.priority === 'High' && '🔥 '}
                                        {task.priority === 'Medium' && '⚡ '}
                                        {task.priority === 'Low' && '🌱 '}
                                        {task.priority}
                                      </Badge>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          ) : (
                            <div className="px-4 py-2 text-xs text-muted-foreground">No completed tasks</div>
                          )}
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))) }
                </SidebarMenu>
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
                                    <Image
                    src="/bee.png"
                    alt="User Avatar"
                    width={32}
                    height={32}
                    className="rounded-lg transition-all group-data-[state=collapsed]:mx-auto group-data-[state=collapsed]:block"
                  />

                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                    <span className="truncate font-semibold">
                      {isAuthenticated ? getUserDisplayName() : 'Guest'}
                    </span>
                    <span className="truncate text-xs">
                      {isAuthenticated ? (user?.email || 'No email') : 'Not signed in'}
                    </span>
                  </div>

                  {/* Chevron (hidden when collapsed) */}
                  <ChevronUp className="ml-auto size-4 group-data-[state=collapsed]:hidden" />
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