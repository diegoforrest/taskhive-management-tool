"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, List, Plus, Clock, AlertCircle, PlayCircle, CheckCircle, Calendar, Funnel, XCircle, Pause, Flame, Gauge, Leaf, ClockAlert, Rocket, User, BadgeQuestionMark, FolderOpen, MessageSquareCode, CircleCheck, Archive, ArchiveX, Undo2, CalendarCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import ClientDate from "@/components/ui/client-date"
import CalendarPicker from "@/components/ui/calendar"
import { tasksApi, authApi, Task, Project, ApiResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from 'next/navigation';

// Type guard for ApiResponse-like objects that contain a `data` property
function hasData<T>(v: unknown): v is { data: T } {
  return typeof v === 'object' && v !== null && 'data' in v;
}

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState<"all" | "review" | "completed">("all");
  const [completionDialog, setCompletionDialog] = useState<{ open: boolean; projectId: number | null }>({
    open: false,
    projectId: null
  });
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; projectId: number | null }>({
    open: false,
    projectId: null
  });
  // Archive dialog and FAB (floating action button) state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  // Confirmation modal for archiving
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [fabPos, setFabPos] = useState<{ x: number; y: number }>(() => ({ x: 0, y: 0 }));
  const draggingRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number; moved: boolean }>({ active: false, startX: 0, startY: 0, origX: 0, origY: 0, moved: false });
  const draggingStateRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [note, setNote] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const projectsRef = useRef<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Record<number, Task[]>>({});
  // track which project's <details> dropdown is open so we can rotate the chevron
  const [detailsOpenMap, setDetailsOpenMap] = useState<Record<number, boolean>>({});
  // map taskId -> latest changelog (new_status, remark, createdAt) used on review tab
  const [taskChangeMap, setTaskChangeMap] = useState<Record<number, { new_status?: string; remark?: string; createdAt?: string } | null>>({});
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'any' | 'today' | 'this_week' | 'overdue' | 'specific'>('any');
  const [specificDate, setSpecificDate] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Keep tab in sync with URL search param `tab` (bookmarkable)
  useEffect(() => {
    const param = searchParams?.get('tab') || searchParams?.get('t');
    if (!param) return;
    const p = param.toLowerCase();
    if (p === 'all' || p === 'review' || p === 'completed') {
      setActiveTab(p as 'all' | 'review' | 'completed');
    }
  }, [searchParams]);

  const changeTab = useCallback((tab: 'all' | 'review' | 'completed') => {
    setActiveTab(tab);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      const url = `${window.location.pathname}?${params.toString()}`;
      router.push(url);
    } catch (e) {
      console.warn('Failed to update tab in URL', e);
    }
  }, [router]);
  
  // Use Task and Project types from the API typings

  // Load projects and tasks from API
  const loadProjectTasks = useCallback(async (projectsData: Project[]) => {
    const tasksByProject: Record<number, Task[]> = {};
    
    // Load tasks for each project
      const taskPromises = projectsData.map(async (project: Project) => {
      try {
    const raw = await authApi.getTasks(project.id) as ApiResponse<Task[]> | Task[] | unknown;
    const tasks: Task[] = hasData<Task[]>(raw) ? raw.data || [] : (Array.isArray(raw) ? raw : []);
        return { projectId: project.id, tasks };
      } catch (error) {
        console.error(`Failed to load tasks for project ${project.id}:`, error);
        return { projectId: project.id, tasks: [] as Task[] };
      }
    });

    const results = await Promise.all(taskPromises);
    
    results.forEach(({ projectId, tasks }) => {
      tasksByProject[projectId] = tasks;
    });

  setProjectTasks(tasksByProject);
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      // Load projects from real API
      const projectsResponse = await authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id));
      console.log('Current user ID:', user.user_id);
      console.log('Projects API response:', projectsResponse);

      // Extract projects from the response (support both ApiResponse and raw array)
      const projectsData: Project[] = hasData<Project[]>(projectsResponse)
        ? projectsResponse.data || []
        : (Array.isArray(projectsResponse) ? projectsResponse : []);
      console.log('Projects data:', projectsData);

      setProjects(projectsData);

      // Load tasks for each project
      if (projectsData.length > 0) {
        await loadProjectTasks(projectsData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Fallback logic unchanged
      try {
        console.log('Falling back to mock data...');
  const [projectsData, tasksData] = await Promise.all([
          tasksApi.getAllProjects(),
          tasksApi.getAllTasks()
        ]);
        const userIdNum = typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id);
        const userProjects: Project[] = projectsData
          .filter((project: Project) => project.user_id === userIdNum)
          .map((project: Project) => ({
            ...project,
            tasks: tasksData.filter((task: Task) => task.project_id === project.id)
          }));
  setProjects(userProjects);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.user_id, loadProjectTasks]);

  // Archive / Unarchive helpers with optimistic persistence and rollback
  const archiveProject = useCallback(async (projectId: number) => {
    // only archive if project is completed
    const prevSnapshot = projectsRef.current;
    setProjects(prev => prev.map(p => (p.id === projectId && (p as any).status === 'Completed') ? ({ ...p, archived: true, archived_at: new Date().toISOString() }) : p));

    try {
      await authApi.updateProject(projectId, { archived: true });
    } catch (err) {
      console.error('Failed to persist archive state', err);
      // rollback optimistic change
      setProjects(prevSnapshot);
      // TODO: show user-facing notification
    }
  }, []);

  const unarchiveProject = useCallback(async (projectId: number) => {
    const prevSnapshot = projectsRef.current;
    setProjects(prev => prev.map(p => p.id === projectId ? ({ ...p, archived: false, archived_at: undefined }) : p));

    try {
      await authApi.updateProject(projectId, { archived: false });
    } catch (err) {
      console.error('Failed to persist unarchive', err);
      // rollback optimistic change
      setProjects(prevSnapshot);
      // TODO: show user-facing notification
    }
  }, []);

  // derived archived projects
  const archivedProjects = projects.filter(p => (p as any).archived === true);
  const [unarchivingMap, setUnarchivingMap] = useState<Record<number, boolean>>({});
  const suppressClickRef = useRef(false);

  const requestArchive = useCallback((projectId: number) => {
    setConfirmTargetId(projectId);
    setConfirmArchiveOpen(true);
  }, []);

  const confirmArchive = useCallback(() => {
    if (confirmTargetId == null) return;
    // call async archive helper (fire-and-forget for UI flow)
    void archiveProject(confirmTargetId);
    setConfirmTargetId(null);
    setConfirmArchiveOpen(false);
  }, [confirmTargetId, archiveProject]);

  // FAB position initialization (client-only)
  useEffect(() => {
    try {
      // Always start at bottom-right corner on load
      const margin = 24;
      const btnSize = 56; // approximate touch target / button footprint
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const initX = Math.max(margin, Math.min(vw - margin - btnSize, vw - 88));
      const initY = Math.max(margin, Math.min(vh - margin - btnSize, vh - 120));
      setFabPos({ x: vw - margin - btnSize, y: vh - margin - btnSize });
    } catch (e) {
      // ignore in SSR
    }
  }, []);

  // Keep FAB visible on window resize by clamping its position to the viewport
  useEffect(() => {
    const onResize = () => {
      const margin = 24;
      const btnSize = 56;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setFabPos(prev => {
        const nx = Math.max(margin, Math.min(prev.x, vw - margin - btnSize));
        const ny = Math.max(margin, Math.min(prev.y, vh - margin - btnSize));
        // only update if changed to avoid re-renders
        if (nx !== prev.x || ny !== prev.y) return { x: nx, y: ny };
        return prev;
      });
    };

    window.addEventListener('resize', onResize);
    // run once to ensure initial clamp on mount
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Pointer handlers for dragging the FAB
  useEffect(() => {
    const onPointerMove = (ev: PointerEvent) => {
      if (!draggingRef.current.active) return;
      const dx = ev.clientX - draggingRef.current.startX;
      const dy = ev.clientY - draggingRef.current.startY;
      // mark moved when drag exceeds small threshold to distinguish from click
      if (!draggingRef.current.moved && Math.hypot(dx, dy) > 6) draggingRef.current.moved = true;
      setFabPos({ x: draggingRef.current.origX + dx, y: draggingRef.current.origY + dy });
    };
      const onPointerUp = () => {
      const wasMoved = draggingRef.current.moved;
      draggingRef.current.active = false;
      draggingRef.current.moved = false;
  draggingStateRef.current = false; // ended dragging so re-enable transitions
  try { setIsDragging(false); } catch (_) {}

      if (wasMoved) {
        // suppress the upcoming click event (if any)
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 50);
        // Snap to nearest corner if it was moved
        const snapToCorner = () => {
          const margin = 24; // distance from edge
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let nx = fabPos.x;
          let ny = fabPos.y;
          // constrain inside viewport
          nx = Math.max(margin, Math.min(nx, vw - margin - 56));
          ny = Math.max(margin, Math.min(ny, vh - margin - 56));
          // find nearest corner
          const corners = [
            { x: margin, y: margin }, // top-left
            { x: vw - margin - 56, y: margin }, // top-right
            { x: margin, y: vh - margin - 56 }, // bottom-left
            { x: vw - margin - 56, y: vh - margin - 56 }, // bottom-right
          ];
          let best = corners[0];
          let bestDist = Infinity;
          for (const c of corners) {
            const d = Math.hypot(nx - c.x, ny - c.y);
            if (d < bestDist) { bestDist = d; best = c; }
          }
          setFabPos({ x: best.x, y: best.y });
        };

        try { snapToCorner(); } catch (e) { /* ignore */ }
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draggingRef, fabPos]);

  useEffect(() => {
    console.log('Dashboard mounted, loading data...');
    loadData();
  }, [loadData]);

  // If URL contains ?projectId=, scroll to and highlight that project card
  useEffect(() => {
    try {
      const pid = searchParams?.get('projectId');
      if (pid) {
        // delay slightly to allow cards to render
        setTimeout(() => {
          const el = document.getElementById(`project-${pid}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 3000);
          }
        }, 200);
      }
    } catch (e) {
      // ignore
    }
  }, [searchParams, projects]);

  const handleDetailsToggle = useCallback((projectId: number, e: unknown) => {
    try {
      const ev = e as { currentTarget?: EventTarget | null } | undefined;
      const el = ev?.currentTarget as unknown as HTMLDetailsElement | undefined;
      setDetailsOpenMap(prev => ({ ...prev, [projectId]: !!(el && el.open) }));
    } catch (_err) {
      // ignore
    }
  }, []);

  // When Review tab active, fetch latest changelog for each task so we can show a status icon
  useEffect(() => {
    if (activeTab !== 'review') return;

    let mounted = true;
    const loadChangelogs = async () => {
      try {
        const entries: Record<number, { new_status?: string; remark?: string; createdAt?: string } | null> = {};
        const allTasks: Task[] = Object.values(projectTasks).flat();

        await Promise.all(allTasks.map(async (task) => {
          try {
            const res = await tasksApi.getChangelogs(task.id);
            const dataRaw = (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) ? (res as Record<string, unknown>).data as unknown : (Array.isArray(res) ? res : []);
            const rows = Array.isArray(dataRaw) ? dataRaw as unknown[] : [];
            if (rows.length > 0) {
              const latest = rows.slice().sort((a, b) => new Date((b as Record<string, unknown>).createdAt as string || '').getTime() - new Date((a as Record<string, unknown>).createdAt as string || '').getTime())[0] as Record<string, unknown>;
              entries[task.id] = { new_status: latest.new_status as string | undefined, remark: latest.remark as string | undefined, createdAt: latest.createdAt as string | undefined };
            } else {
              entries[task.id] = null;
            }
          } catch (e) {
            console.warn('Failed to load changelogs for task', task.id, e);
            entries[task.id] = null;
          }
        }));

        if (!mounted) return;
        setTaskChangeMap(entries);
      } catch (e) {
        console.error('Failed to load changelogs for review tab', e);
      }
    };

    loadChangelogs();
    return () => { mounted = false; };
  }, [activeTab, projectTasks]);

  // Reload data when component comes back into focus (useful after creating a project)
  useEffect(() => {
    const handleFocus = () => {
      if (user?.user_id) {
        console.log('Window focused, reloading data...');
        loadData();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user?.user_id) {
        console.log('Page became visible, reloading data...');
        loadData();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.user_id, loadData]);

  // Auto-update project status when all tasks are completed
  const getTaskStats = useCallback((projectId: number) => {
    const tasks = projectTasks[projectId] || [];
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'Done').length;
    const inProgress = tasks.filter(task => task.status === 'In Progress').length;
    const todo = tasks.filter(task => task.status === 'Todo').length;
    console.log(`Project ${projectId} tasks:`, {
      total,
      completed,
      inProgress,
      todo,
      taskStatuses: tasks.map(t => ({ id: t.id, name: t.name, status: t.status }))
    });
    return { total, completed, inProgress, todo };
  }, [projectTasks]);

  const updateProjectStatusBasedOnTasks = useCallback(async (projectId: number) => {
    const { total, completed } = getTaskStats(projectId);
    if (total > 0 && completed === total) {
      try {
        await authApi.updateProject(projectId, { status: 'To Review' });
        loadData();
      } catch (error) {
        console.error('Failed to update project status:', error);
      }
    }
  }, [getTaskStats, loadData]);

  useEffect(() => {
    projects.forEach(project => {
      const { total, completed } = getTaskStats(project.id);
      if (total > 0 && completed === total && project.status === 'In Progress') {
        updateProjectStatusBasedOnTasks(project.id);
      }
    });
  }, [projectTasks, projects, getTaskStats, updateProjectStatusBasedOnTasks]);

  
  // Function to calculate progress percentage
  const getProjectProgress = (projectId: number) => {
    const { total, completed } = getTaskStats(projectId);
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  // Function to calculate progress segments for multi-color progress bar
  const getProgressSegments = (projectId: number) => {
    const { total, todo, inProgress, completed } = getTaskStats(projectId);
    if (total === 0) return { todoPercent: 100, inProgressPercent: 0, completedPercent: 0 };
    
    const segments = {
      completedPercent: Math.floor((completed / total) * 100),
      inProgressPercent: Math.floor((inProgress / total) * 100),
      todoPercent: Math.floor((todo / total) * 100)
    };

    // Ensure total adds up to 100% by adjusting the largest segment
    const currentTotal = segments.completedPercent + segments.inProgressPercent + segments.todoPercent;
    if (currentTotal < 100) {
      const diff = 100 - currentTotal;
      if (segments.todoPercent > 0) segments.todoPercent += diff;
      else if (segments.inProgressPercent > 0) segments.inProgressPercent += diff;
      else segments.completedPercent += diff;
    }
    
    console.log(`Project ${projectId} segments:`, segments);
    return segments;
  };

  // Function to auto-update project status based on task completion is defined above as `updateProjectStatusBasedOnTasks` (hook-safe)

  const handleCompleteProject = () => {
    if (completionDialog.projectId) {
      setProjects(prevProjects => 
        prevProjects.map((project: Project) => 
          project.id === completionDialog.projectId 
            ? { ...project, status: "Completed" }
            : project
        )
      );
      console.log(`Completing project ${completionDialog.projectId}`);
      setCompletionDialog({ open: false, projectId: null });
    }
  };

  const handleAddNote = () => {
    if (noteDialog.projectId && note.trim()) {
      console.log(`Adding note to project ${noteDialog.projectId}: ${note}`);
      setNote("");
      setNoteDialog({ open: false, projectId: null });
    }
  };

  // Determine project status based on task completion
  const getProjectStatus = (projectId: number) => {
    const { total } = getTaskStats(projectId);
    if (total === 0) return "No Tasks";
    const progress = getProjectProgress(projectId);
    if (progress === 100) return "To Review";
    return "In Progress"; // Changed from "Not Started" to "In Progress" as default
  };

  // Filter projects based on active tab, priority and date filters
  const getFilteredProjects = () => {
    // Start with base tab filter
    // Exclude archived projects so they are removed from main lists (including Completed)
    let base = projects.filter((project: Project) => {
      if ((project as any).archived === true) return false;
      switch (activeTab) {
        case "review":
          return getProjectProgress(project.id) === 100 && project.status !== "Completed";
        case "completed":
          return project.status === "Completed";
        default:
          return getProjectProgress(project.id) < 100 && project.status !== "Completed";
      }
    });

    // Helper: safely read project.priority (may be missing from API)
    const getProjectPriorityValue = (project: Project) => {
      const p = (project as unknown as { priority?: unknown }).priority;
      if (p === 'High' || p === 'Medium' || p === 'Low') return p as Priority;
      return getProjectPriority(project.id);
    };

    // Apply priority filter
    if (priorityFilter !== 'all') {
      base = base.filter((project: Project) => {
        const p = getProjectPriorityValue(project);
        return p === priorityFilter;
      });
    }

    // Date helpers for filtering
    const isSameDay = (isoA?: string, isoB?: string) => {
      if (!isoA || !isoB) return false;
      const a = new Date(isoA);
      const b = new Date(isoB);
      return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    };

    const isDueToday = (dueIso?: string) => {
      if (!dueIso) return false;
      return isSameDay(dueIso, new Date().toISOString());
    };

    const isDueThisWeek = (dueIso?: string) => {
      if (!dueIso) return false;
      const due = new Date(dueIso);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfWeek = new Date(startOfToday);
      endOfWeek.setDate(startOfToday.getDate() + 6);
      const d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      return d.getTime() >= startOfToday.getTime() && d.getTime() <= endOfWeek.getTime();
    };

    const isOverdue = (dueIso?: string) => {
      if (!dueIso) return false;
      const due = new Date(dueIso);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return due.getTime() < startOfToday.getTime();
    };

    // Helper: safely read due date string if present
    const getProjectDueIso = (project: Project): string | undefined => {
      const maybe = (project as unknown as Record<string, unknown>).due_date ?? (project as unknown as Record<string, unknown>).due;
      return typeof maybe === 'string' ? maybe : undefined;
    };

    // Apply date filter
    if (dateFilter !== 'any') {
      base = base.filter((project: Project) => {
        const due = getProjectDueIso(project);
        if (!due) return false;
        if (dateFilter === 'today') return isDueToday(due);
        if (dateFilter === 'this_week') return isDueThisWeek(due);
        if (dateFilter === 'overdue') return isOverdue(due);
        if (dateFilter === 'specific') {
          if (!specificDate) return false;
          // compare by day
          return isSameDay(due, new Date(specificDate).toISOString());
        }
        return true;
      });
    }

    return base;
  };

  const filteredProjects = getFilteredProjects();

  // Default priority for projects since API doesn't provide it
  // Local priority type matching Task.priority
  type Priority = 'High' | 'Medium' | 'Low';
  const getProjectPriority = (projectId: number): Priority => {
    const tasks = projectTasks[projectId] || [];
    if (tasks.some((t: Task) => t.priority === "High")) return "High";
    if (tasks.some((t: Task) => t.priority === "Medium")) return "Medium";
    return "Low";
  };

  const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  const sortedProjects = filteredProjects.sort((a: Project, b: Project) => {
    const aPriority = getProjectPriority(a.id);
    const bPriority = getProjectPriority(b.id);
    
    if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    }
  // Use project's due_date or createdAt as fallback
  const aDue = (a.due_date || (a as unknown as Record<string, unknown>).due || a.createdAt) as string | undefined;
  const bDue = (b.due_date || (b as unknown as Record<string, unknown>).due || b.createdAt) as string | undefined;
  return new Date(aDue || '2025-12-31').getTime() - new Date(bDue || '2025-12-31').getTime();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
  <nav className="w-full border-b bg-white dark:bg-gray-900 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between sticky top-14 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => changeTab("all")}
              aria-label="Projects"
              className={`flex items-center gap-2 text-sm sm:text-base font-bold transition-colors ${
                activeTab === "all" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="sm:hidden inline-flex items-center"><FolderOpen className="h-5 w-5" /></span>
              <span className="hidden sm:inline">Projects</span>
              <span className="hidden sm:inline"> ({projects.filter(p => getProjectProgress(p.id) < 100 && p.status !== "Completed").length})</span>
            </button>
            <button
              onClick={() => changeTab("review")}
              aria-label="Review"
              className={`flex items-center gap-2 text-sm sm:text-base font-bold transition-colors ${
                activeTab === "review" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="sm:hidden inline-flex items-center"><MessageSquareCode className="h-5 w-5" /></span>
              <span className="hidden sm:inline">Review</span>
              <span className="hidden sm:inline"> ({projects.filter(p => getProjectProgress(p.id) === 100 && p.status !== "Completed").length})</span>
            </button>
            <button
              onClick={() => changeTab("completed")}
              aria-label="Completed"
              className={`flex items-center gap-2 text-sm sm:text-base font-bold transition-colors ${
                activeTab === "completed" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <span className="sm:hidden inline-flex items-center"><CircleCheck className="h-5 w-5" /></span>
              <span className="hidden sm:inline">Completed</span>
              <span className="hidden sm:inline"> ({projects.filter(p => p.status === "Completed" && (p as any).archived !== true).length})</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              {/* use ghost variant to remove visible border and slightly larger icon */}
              <Button variant="ghost" size="icon" className="p-0" aria-label="Filters">
                <Funnel className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto max-w-[20rem] p-3">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date</div>
                  <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as 'any' | 'today' | 'this_week' | 'overdue')}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All dates" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This week</SelectItem>
                      <SelectItem value="overdue">Behind schedule</SelectItem>
                      <SelectItem value="specific">Specific date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Specific date picker (replaced native input with shadcn-style calendar picker) */}
                {dateFilter === 'specific' && (
                  <div className="pt-1">
                    <CalendarPicker value={specificDate} onChange={(iso) => setSpecificDate(iso)} />
                  </div>
                )}

                <div>
                  <div className="text-xs text-muted-foreground mb-1">Priority</div>
                  <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as 'all' | 'High' | 'Medium' | 'Low')}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="All priorities" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/dashboard/projects/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New Project</span>
              <span className="sm:hidden inline">Project</span>
            </Link>
          </Button>
        </div>
      </nav>

  <main className="p-4 sm:p-6">
        {sortedProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {sortedProjects.map((project) => (
              <div id={`project-${project.id}`} key={project.id} className="project-card relative bg-white dark:bg-gray-900 rounded-lg shadow p-3 sm:p-5 flex flex-col gap-2 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {project.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4 md:h-4 md:w-4" />
                        <span className="text-[10px] sm:text-xs"><ClientDate iso={project.due_date} options={{ month: 'short', day: 'numeric', year: 'numeric' }} showOverdueBadge={true} /></span>
                      </div>
                    ) : (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">No due date</span>
                    )}
                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 ${
                      project.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      project.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {/* Icon always visible; text label hidden on smallest screens and shown at >= sm */}
                      {project.priority === 'High' && <Flame className="inline h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" aria-hidden />}
                      {project.priority === 'Medium' && <Gauge className="inline h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" aria-hidden />}
                      {project.priority === 'Low' && <Leaf className="inline h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" aria-hidden />}
                      <span className="sr-only">Priority: {project.priority}</span>
                      <span className="hidden [@media(min-width:1499px)]:inline">{project.priority}</span>
                    </span>
                    <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full flex items-center gap-1 ${
                      project.status === "Completed" ? 'bg-green-100 text-green-700' :
                      getProjectStatus(project.id) === "To Review" ? 'bg-purple-100 text-purple-700' :
                      getProjectStatus(project.id) === "In Progress" ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {/* Status icon always visible; text label hidden on smallest screens and shown at >= sm */}
                      {project.status === "Completed" ? <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" /> :
                       getProjectStatus(project.id) === "To Review" ? <PlayCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" /> :
                       getProjectStatus(project.id) === "In Progress" ? <Rocket className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" /> :
                       <ClockAlert className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />}
                      <span className="sr-only">{project.status === "Completed" ? "Completed" : getProjectStatus(project.id)}</span>
                      <span className="hidden [@media(min-width:1499px)]:inline">{project.status === "Completed" ? "Completed" : getProjectStatus(project.id)}</span>
                    </span>
                    
                  </div>
                  {/* Right-side controls: archive (shows pointer) and other actions */}
                  <div className="flex items-center justify-end gap-2">
                    {(project.status === 'Completed' && !(project as any).archived) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmTargetId(project.id); setConfirmArchiveOpen(true); }}
                        title="Archive project"
                        className="p-1 rounded hover:bg-muted/5 text-muted-foreground cursor-pointer"
                        aria-label="Archive project"
                      >
                        <ArchiveX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {activeTab === "all" && (
                    <div onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="outline" className="ml-2" asChild>
                            <Link href={`/dashboard/projects/${project.id}/edit`} aria-label="Edit Project">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                              </svg>
                            </Link>
                          </Button>
                          {/* archive control moved inline after status pill */}
                        </div>
                    </div>
                  )}
                </div>
                <Link 
                  href={
                    activeTab === "review" 
                      ? `/dashboard/review?projectId=${project.id}` 
                      : activeTab === "completed" 
                        ? `/dashboard/completed/${project.id}` 
                        : `/dashboard/projects/${project.id}`
                  } 
                  className="cursor-pointer flex flex-col flex-1"
                >
                  <h2 className="text-sm sm:text-lg font-bold mb-1 truncate hover:text-primary transition-colors">
                    {project.name || 'Unnamed Project'}
                  </h2>
                  <p className="text-[12px] sm:text-sm text-muted-foreground mb-3 truncate">
                    {project.description || 'No description'}
                  </p>
                  
                  {/* Enhanced Multi-Segment Progress Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Task Progress</span>
                      <span className="text-xs font-medium">{getTaskStats(project.id).completed} of {getTaskStats(project.id).total} tasks</span>
                    </div>
                    
                    {/* Multi-Segment Progress Bar */}
                    {getTaskStats(project.id).total > 0 ? (
                      <div className="relative">
                        {/* Background container */}
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          {/* Progress segments - ordered: Todo (Gray), In Progress (Blue), Completed (Green) */}
                          <div className="flex h-full w-full">
                            {/* Todo (Gray) - always left */}
                            <div 
                              className="bg-gray-400 transition-all duration-500 ease-out"
                              style={{ width: `${getProgressSegments(project.id).todoPercent}%` }}
                            ></div>
                            {/* In Progress (Blue) - always middle */}
                            <div 
                              className="bg-blue-400 transition-all duration-500 ease-out"
                              style={{ width: `${getProgressSegments(project.id).inProgressPercent}%` }}
                            ></div>
                            {/* Completed (Green) - always right */}
                            <div 
                              className="bg-green-400 transition-all duration-500 ease-out"
                              style={{ width: `${getProgressSegments(project.id).completedPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        {/* Progress percentage overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-black drop-shadow-sm">
                            {getProjectProgress(project.id)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-200 rounded-full h-3 flex items-center justify-center">
                        <span className="text-xs text-gray-700">No tasks</span>
                      </div>
                    )}

                    {/* Task Breakdown Legend */}
                    {getTaskStats(project.id).total > 0 && (
                      <div className="flex gap-4 text-xs mt-2">
                                                <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                          <span className="font-medium text-gray-600">{getTaskStats(project.id).todo} Todo</span>
                        </div>
                                                <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                          <span className="font-medium text-blue-700">{getTaskStats(project.id).inProgress} In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="font-medium text-green-700">{getTaskStats(project.id).completed} Done</span>
                        </div>


                      </div>
                    )}

                  </div>
                </Link>
                
                {/* Tasks Dropdown */}
                <details className="w-full" onClick={(e) => e.stopPropagation()} onToggle={(e) => handleDetailsToggle(project.id, e)}>
                  <summary className="flex items-center justify-between cursor-pointer text-sm mb-2">
                    <span className="font-medium">Tasks ({getTaskStats(project.id).total})</span>
          <ChevronDown className={`h-4 w-4 transform transition-transform duration-150 ${detailsOpenMap[project.id] ? 'rotate-0' : '-rotate-90'}`} />
                  </summary>
                  <ul className="space-y-1">
                    {(projectTasks[project.id] || []).length > 0 ? (
                      (projectTasks[project.id] || []).map((task: Task) => (
                        <li key={task.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              task.status === 'Done' ? 'bg-green-400' : 
                              task.status === 'In Progress' ? 'bg-blue-400' : 
                              'bg-gray-400'
                            }`}></span>
                            <span className={`truncate ${task.status === 'Done' ? 'text-muted-foreground' : ''}`}>
                              {task.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1 py-0.5 rounded text-white font-medium ${
                              task.priority === 'High' ? 'bg-red-100' : 
                              task.priority === 'Medium' ? 'bg-yellow-100' :
                              'bg-gray-200'
                            }`}>
                            {task.priority === 'High' && <Flame className="inline h-3 w-3 text-red-700" aria-hidden />}
                            {task.priority === 'Medium' && <Gauge className="inline h-3 w-3 text-yellow-700" aria-hidden />}
                            {task.priority === 'Low' && <Leaf className="inline h-3 w-3 text-gray-700" aria-hidden />}
                            </span>
                            {task.assignee && (
                              <span className="flex items-center text-muted-foreground">
                                <User className="h-3 w-3" aria-hidden />
                                <span className="truncate gap-1"> {task.assignee}</span>
                              </span>
                            )}
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" aria-hidden />
                                <span>{new Date(task.due_date).toLocaleDateString('en-US',{ month:'short', day: 'numeric' })}</span>
                              </span>
                            )}
                            {/* Review status icon */}
                            {activeTab === 'review' && (
                              (() => {
                                const info = taskChangeMap[task.id];
                                // If there is no changelog/status, show a pending feedback indicator
                                if (!info || !info.new_status) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-blue-700 cursor-pointer" aria-hidden>
                                          <Clock className="h-4 w-4 hover:scale-105 transition-transform" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <div className="text-xs">Pending feedback</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }
                                const ns = (info.new_status || '').toLowerCase();
                                if (ns.includes('request')) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          role="img"
                                          aria-label={info.remark ? `Changes requested: ${info.remark}` : 'Changes are requested'}
                                          className="text-red-700 cursor-pointer"
                                        >
                                          <XCircle className="h-4 w-4 hover:scale-105 transition-transform" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <div className="text-xs">Changes are requested, Check on the review section.</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }

                                // On hold -> Orange
                                if (ns.includes('hold')) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-orange-400 cursor-pointer">
                                          <Pause className="h-4 w-4 hover:scale-105 transition-transform" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <div className="text-xs">Task on hold</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }

                                // Approved / completed
                                if (ns.includes('completed') || ns.includes('approved') || ns.includes('approve')) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-green-700 cursor-pointer">
                                          <CheckCircle className="h-4 w-4 hover:scale-105 transition-transform" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <div className="text-xs">Task approved</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                }
                                return null;
                              })()
                            )}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-muted-foreground p-2 bg-gray-50 dark:bg-gray-800 rounded text-center">
                        No tasks yet
                      </li>
                    )}
                  </ul>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <List className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              No projects found
            </h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "completed" && "No projects have been completed yet."}
              {activeTab === "all" && "Create your first project to get started."}
              {activeTab === "review" && "No projects are ready for review yet."}
            </p>
          </div>
        )}
      </main>
      {/* Archive Dialog (uses shared Dialog components) */}
      <Dialog open={archiveDialogOpen} onOpenChange={(open) => setArchiveDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archived Projects</DialogTitle>
            <div className="text-sm text-muted-foreground">Only completed projects can be archived. You can restore them here.</div>
          </DialogHeader>

          <div className="mt-2 max-h-[60vh] overflow-auto">
            {archivedProjects.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-8">No archived projects</div>
            ) : (
              <div className="space-y-4">
                {archivedProjects.map(p => (
                  <div key={p.id} className={`p-3 bg-gray-50 dark:bg-gray-800 rounded transition-all duration-500 ease-out ${unarchivingMap[p.id] ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{p.name}</h4>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <CalendarCheck className="h-4 w-4" />
                          <span>{(p as any).archived_at ? new Date((p as any).archived_at).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </div>
                      <div>
                        <Button asChild>
                          <button onClick={() => {
                            // animate then unarchive (persisted)
                            setUnarchivingMap(m => ({ ...m, [p.id]: true }));
                            setTimeout(() => {
                              void unarchiveProject(p.id);
                              setUnarchivingMap(m => { const nm = { ...m }; delete nm[p.id]; return nm; });
                            }, 500);
                          }} className="flex items-center gap-2 font-semibold">
                            <Undo2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Unarchive</span>
                          </button>
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-2">{p.description}</p>

                    <details className="mt-3" open={!!detailsOpenMap[p.id]} onToggle={(e) => setDetailsOpenMap(prev => ({ ...prev, [p.id]: (e.target as HTMLDetailsElement).open }))}>
                      <summary className="flex items-center justify-between cursor-pointer text-sm">
                        <span className="font-medium">Tasks</span>
                        <ChevronDown className={`h-4 w-4 transform transition-transform ${detailsOpenMap[p.id] ? 'rotate-180' : ''}`} />
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {(projectTasks[p.id] || []).length === 0 ? (
                          <li className="text-muted-foreground">No tasks</li>
                        ) : (
                          (projectTasks[p.id] || []).map(t => (
                            <li key={t.id} className="flex items-center justify-between">
                              <span>{t.name}</span>
                              <span className="text-muted-foreground text-xs">{t.status}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex justify-end w-full">
              <Button variant="ghost" className="font-semibold" onClick={() => setArchiveDialogOpen(false)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Archive Dialog (using shared Dialog components) */}
      <Dialog open={confirmArchiveOpen} onOpenChange={(open) => { if (!open) { setConfirmArchiveOpen(false); setConfirmTargetId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Archive</DialogTitle>
            <DialogDescription>Only completed projects can be archived. You can restore it later from the Archive.</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">Are you sure you want to archive this project?</p>
          </div>
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="ghost" className="font-semibold" onClick={() => { setConfirmArchiveOpen(false); setConfirmTargetId(null); }}>Cancel</Button>
              <Button className="bg-red-600 text-white font-semibold" onClick={() => confirmArchive()}>Archive</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draggable FAB for Archives */}
      <button
        aria-label="Open archived projects"
        onClick={() => { if (!suppressClickRef.current) setArchiveDialogOpen(true); }}
        onPointerDown={(e) => {
          try {
            draggingRef.current.active = true;
            draggingStateRef.current = true; // disable transitions while dragging
            setIsDragging(true);
            const pe = e as unknown as PointerEvent;
            draggingRef.current.startX = pe.clientX;
            draggingRef.current.startY = pe.clientY;
            draggingRef.current.origX = fabPos.x;
            draggingRef.current.origY = fabPos.y;
          } catch (_err) {}
        }}
        // position using transform for smoother GPU-accelerated animation
        style={{ transform: `translate3d(${fabPos.x}px, ${fabPos.y}px, 0)`, left: 0, top: 0 }}
        className={
          `fixed z-50 bg-primary text-white rounded-full p-3 shadow-lg hover:shadow-2xl focus:outline-none` +
          (isDragging ? ' transition-none' : ' transition-all duration-300 ease-out')
        }
      >
        <Archive className="h-5 w-5" />
      </button>
    </div>
  );
}
