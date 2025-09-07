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
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

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

// Project items with sub-navigation
const projects = [
  {
    name: "Website Redesign",
    url: "/projects/website-redesign",
    icon: Target,
    isActive: true,
    items: [
      {
        title: "Overview",
        url: "/projects/website-redesign",
      },
      {
        title: "Tasks",
        url: "/projects/website-redesign/tasks",
      },
      {
        title: "Team",
        url: "/projects/website-redesign/team",
      },
      {
        title: "Files",
        url: "/projects/website-redesign/files",
      },
    ],
  },
  {
    name: "Mobile App",
    url: "/projects/mobile-app",
    icon: Target,
    items: [
      {
        title: "Overview",
        url: "/projects/mobile-app",
      },
      {
        title: "Tasks",
        url: "/projects/mobile-app/tasks",
      },
      {
        title: "Team",
        url: "/projects/mobile-app/team",
      },
    ],
  },
  {
    name: "Marketing Campaign",
    url: "/projects/marketing-campaign",
    icon: Target,
    items: [
      {
        title: "Overview",
        url: "/projects/marketing-campaign",
      },
      {
        title: "Tasks",
        url: "/projects/marketing-campaign/tasks",
      },
    ],
  },
]


export function AppSidebar() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  // Dynamic navigation items based on authentication status
  const navigationItems = [
    {
      title: "Home",
      url: isAuthenticated ? "/task" : "/",
      icon: Home,
    },
    {
      title: "Projects Board",
      url: "/task",
      icon: FolderOpen,
      badge: "12",
    },
    {
      title: "Tasks",
      url: "/tasks",
      icon: CheckSquare,
      badge: "24",
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

        {/* Projects Section */}
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger>
                Projects
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <SidebarGroupAction title="Add Project">
              <Plus />
              <span className="sr-only">Add Project</span>
            </SidebarGroupAction>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.map((project) => (
                    <Collapsible key={project.name} asChild defaultOpen={project.isActive}>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip={project.name}>
                          <Link href={project.url}>
                            <project.icon />
                            <span>{project.name}</span>
                          </Link>
                        </SidebarMenuButton>
                        {project.items?.length ? (
                          <>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuAction className="data-[state=open]:rotate-90">
                                <ChevronRight />
                                <span className="sr-only">Toggle</span>
                              </SidebarMenuAction>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {project.items?.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton asChild>
                                      <Link href={subItem.url}>
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction showOnHover>
                              <MoreHorizontal />
                              <span className="sr-only">More</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48 rounded-lg"
                            side="bottom"
                            align="end"
                          >
                            <DropdownMenuItem>
                              <Settings className="mr-2 size-4" />
                              <span>Edit Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Users className="mr-2 size-4" />
                              <span>Manage Team</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <span>Delete Project</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        
       
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