
"use client";



import * as React from "react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Sun, Moon, Laptop, Search, User2, LogOut, Loader2, Calendar, HelpCircle } from "lucide-react"
import { Toaster } from 'react-hot-toast'
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api"
  // Lightweight UI-facing project shape used for search results
  type ProjectLike = {
    id: number;
    name?: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date?: string | undefined;
    user_id?: number;
    createdAt?: string;
  }

export function TopBar() {
  // Hydration fix: only render theme toggle after mount
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);
  const { theme, setTheme } = useTheme()
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<ProjectLike[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  
  const handleLogout = () => {
    logout()
    router.push('/')
  }

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

  // user initials helper removed (not used)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Safely extract key; some synthetic events or unexpected events may not have a string key
      const rawKey = (e && (e as any).key) as unknown
      const key = typeof rawKey === 'string' ? rawKey.toLowerCase() : ''

      // Cmd/Ctrl+K: open search (existing behavior)
      if (isAuthenticated && (e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      // Single-key 'k' shortcut: open search when not typing in an input
      // Ignore when any modifier is held or when focus is inside editable elements
      if (
        isAuthenticated &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        key === 'k'
      ) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toUpperCase();
        const isEditable = !!target && (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
        if (!isEditable) {
          e.preventDefault();
          setSearchOpen(true);
          return;
        }
      }

      // Escape: close search
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAuthenticated])

  // Search functionality
  const performSearch = React.useCallback(async (query: string) => {
    if (!query.trim() || !isAuthenticated || !user?.user_id) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      // Fetch projects for current user from real API
      const projectsRaw = await authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id));
  const projects = (projectsRaw && typeof projectsRaw === 'object' && 'data' in (projectsRaw as Record<string, unknown>)) ? (projectsRaw as Record<string, unknown>).data as unknown[] || [] : (Array.isArray(projectsRaw) ? projectsRaw : []);

      const q = query.toLowerCase();

      // Only match project name or due date (ISO or formatted)
      const augmented = ((projects || []) as unknown[]).map((v) => {
        const p = v as Record<string, unknown>;
        // Normalize/choose a human-friendly name. Backend may use different fields
        // or accidentally return a numeric name — coerce to string when needed.
        const rawName = p.name ?? p.project_name ?? p.title ?? (p.id ? String(p.id) : undefined);
        const name = typeof rawName === 'number' ? String(rawName) : rawName as string | undefined;
        const displayName = (name && String(name).trim()) ? String(name) : `Project ${(p.id as number)}`;

        return {
          id: p.id as number,
          name: displayName,
          description: (p.description ?? p.contents ?? p.description) as string | undefined,
          status: p.status as string | undefined,
          priority: p.priority as string | undefined,
          due_date: (p.due_date ?? p.dueDate) as string | undefined,
          createdAt: p.createdAt as string | undefined,
        } as ProjectLike;
      });

      const filtered = augmented.filter((p: ProjectLike) => {
        const name = (p.name || '').toLowerCase();
  const dueIso = (p.due_date || p.createdAt || '').toString();
  const dueFormatted = dueIso ? new Date(dueIso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '').toLowerCase() : '';
  const due = (dueIso + ' ' + dueFormatted).toLowerCase();
        return name.includes(q) || due.includes(q);
      });

      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [isAuthenticated, user?.user_id])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Handle search result click
  const handleResultClick = (project: ProjectLike) => {
    setSearchOpen(false)
    setSearchQuery("")
    setSearchResults([])

    // Determine which dashboard tab the project should appear under
    const determineTab = (p: ProjectLike) => {
      const s = (p.status || '').toString().toLowerCase();
      if (s.includes('completed')) return 'completed';
      // backend may use 'To Review', 'Ready for Review', 'Review'
      if (s.includes('review') || s.includes('to review') || s.includes('ready')) return 'review';
      return 'all';
    }

    const tab = determineTab(project);

    // Navigate to dashboard with both projectId and tab so the dashboard can open the correct tab and highlight
    try {
      const params = new URLSearchParams();
      params.set('projectId', String(project.id));
      params.set('tab', tab);
      router.push(`/dashboard?${params.toString()}`);
    } catch {
      router.push('/dashboard');
    }
  }

  // Handle search input click
  const handleSearchClick = () => {
    if (!isAuthenticated) {
      router.push('/auth/sign-in')
      return
    }
    setSearchOpen(true)
  }

  return (
    <>
  <Toaster position="top-center" />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-2 sm:px-4 gap-2 sm:gap-4">
          {/* Left column - fixed width to reserve space for sidebar trigger */}
          <div className="flex items-center w-12">
            {isAuthenticated && <SidebarTrigger className="-ml-1" />}
          </div>

          {/* Center spacer to push controls to the right */}
          <div className="flex-1" />

          {/* Right column - theme toggle and user menu always stick to the right */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Dropdown */}
            {mounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    {theme === "light" ? (
                      <Sun className="h-4 w-4" />
                    ) : theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Laptop className="h-4 w-4" />
                    )}
                    <span className="sr-only">Select theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-40">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>

                  <DropdownMenuItem
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Laptop className="h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Search - show only when signed in, placed between theme and account */}
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 sm:px-3 text-muted-foreground hover:text-foreground transition-colors relative group"
                onClick={handleSearchClick}
              >
                <Search className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm font-normal">Search</span>
                <kbd className="hidden [@media(min-width:769px) and (max-width:1080px)]:ml-2 [@media(min-width:769px) and (max-width:1080px)]:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="/bee.png" alt={getUserDisplayName()} />
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">
                      {isAuthenticated ? getUserDisplayName() : 'Guest'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {isAuthenticated ? (user?.email || 'No email') : 'Not signed in'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                {isAuthenticated ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User2 className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    {/* Settings removed per request; only Profile and Sign out remain */}
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link href="/auth/sign-in">
                      <User2 className="mr-2 h-4 w-4" />
                      Sign in
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] mx-auto p-0">
          {/* Accessible title for screen readers; visually hidden */}
          <DialogTitle className="sr-only">Search projects</DialogTitle>
            <DialogHeader className="px-4 sm:px-6 py-4 border-b">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                placeholder="Search project titles or due dates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
            </div>
          </DialogHeader>
          
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {searchQuery.trim() === '' ? (
              <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
                <p>Start typing to search your project titles or project due date</p>
                <div className="text-xs mt-2 space-y-1">
                  <p>Search by:</p>
                    <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 text-xs">
                      <span>• Project titles</span>
                      <span className="inline-flex items-center gap-2">
                        <span>• Due dates</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button aria-label="Due date search help" className="inline-flex items-center justify-center h-3 w-3 rounded text-muted-foreground hover:bg-muted/50 focus:outline-none">
                              <HelpCircle className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="max-w-xs text-left">
                              Search by full date (e.g. Sep 11 2025) or ISO (2025-09-11). Partial matches like Sep 2025 also work.
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </div>
                </div>
              </div>
            ) : searchResults.length === 0 && !isSearching ? (
              <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-sm text-muted-foreground">
                <Search className="mx-auto h-6 w-6 sm:h-8 sm:w-8 mb-2 opacity-50" />
                <p>No results found for <span className="font-mono">{searchQuery}</span></p>
                <p className="text-xs mt-1">Try different keywords or check spelling</p>
              </div>
            ) : (
              <div className="py-2">
                <div className="px-4 sm:px-6 py-2 text-xs font-medium text-muted-foreground border-b">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </div>
                {searchResults.map((project: ProjectLike) => (
                  <button
                    key={project.id}
                    onClick={() => handleResultClick(project)}
                    className="w-full px-4 sm:px-6 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground outline-none transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          <p className="font-medium text-sm truncate min-w-0 flex-1">{project.name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant={project.priority === 'High' ? 'destructive' : project.priority === 'Medium' ? 'secondary' : 'outline'} className="text-xs">
                              {project.priority}
                            </Badge>
                          </div>
                        </div>
                        {project.description && (
                          <p className="text-xs text-muted-foreground truncate mb-1">{project.description}</p>
                        )}
                        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs text-muted-foreground">
                          <span className={`capitalize ${project.status && project.status.toLowerCase().includes('completed') ? 'text-green-700' : project.status && project.status.toLowerCase().includes('review') ? 'text-purple-700' : 'text-blue-700'}`}>{project.status}</span>
                          {/* assignees removed from search results - search now matches only project name and due date */}
                          {project.due_date && (
                            <span className="flex items-center flex-shrink-0">
                              <Calendar className="h-3 w-3 mr-1" />
                              {`Due ${new Date(project.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 sm:px-6 py-3 border-t bg-muted/50">
            <div className="flex items-center justify-end text-xs text-muted-foreground">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ESC
                </kbd>
                <span className="hidden sm:inline">to close</span>
                <span className="sm:hidden">close</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
