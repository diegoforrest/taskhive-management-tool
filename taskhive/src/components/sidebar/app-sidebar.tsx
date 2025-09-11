"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  HelpCircle,
  Flame,
  Zap,
  Leaf,
  Plus,
  Settings,
  User2,
  BarChart3,
  CheckSquare,
  Target,
  LogOut,
  ClipboardCheck,
  Github,
  LayoutDashboard,
  Star,
  MessageSquareCode,
  CircleCheckBig,
  CircleCheck,
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
import DashboardHome from "@/app/dashboard/page"

type SidebarProject = Project & {
  tasks: Task[];
  project_status?: string;
  priority?: Task['priority'];
  url: string;
  taskCount?: number;
  completedCount?: number;
};

const getPriorityIcon = (priority?: Task['priority']) => {
  switch (priority) {
    case "High":
      return <Flame className="h-3 w-3 text-red-600" />
    case "Medium":
      return <Zap className="h-3 w-3 text-yellow-400" />
    case "Low":
      return <Leaf className="h-3 w-3 text-gray-500" />
    case "Critical":
      return <Flame className="h-3 w-3 text-red-700" />
    default:
      return <Leaf className="h-3 w-3 text-gray-500" />
  }
}

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
  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({})
  const [projectsGroupOpen, setProjectsGroupOpen] = useState(false)
  const [reviewGroupOpen, setReviewGroupOpen] = useState(false)
  const [completedGroupOpen, setCompletedGroupOpen] = useState(false)
  

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0).toUpperCase()}${user.firstName.slice(1).toLowerCase()} ${user.lastName.charAt(0).toUpperCase()}${user.lastName.slice(1).toLowerCase()}`
    }
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase()
    }
    if (user.email) {
      return user.email.split('@')[0]
    }
    return `User ${user.user_id}`
  }

  // Load projects
  useEffect(() => {
    const loadUserProjects = async () => {
      if (!user?.user_id || !isAuthenticated) {
        setUserProjects([])
        return
      }

      try {
        setLoading(true)
        
        const projectsResponse = await authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id))
        const projectsData: Project[] = hasDataProp<Project[]>(projectsResponse) ? projectsResponse.data : (Array.isArray(projectsResponse) ? projectsResponse : [])

        const tasksData: Record<number, Task[]> = {}
        if (projectsData.length > 0) {
          const taskPromises = projectsData.map(async (project: Project) => {
            try {
              const resp = await authApi.getTasks(project.id)
              const tasks: Task[] = hasDataProp<Task[]>(resp) ? resp.data : (Array.isArray(resp) ? resp : [])
              return { projectId: project.id, tasks }
            } catch (err) {
              return { projectId: project.id, tasks: [] as Task[] }
            }
          })

          const taskResults = await Promise.all(taskPromises)
          taskResults.forEach(({ projectId, tasks }) => {
            tasksData[projectId] = tasks
          })
        }

        const transformedProjects = projectsData.map((project: Project) => {
          const projectTasksList = tasksData[project.id] || []
          const raw = project as unknown as Record<string, unknown>
          const status = typeof raw['status'] === 'string' ? raw['status'] : typeof raw['project_status'] === 'string' ? raw['project_status'] : null
          const priority = (typeof raw['priority'] === 'string' ? raw['priority'] as Task['priority'] : 'Medium')

          return {
            ...project,
            status,
            url: `/dashboard/projects/${project.id}`,
            priority,
            taskCount: projectTasksList.length,
            completedCount: projectTasksList.filter((task: Task) => task.status === "Done").length,
            tasks: projectTasksList.map((task: Task) => ({
              ...task,
              title: task.name || task.title || 'Untitled Task',
              url: `/dashboard/projects/${project.id}#task-${task.id}`,
            }))
          } as SidebarProject
        })

        setUserProjects(transformedProjects)
      } catch (error) {
        setUserProjects([])
      } finally {
        setLoading(false)
      }
    }

    loadUserProjects()
  }, [user?.user_id, isAuthenticated, refreshKey])

  // Auto-refresh on focus/visibility
  useEffect(() => {
    const handleRefresh = () => {
      if (user?.user_id && isAuthenticated) {
        setRefreshKey(prev => prev + 1)
      }
    }

    const events = ['focus', 'visibilitychange', 'projectCreated', 'projectsUpdated', 'taskCreated', 'tasksUpdated']
    
    events.forEach(event => {
      if (event === 'visibilitychange') {
        document.addEventListener(event, handleRefresh)
      } else {
        window.addEventListener(event, handleRefresh)
      }
    })

    return () => {
      events.forEach(event => {
        if (event === 'visibilitychange') {
          document.removeEventListener(event, handleRefresh)
        } else {
          window.removeEventListener(event, handleRefresh)
        }
      })
    }
  }, [user?.user_id, isAuthenticated])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Filter projects by status
  const reviewProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return s === 'review' || s === 'in review' || s === 'to review'
  })

  const completedProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return s === 'completed' || s === 'done'
  })

  const otherProjects = userProjects.filter((p) => {
    const s = (p.status || p.project_status || '').toString().toLowerCase()
    return !(s === 'review' || s === 'in review' || s === 'to review' || s === 'completed' || s === 'done')
  })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Link href="/" className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
                <Image src="/logo.png" alt="My Logo" width={40} height={40} className="rounded" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-xl group-data-[state=collapsed]:hidden">taskHive</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel><span className="group-data-[state=collapsed]:hidden">Navigation</span></SidebarGroupLabel>
          <SidebarMenu>
            {/* Dashboard */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/dashboard" className="flex items-center w-full">
                  <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                    <LayoutDashboard className="h-5 w-5" />
                  </span>
                  <span className="ml-2 group-data-[state=collapsed]:hidden">Dashboard</span>
                </Link>
              </SidebarMenuButton>
              {userProjects.length > 0 && (
                <SidebarMenuBadge className="group-data-[state=collapsed]:hidden">{userProjects.length}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>

            {/* Projects */}
            <SidebarMenuItem>
              <Collapsible className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="/dashboard?tab=all" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <FolderOpen/>
                      </span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Projects</span>
                    </Link>
                    <CollapsibleTrigger asChild className="group-data-[state=collapsed]:hidden">
                      <SidebarMenuAction className="ml-2 data-[state=open]:rotate-90 transform transition-transform duration-300">
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                
                
                <CollapsibleContent>
                  <SidebarMenu>
                    {loading ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton disabled>Loading...</SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : otherProjects.length === 0 ? (
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
                        <Collapsible key={project.id} className="w-full" open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}>
                          <SidebarMenuItem>
                            <div className="flex items-center w-full">
                              <SidebarMenuButton asChild className="flex-1">
                                <Link href={project.url} className="flex items-center w-full">
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0">
                                      {getPriorityIcon(project.priority)}
                                    </div>
                                    <span className="truncate text-sm font-medium">{project.name}</span>
                                  </div>
                                </Link>
                              </SidebarMenuButton>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90 ml-2">
                                  <ChevronRight />
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              {(project.tasks || []).length > 0 ? (
                                <SidebarMenuSub>
                                  {(project.tasks || []).map((task: Task) => (
                                    <SidebarMenuSubItem key={task.id}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                            task.status === "Done" || task.status === "Completed" ? "bg-green-500" : 
                                            task.status === "In Progress" ? "bg-blue-500" : "bg-gray-400"
                                          }`} />
                                          <span className="truncate flex-1 text-sm">{task.title}</span>
                                          <Badge className={
                                            task.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                            task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                          }>
                                            {task.priority}
                                          </Badge>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              ) : (
                                <div className="px-4 py-2 text-xs text-muted-foreground">No tasks yet</div>
                              )}
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      ))
                    )}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>

            {/* Reviews */}
            <SidebarMenuItem>
              <Collapsible open={reviewGroupOpen} onOpenChange={setReviewGroupOpen} className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="/dashboard?tab=review" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <MessageSquareCode className="h-5 w-5" />
                      </span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Reviews</span>
                    </Link>
                    <CollapsibleTrigger asChild className="group-data-[state=collapsed]:hidden">
                      <SidebarMenuAction className="ml-2 data-[state=open]:rotate-90 transform transition-transform duration-300">
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                
                
                <CollapsibleContent>
                  <SidebarMenu>
                    {reviewProjects.length === 0 ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <div className="text-muted-foreground text-sm px-2">No projects in review</div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      reviewProjects.map((project) => (
                        <Collapsible key={`review-${project.id}`} className="w-full" open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}>
                          <SidebarMenuItem>
                            <div className="flex items-center w-full">
                              <SidebarMenuButton asChild className="flex-1">
                                <Link href={`/dashboard/review?projectId=${project.id}`} className="flex items-center w-full">
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0">
                                      {getPriorityIcon(project.priority)}
                                    </div>
                                    <span className="truncate text-sm font-medium">{project.name}</span>
                                  </div>
                                </Link>
                              </SidebarMenuButton>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90 ml-2">
                                  <ChevronRight />
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              {(project.tasks || []).length > 0 ? (
                                <SidebarMenuSub>
                                  {(project.tasks || []).map((task: Task) => (
                                    <SidebarMenuSubItem key={`review-task-${task.id}`}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={task.url || `/dashboard/review?projectId=${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                          <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                            task.status === "Done" || task.status === "Completed" ? "bg-green-500" : 
                                            task.status === "In Progress" ? "bg-blue-500" : "bg-gray-400"
                                          }`} />
                                          <span className="truncate flex-1 text-sm">{task.title}</span>
                                          <Badge className={
                                            task.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                            task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                          }>
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
              </Collapsible>
            </SidebarMenuItem>

            {/* Completed */}
            <SidebarMenuItem>
              <Collapsible open={completedGroupOpen} onOpenChange={setCompletedGroupOpen} className="w-full">
                <SidebarMenuButton asChild>
                  <div className="flex items-center w-full">
                    <Link href="/dashboard?tab=completed" className="flex items-center w-full">
                      <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                        <CircleCheckBig />
                      </span>
                      <span className="ml-2 group-data-[state=collapsed]:hidden">Completed</span>
                    </Link>
                    <CollapsibleTrigger asChild className="group-data-[state=collapsed]:hidden">
                      <SidebarMenuAction className="ml-2 data-[state=open]:rotate-90 transform transition-transform duration-300">
                        <ChevronRight />
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                  </div>
                </SidebarMenuButton>
                
                
                <CollapsibleContent>
                  <SidebarMenu>
                    {completedProjects.length === 0 ? (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <div className="text-muted-foreground text-sm px-2">No completed projects</div>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ) : (
                      completedProjects.map((project) => (
                        <Collapsible key={`completed-${project.id}`} className="w-full" open={!!openProjects[project.id]} onOpenChange={(isOpen) => setOpenProjects((prev) => ({ ...prev, [project.id]: isOpen }))}>
                          <SidebarMenuItem>
                            <div className="flex items-center w-full">
                              <SidebarMenuButton asChild className="flex-1">
                                <Link href={`/dashboard/projects/${project.id}`} className="flex items-center w-full">
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-6 h-6 rounded-full bg-transparent flex items-center justify-center mr-2 flex-shrink-0">
                                      {getPriorityIcon(project.priority)}
                                    </div>
                                    <span className="truncate text-sm font-medium">{project.name}</span>
                                  </div>
                                </Link>
                              </SidebarMenuButton>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuAction className="data-[state=open]:rotate-90 ml-2">
                                  <ChevronRight />
                                </SidebarMenuAction>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              {(project.tasks || []).filter((t: Task) => (t.status === 'Done' || t.status === 'Completed')).length > 0 ? (
                                <SidebarMenuSub>
                                  {(project.tasks || []).filter((t: Task) => (t.status === 'Done' || t.status === 'Completed')).map((task: Task) => (
                                    <SidebarMenuSubItem key={`completed-task-${task.id}`}>
                                      <SidebarMenuSubButton asChild>
                                        <Link href={task.url || `/dashboard/projects/${project.id}#task-${task.id}`} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-sidebar-accent transition-colors w-full">
                                          <span className="inline-block w-2 h-2 rounded-full shrink-0 bg-green-500" />
                                          <span className="truncate flex-1 text-sm">{task.title}</span>
                                          <Badge className={
                                            task.priority === 'High' ? 'bg-red-100 text-red-700' : 
                                            task.priority === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                          }>
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
                      ))
                    )}
                  </SidebarMenu>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* More */}
        <SidebarGroup>
          <SidebarGroupLabel><span className="group-data-[state=collapsed]:hidden">More</span></SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/help" className="flex items-center w-full">
                  <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                    <HelpCircle />
                  </span>
                  <span className="ml-2 group-data-[state=collapsed]:hidden">Help</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="https://github.com/diegoforrest/taskhive-management-tool" target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                  <span className="flex-shrink-0 group-data-[state=collapsed]:mx-auto">
                    <Github  />
                  </span>
                  <span className="ml-2 group-data-[state=collapsed]:hidden">Source Code</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Image src="/bee.png" alt="User Avatar" width={32} height={32} className="rounded-lg transition-all group-data-[state=collapsed]:mx-auto group-data-[state=collapsed]:block" />
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[state=collapsed]:hidden">
                    <span className="truncate font-semibold">{isAuthenticated ? getUserDisplayName() : 'Guest'}</span>
                    <span className="truncate text-xs">{isAuthenticated ? (user?.email || 'No email') : 'Not signed in'}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4 group-data-[state=collapsed]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="top" align="start" sideOffset={4}>
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