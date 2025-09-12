"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { ClipboardCheck, ChevronDown, ChevronRight, Calendar, FolderOpen, CheckSquare, ChevronUp, BadgeQuestionMark, Github, User2, Settings, LogOut, Target, Flame, Zap, Leaf } from "lucide-react"

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarRail,
} from "@/components/ui/sidebar"

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useAuth } from "@/lib/auth-context"
import { authApi, Task, Project } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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

  // No automatic opening of dropdowns based on route. Dropdowns are
  // controlled exclusively by user interaction (clicking the chevron).
  useEffect(() => {
    // Intentionally empty to avoid auto-opening Review/Completed groups.
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

  // Do not auto-open or auto-close the Projects group; users control
  // expand/collapse via the chevron. Keep the effect present only if
  // other consumers expect pathname changes; otherwise it's a no-op.
  useEffect(() => {
    // Intentionally empty to avoid auto-opening Projects or altering openProjects.
  }, [pathname, userProjects])



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
    }
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

  // Projects that are In Progress (explicit filter for Projects dropdown)
  const inProgressProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return s === 'in progress' || s === 'inprogress' || s === 'in_progress' || s === 'started' || s === 'progress' || s === 'ongoing'
  })

  return (
    <Sidebar collapsible="icon" className="transition-all duration-200 ease-in-out">
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
              <span className="truncate font-bold text-xl transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">taskHive</span>
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
                  <Link href={isAuthenticated ? item.url : '/auth/sign-in'} className="flex items-center w-full">
                    <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {/* header-level badges removed intentionally */}
              </SidebarMenuItem>
            ))}


                        {/* Projects (not in review) */}
            <SidebarMenuItem>
              <Collapsible open={projectsGroupOpen} onOpenChange={setProjectsGroupOpen}>
                <div className="relative">
                  <SidebarMenuButton asChild>
                              <Link href={isAuthenticated ? "/dashboard?tab=all" : "/auth/sign-in"} className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <FolderOpen className="h-4 w-4" />
                      </span>
                      <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">Projects</span>
                    </Link>
                  </SidebarMenuButton>

                  <SidebarMenuAction aria-expanded={projectsGroupOpen} onClick={(e) => { e.stopPropagation(); setProjectsGroupOpen((s) => !s); }}>
                    {projectsGroupOpen ? (
                      <ChevronDown className="size-4 transition-transform" />
                    ) : (
                      <ChevronRight className="size-4 transition-transform" />
                    )}
                  </SidebarMenuAction>
                </div>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {inProgressProjects.map((p) => (
                      <SidebarMenuSubItem key={p.id}>
                        <Collapsible open={!!openProjects[p.id]} onOpenChange={(val) => setOpenProjects((prev) => ({ ...prev, [p.id]: val }))}>
                          <div className="relative">
                            <SidebarMenuSubButton asChild>
                              <Link href={isAuthenticated ? `/dashboard/projects/${p.id}` : "/auth/sign-in"} className="flex items-center w-full">
                                <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex items-center">
                                        <Calendar className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={4}>{getProjectTooltipText(p, false)}</TooltipContent>
                                  </Tooltip>
                                </span>
                                <span className="ml-2 truncate">{p.name}</span>
                              </Link>
                            </SidebarMenuSubButton>

                            <SidebarMenuAction aria-expanded={!!openProjects[p.id]} onClick={(e) => { e.stopPropagation(); setOpenProjects((prev) => ({ ...prev, [p.id]: !prev[p.id] })); }}>
                              {openProjects[p.id] ? (
                                <ChevronDown className="size-4 transition-transform" />
                              ) : (
                                <ChevronRight className="size-4 transition-transform" />
                              )}
                            </SidebarMenuAction>
                          </div>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {p.tasks && p.tasks.length > 0 ? p.tasks.map((task) => (
                                <SidebarMenuSubItem key={task.id}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={isAuthenticated ? (`/dashboard/projects/${p.id}#task-${task.id}`) : "/auth/sign-in"} className="flex items-center w-full">
                                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto flex items-center gap-2">
                                        {getPriorityIcon(task.priority)}
                                        <span className={`inline-block h-2 w-2 rounded-full ${getStatusDotClass(task.status)}`} aria-hidden="true" />
                                      </span>
                                      <span className="ml-2 truncate">{task.title || task.name || 'Untitled Task'}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )) : (
                                <SidebarMenuSubItem>
                                  <div className="px-2 text-xs text-muted-foreground">No tasks</div>
                                </SidebarMenuSubItem>
                              )}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Review group */}
            <SidebarMenuItem>
              <Collapsible open={reviewGroupOpen} onOpenChange={setReviewGroupOpen}>
                <div className="relative">
                  <SidebarMenuButton asChild>
                    <Link href={isAuthenticated ? "/dashboard?tab=review" : "/auth/sign-in"} className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <CheckSquare className="h-4 w-4" />
                      </span>
                      <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">Review</span>
                    </Link>
                  </SidebarMenuButton>

                  <SidebarMenuAction aria-expanded={reviewGroupOpen} onClick={(e) => { e.stopPropagation(); setReviewGroupOpen((s) => !s); }}>
                    {reviewGroupOpen ? (
                      <ChevronDown className="size-4 transition-transform" />
                    ) : (
                      <ChevronRight className="size-4 transition-transform" />
                    )}
                  </SidebarMenuAction>
                </div>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {reviewProjects.map((p) => (
                      <SidebarMenuSubItem key={p.id}>
                        <Collapsible open={!!openProjects[p.id]} onOpenChange={(val) => setOpenProjects((prev) => ({ ...prev, [p.id]: val }))}>
                          <div className="relative">
                            <SidebarMenuSubButton asChild>
                              <Link href={isAuthenticated ? `/dashboard/review?projectId=${p.id}` : "/auth-sign-in"} className="flex items-center w-full">
                                <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex items-center">
                                        <Calendar className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={4}>{getProjectTooltipText(p, false)}</TooltipContent>
                                  </Tooltip>
                                </span>
                                <span className="ml-2 truncate">{p.name}</span>
                              </Link>
                            </SidebarMenuSubButton>

                            <SidebarMenuAction aria-expanded={!!openProjects[p.id]} onClick={(e) => { e.stopPropagation(); setOpenProjects((prev) => ({ ...prev, [p.id]: !prev[p.id] })); }}>
                              {openProjects[p.id] ? (
                                <ChevronDown className="size-4 transition-transform" />
                              ) : (
                                <ChevronRight className="size-4 transition-transform" />
                              )}
                            </SidebarMenuAction>
                          </div>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {p.tasks && p.tasks.length > 0 ? p.tasks.map((task) => (
                                <SidebarMenuSubItem key={task.id}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={isAuthenticated ? (`/dashboard/review?projectId=${p.id}#task-${task.id}`) : "/auth/sign-in"} className="flex items-center w-full">
                                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto flex items-center gap-2">
                                        {getPriorityIcon(task.priority)}
                                        <span className={`inline-block h-2 w-2 rounded-full ${getStatusDotClass(task.status)}`} aria-hidden="true" />
                                      </span>
                                      <span className="ml-2 truncate">{task.title || task.name || 'Untitled Task'}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )) : (
                                <SidebarMenuSubItem>
                                  <div className="px-2 text-xs text-muted-foreground">No tasks</div>
                                </SidebarMenuSubItem>
                              )}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Completed group */}
            <SidebarMenuItem>
              <Collapsible open={completedGroupOpen} onOpenChange={setCompletedGroupOpen}>
                <div className="relative">
                  <SidebarMenuButton asChild>
                    <Link href={isAuthenticated ? "/dashboard?tab=completed" : "/auth/sign-in"} className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">Completed</span>
                    </Link>
                  </SidebarMenuButton>

                  <SidebarMenuAction aria-expanded={completedGroupOpen} onClick={(e) => { e.stopPropagation(); setCompletedGroupOpen((s) => !s); }}>
                    {completedGroupOpen ? (
                      <ChevronDown className="size-4 transition-transform" />
                    ) : (
                      <ChevronRight className="size-4 transition-transform" />
                    )}
                  </SidebarMenuAction>
                </div>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {completedProjects.map((p) => (
                      <SidebarMenuSubItem key={p.id}>
                        <Collapsible open={!!openProjects[p.id]} onOpenChange={(val) => setOpenProjects((prev) => ({ ...prev, [p.id]: val }))}>
                          <div className="relative">
                            <SidebarMenuSubButton asChild>
                              <Link href={isAuthenticated ? `/dashboard/completed/${p.id}` : "/auth-sign-in"} className="flex items-center w-full">
                                <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help inline-flex items-center">
                                        <Calendar className="h-4 w-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent sideOffset={4}>{getProjectTooltipText(p, true)}</TooltipContent>
                                  </Tooltip>
                                </span>
                                <span className="ml-2 truncate">{p.name}</span>
                              </Link>
                            </SidebarMenuSubButton>

                            <SidebarMenuAction aria-expanded={!!openProjects[p.id]} onClick={(e) => { e.stopPropagation(); setOpenProjects((prev) => ({ ...prev, [p.id]: !prev[p.id] })); }}>
                              {openProjects[p.id] ? (
                                <ChevronDown className="size-4 transition-transform" />
                              ) : (
                                <ChevronRight className="size-4 transition-transform" />
                              )}
                            </SidebarMenuAction>
                          </div>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {p.tasks && p.tasks.length > 0 ? p.tasks.map((task) => (
                                <SidebarMenuSubItem key={task.id}>
                                  <SidebarMenuSubButton asChild>
                                    <Link href={isAuthenticated ? (`/dashboard/completed/${p.id}#task-${task.id}`) : "/auth-sign-in"} className="flex items-center w-full">
                                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto flex items-center gap-2">
                                        {getPriorityIcon(task.priority)}
                                        <span className={`inline-block h-2 w-2 rounded-full ${getStatusDotClass(task.status)}`} aria-hidden="true" />
                                      </span>
                                      <span className="ml-2 truncate">{task.title || task.name || 'Untitled Task'}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )) : (
                                <SidebarMenuSubItem>
                                  <div className="px-2 text-xs text-muted-foreground">No tasks</div>
                                </SidebarMenuSubItem>
                              )}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
            {/* Resources group */}
            <SidebarMenuItem>
              <SidebarGroupLabel className="mt-2">Resources</SidebarGroupLabel>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href="/info" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <BadgeQuestionMark className="h-4 w-4" />
                      </span>
                      <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">Help</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="https://github.com/diegoforrest/taskhive-management-tool" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <Github className="h-4 w-4" />
                      </span>
                      <span className="ml-2 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">Source Code</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>


       
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                                    <div className="w-10 h-10 transition-all duration-200 ease-in-out group-data-[state=collapsed]:w-8 group-data-[state=collapsed]:h-8 flex-shrink-0 flex items-center justify-center">
                                      <Image
                                        src="/bee.png"
                                        alt="User Avatar"
                                        width={40}
                                        height={40}
                                        className="rounded-lg w-full h-full object-cover transition-all duration-200 ease-in-out"
                                      />
                                    </div>

                  <div className="grid flex-1 text-left text-sm leading-tight transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden">
                    <span className="truncate font-semibold">
                      {isAuthenticated ? getUserDisplayName() : 'Guest'}
                    </span>
                    <span className="truncate text-xs">
                      {isAuthenticated ? (user?.email || 'No email') : 'Not signed in'}
                    </span>
                  </div>

                  {/* Chevron (hidden when collapsed) */}
                  <ChevronUp className="ml-auto size-4 transition-all duration-200 ease-in-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:w-0 group-data-[state=collapsed]:overflow-hidden" />
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

// Map task status to a small dot color class
const getStatusDotClass = (status?: string) => {
  const s = status?.toString().toLowerCase().trim() || ''
  if (s === 'done' || s === 'completed' || s.includes('done') || s.includes('completed')) return 'bg-green-500'
  if (s === 'in progress' || s === 'inprogress' || s === 'in_progress' || s.includes('progress') || s === 'started' || s === 'ongoing') return 'bg-blue-500'
  // default: todo/unknown
  return 'bg-gray-400'
}

// Format project date for tooltip display
const formatProjectDate = (raw?: string | undefined) => {
  if (!raw) return 'No date'
  try {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return 'No date'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch (e) {
    return 'No date'
  }
}

// Get the tooltip text for a project depending on context
const getProjectTooltipText = (p: SidebarProject, completed = false) => {
  if (completed) {
    // Prefer updatedAt as completed timestamp, fallback to createdAt or due_date
    const d = formatProjectDate((p as any).updatedAt ?? (p as any).createdAt ?? p.due_date)
    return `Completed ${d}`
  }
  // For active/review projects show due date primarily
  const d = formatProjectDate(p.due_date ?? (p as any).updatedAt ?? (p as any).createdAt)
  return `Due ${d}`
}