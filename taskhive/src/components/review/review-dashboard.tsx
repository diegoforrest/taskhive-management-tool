"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Pause, MessageSquare, Calendar, User, ArrowLeft, Flame, Gauge, Leaf, PlayCircle, Funnel, Plus } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { tasksApi, Task, authApi, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from 'react-hot-toast';

// Type definitions for Review System
type ReviewAction = 'approve' | 'request_changes' | 'hold_discussion';
type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'on_hold';
type ReviewType = 'code_review' | 'design_review' | 'content_review' | 'qa_review' | 'general_review';

interface ReviewNote {
  id: string;
  taskId: number;
  reviewerId: string;
  reviewerName: string;
  action: ReviewAction;
  reviewType: ReviewType;
  notes: string;
  changeDetails?: string;
  timestamp: string;
}

interface TaskWithReviews {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  contents?: string;
  type?: 'task' | 'project';
  status?: 'Todo' | 'In Progress' | 'Done' | 'Completed' | 'On Hold' | 'Request Changes';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  dueDate?: string;
  due_date?: string;
  assignee?: string;
  progress?: number;
  projectId?: number;
  projectTitle?: string;
  reviewNotes?: ReviewNote[];
  lastReviewAction?: ReviewAction;
  reviewStatus?: ReviewStatus;
  needsReview?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Type for changelog entries returned by backend
interface ChangeLogEntry {
  id: number;
  description?: string;
  old_status?: string;
  new_status?: string;
  remark?: string;
  user_id?: number;
  project_id?: number;
  task_id?: number;
  createdAt?: string;
}

// Helper to safely extract arrays from varied API response shapes
const extractDataArray = <T,>(res: unknown): T[] => {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    const r = res as Record<string, unknown>;
    const maybe = r['data'];
    return Array.isArray(maybe) ? (maybe as T[]) : [];
  }
  return Array.isArray(res) ? (res as T[]) : [];
};

// Map backend changelogs to UI review data with robust parsing for structured remark format
  const mapChangelogsToReview = (rows: ChangeLogEntry[], currentUser?: any) => {
  const deriveReviewerName = (r: ChangeLogEntry) => {
    // If the changelog provides a user id but no name, try to use the current user's first name
    if (r.user_id && currentUser) {
      try {
        const maybeName = (currentUser as Record<string, any>).firstName || (currentUser as Record<string, any>).name || (currentUser as Record<string, any>).email;
        if (typeof maybeName === 'string' && maybeName.trim().length > 0) {
          // If email was used, take the part before @ as a fallback
          if (maybeName.includes('@')) return maybeName.split('@')[0];
          return maybeName.split(' ')[0];
        }
      } catch {
        // ignore and fallback
      }
    }

    // If changelog has no user info, mark as System
    return r.user_id ? String(r.user_id) : 'System';
  };

  const parseRemark = (r: ChangeLogEntry) => {
    const raw = (r.remark || r.description || '') as string;
    let parsedNotes = '';
    let parsedChangeDetails: string | undefined = undefined;

    if (!raw || raw.trim().length === 0) return { parsedNotes: '', parsedChangeDetails };

    // Try JSON structured format first: { notes: string, changes?: string }
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        if (typeof obj.notes === 'string') parsedNotes = obj.notes;
        if (typeof obj.changes === 'string' && obj.changes.trim().length > 0) parsedChangeDetails = obj.changes;
        return { parsedNotes: parsedNotes || '', parsedChangeDetails };
      }
    } catch {
      // not JSON -> continue to legacy parsing
    }

    // Legacy plain text parsing: split on common separators
    const separators = [' - Changes needed:', ' - Changes needed', '\nChanges Required:', '\nChanges Required', 'Changes Required:', 'Changes required:', ' - Requested changes:'];
    for (const sep of separators) {
      const idx = raw.indexOf(sep);
      if (idx !== -1) {
        parsedNotes = raw.slice(0, idx).trim();
        parsedChangeDetails = raw.slice(idx + sep.length).trim();
        return { parsedNotes, parsedChangeDetails };
      }
    }

    // Fallback: whole raw text is notes
    parsedNotes = raw;
    return { parsedNotes, parsedChangeDetails };
  };

  const notes: ReviewNote[] = rows.map((r) => {
    const { parsedNotes, parsedChangeDetails } = parseRemark(r as ChangeLogEntry);
    return {
      id: String(r.id),
      taskId: r.task_id || 0,
      reviewerId: String(r.user_id || 'system'),
      reviewerName: deriveReviewerName(r),
      action: (r.new_status || '').toLowerCase().includes('request') ? 'request_changes' :
             (r.new_status || '').toLowerCase().includes('hold') ? 'hold_discussion' : 'approve',
      reviewType: 'general_review',
      notes: parsedNotes || '',
      changeDetails: parsedChangeDetails || undefined,
      timestamp: r.createdAt || new Date().toISOString()
    } as ReviewNote;
  });

  // Determine latest status from newest createdAt
  let latest: ChangeLogEntry | undefined;
  if (rows.length > 0) {
    latest = rows.slice().sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())[0];
  }

  let reviewStatus: ReviewStatus = 'pending';
  let needsReview = true;
  let lastReviewAction: ReviewAction | undefined = undefined;

  if (latest && latest.new_status) {
    const ns = (latest.new_status || '').toLowerCase().trim();
    if (ns === 'request changes') {
      reviewStatus = 'changes_requested';
      needsReview = true;
      lastReviewAction = 'request_changes';
    } else if (ns === 'on hold') {
      reviewStatus = 'on_hold';
      needsReview = true;
      lastReviewAction = 'hold_discussion';
    } else if (ns === 'completed' || ns === 'done') {
      // Check if this was a review approval vs normal completion
      const description = latest.description || '';
      if (description.toLowerCase().includes('review approved') || description.toLowerCase().includes('approved:')) {
        reviewStatus = 'approved';
        needsReview = false;
        lastReviewAction = 'approve';
      } else {
        // Regular completion, still needs review
        reviewStatus = 'pending';
        needsReview = true;
      }
    } else {
      reviewStatus = 'pending';
      needsReview = true;
    }
  }

  return { notes, reviewStatus, needsReview, lastReviewAction };
};

const reviewActionConfig = {
  approve: {
    label: 'Approve & Complete',
    icon: CheckCircle,
    color: '!bg-green-500 hover:bg-green-600',
    textColor: '!text-green-700',
    fontColor: '!text-green-700',
    bgColor: '!bg-green-100'
  },
  request_changes: {
    label: 'Request Changes',
    icon: XCircle,
    color: '!bg-red-500 hover:bg-red-600',
    textColor: '!text-red-700',
    fontColor: '!text-red-700',
    bgColor: '!bg-red-100'
  },
  hold_discussion: {
    label: 'Hold for Discussion',
    icon: Pause,
    color: '!bg-orange-500 hover:bg-orange-600',
    textColor: '!text-orange-400',
    fontColor: '!text-orange-400',
    bgColor: '!bg-orange-100'
  }
};

const reviewStatusConfig = {
  pending: { label: 'Pending Review', color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700' },
  changes_requested: { label: 'Changes Requested', color: 'bg-red-100 text-red-700' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-500' }
};

interface ReviewDashboardProps {
  reviewProjects?: (Project & { tasks?: Task[] })[];
}

export default function ReviewDashboard({ reviewProjects = [] }: ReviewDashboardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [tasksForReview, setTasksForReview] = useState<TaskWithReviews[]>([]);
  // Separate selection for review vs history so each opens its own dialog independently
  const [selectedTaskForReview, setSelectedTaskForReview] = useState<TaskWithReviews | null>(null);
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<TaskWithReviews | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [changeDetails, setChangeDetails] = useState('');
  const [selectedAction, setSelectedAction] = useState<ReviewAction>('approve');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // using react-hot-toast for toasts
  const [currentHistory, setCurrentHistory] = useState<ReviewNote[]>([]);
  // Prevent dialogs from reopening during the refresh that happens after submitting feedback
  const [suppressDialogOpen, setSuppressDialogOpen] = useState(false);
  // remember which task we just submitted feedback for to avoid reopening its dialog
  const justSubmittedRef = useRef<number | null>(null);

  // Show a loading toast while redirecting (replaces the old overlay)
  const redirectToastId = useRef<string | null>(null);
  useEffect(() => {
    if (redirecting) {
      const id = toast.loading('Approving project, please wait...');
      redirectToastId.current = String(id);
    } else {
      if (redirectToastId.current) {
        try { toast.dismiss(redirectToastId.current as string | undefined); } catch {}
        redirectToastId.current = null;
      }
    }

    return () => {
      if (redirectToastId.current) {
        try { toast.dismiss(redirectToastId.current as string | undefined); } catch {}
        redirectToastId.current = null;
      }
    };
  }, [redirecting]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'pending' | 'changes_requested' | 'on_hold'>('all');
  

  // Load tasks that need review - always from backend with persistence
  const loadTasksForReview = async (): Promise<TaskWithReviews[]> => {
    setLoading(true);
    try {
      const extractUserId = (u: unknown): number | null => {
        if (!u || typeof u !== 'object') return null;
        const obj = u as Record<string, unknown>;
        if (typeof obj.user_id === 'number') return obj.user_id;
        if (typeof obj.userId === 'number') return obj.userId;
        if (typeof obj.id === 'number') return obj.id;
        return null;
      };

      const currentUserId = extractUserId(user) ?? 1;

      // Determine which projects to load from
      let projectsToLoad: Project[] = [];
      
      if (reviewProjects && reviewProjects.length > 0) {
        // Use the specific projects passed to this component
        projectsToLoad = reviewProjects;
      } else {
        // Load all projects for the user
        const projectsRes = await authApi.getProjects(currentUserId);
        projectsToLoad = extractDataArray<Project>(projectsRes);
      }

      const allowedProjectIds = projectsToLoad.map(p => p.id);
      const tasksAcc: TaskWithReviews[] = [];

      // Fetch tasks for each project
      for (const p of projectsToLoad) {
        try {
          const tasksRes = await authApi.getTasks(p.id);
          const projectTasks: Task[] = extractDataArray<Task>(tasksRes);

          // Process each task
          for (const task of projectTasks) {
            const statusVal = (task.status || '').toString().toLowerCase();
            // Include Done/Completed tasks plus those that might have review statuses
            const statusIsReviewable = statusVal === 'done' || 
                                     statusVal === 'completed' || 
                                     statusVal.includes('hold') || 
                                     statusVal.includes('request');
            
            if (!statusIsReviewable) continue;

            // Always load persisted changelogs from database
            let reviewNotes: ReviewNote[] = [];
            let reviewStatus: ReviewStatus = 'pending';
            let needsReview = true;
            let lastReviewAction: ReviewAction | undefined = undefined;
            
            try {
              const res = await tasksApi.getChangelogs(task.id);
              const rows = extractDataArray<ChangeLogEntry>(res);
              
              if (rows.length > 0) {
                const mapped = mapChangelogsToReview(rows, user);
                reviewNotes = mapped.notes;
                reviewStatus = mapped.reviewStatus;
                needsReview = mapped.needsReview;
                lastReviewAction = mapped.lastReviewAction;
              }
            } catch {
              console.warn('Failed to fetch changelogs for task', task.id);
              // Keep default values if changelog fetch fails
            }

            tasksAcc.push({
              id: Number(task.id),
              title: task.name,
              description: task.contents || task.description,
              type: 'task',
              status: task.status as TaskWithReviews['status'],
              priority: (task.priority as Task['priority']) || 'Medium',
              projectId: Number(p.id),
              projectTitle: p.name || 'Unknown Project',
              reviewNotes,
              lastReviewAction,
              reviewStatus,
              needsReview,
              dueDate: (task.due_date || task.dueDate) as string | undefined
            } as TaskWithReviews);
          }
        } catch {
          console.warn('Failed to fetch tasks for project', p.id);
        }
      }

      // Filter tasks to only include those from allowed projects
      const filteredTasks = tasksAcc.filter(task => 
        allowedProjectIds.includes(task.projectId!)
      );

      setTasksForReview(filteredTasks);
      return filteredTasks;
    } catch (error) {
      console.error('Failed to load tasks for review:', error);
      setTasksForReview([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when reviewProjects change
  useEffect(() => {
    loadTasksForReview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewProjects, user]);

  const handleReviewSubmit = async () => {
    const target = selectedTaskForReview;
    if (!target || !reviewNotes.trim()) return;
  // remember the task and suppress re-opening dialog while we submit and refresh
  justSubmittedRef.current = target.id;
  setSuppressDialogOpen(true);
    setSubmitting(true);
    try {
      // Create appropriate changelog based on selected action
      if (selectedAction === 'request_changes') {
        await tasksApi.createChangelog(
          target.id,
          target.status || 'Done',
          'Request Changes',
          `Feedback: ${reviewNotes.trim()}${changeDetails ? ` - Changes needed: ${changeDetails}` : ''}`,
          target.projectId,
          Number(user?.user_id ?? 1)
        );
      } else if (selectedAction === 'approve') {
        await tasksApi.createChangelog(
          target.id,
          target.status || 'Done',
          'Completed',
          `Review approved: ${reviewNotes.trim()}`,
          target.projectId,
          Number(user?.user_id ?? 1)
        );
      } else if (selectedAction === 'hold_discussion') {
        await tasksApi.createChangelog(
          target.id,
          target.status || 'Done',
          'On Hold',
          `Held for discussion: ${reviewNotes.trim()}`,
          target.projectId,
          Number(user?.user_id ?? 1)
        );
      }

      // Refresh the task list and history for the opened task
      await loadTasksForReview();
      try {
        const res = await tasksApi.getChangelogs(target.id);
        const rows = extractDataArray<ChangeLogEntry>(res);
        const mapped = mapChangelogsToReview(rows, user);
        setCurrentHistory(mapped.notes.map(n => ({ ...n, taskId: n.taskId || target.id })));
      } catch {
        // ignore refresh errors
      }

      toast.success('Feedback Added');

  // Reset inputs and close dialog
      setReviewNotes('');
      setChangeDetails('');
      setSelectedAction('approve');
      setSelectedTaskForReview(null);
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmitting(false);
      // allow a short grace period before re-enabling dialog openings to avoid flicker
      setTimeout(() => {
        setSuppressDialogOpen(false);
        justSubmittedRef.current = null;
      }, 700);
    }
  };
  const handleProjectApproval = async (projectId: number): Promise<boolean> => {
    try {
      console.log(`Approving entire project ${projectId}`);
      
      const projectTasks = tasksForReview.filter(task => task.projectId === projectId);

      // Update task statuses (if needed) but avoid creating per-task changelogs to prevent duplicate project-level notes
      for (const task of projectTasks) {
        try {
          // Update each task status to Done (backend may emit its own changelog; we still only add one project-level entry below)
          await tasksApi.updateTaskStatus(task.id, 'Done');
        } catch {
          console.warn('Failed to update task status during project approval', task.id);
        }
      }

      // Create a single project-level changelog entry to record the approval (task_id set to 0 to indicate project-level)
      try {
        // derive approver name (first + last) with sensible fallbacks
        const approverName = (() => {
          try {
            const u = user as unknown as Record<string, any> | undefined;
            if (!u) return `User ${user?.user_id ?? ''}`;
            const first = u.firstName || u.first_name || (typeof u.name === 'string' ? u.name.split(' ')[0] : undefined);
            const last = u.lastName || u.last_name || (typeof u.name === 'string' ? u.name.split(' ').slice(1).join(' ') : undefined);
            if (first && last) return `${first} ${last}`;
            if (u.name && typeof u.name === 'string') return u.name;
            if (u.email && typeof u.email === 'string') return u.email.split('@')[0];
            if (u.user_id || u.id) return `User ${u.user_id ?? u.id}`;
            return 'User';
          } catch {
            return 'User';
          }
        })();

        await tasksApi.createChangelog(
          0,
          'Done',
          'Completed',
          `Project approved by ${approverName}`,
          projectId,
          Number(user?.user_id ?? 1)
        );
      } catch {
        console.warn('Failed to create project-level changelog during approval');
      }

      // Mark the project status as Completed in the backend
      try {
  await authApi.updateProject(projectId, { status: 'Completed' });
  toast.success('Project approved and marked Completed');
      } catch {
        console.warn('Failed to update project status to Completed', projectId);
        toast.error('Failed to update project status');
        return false;
      }

      // Refresh the data to reflect changes
      await loadTasksForReview();
      return true;
    } catch (error) {
      console.error('Failed to approve project:', error);
      toast.error('Failed to approve project');
      return false;
    }
  };

  // When a task is opened in the dialog, load its persisted changelogs
  // Load changelogs when either the history dialog or the review dialog opens so the UI shows current data
  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      const task = selectedTaskForHistory ?? selectedTaskForReview;
      if (!task) {
        setCurrentHistory([]);
        return;
      }

      try {
        const res = await tasksApi.getChangelogs(task.id);
        const rows = extractDataArray<ChangeLogEntry>(res);
        const mapped = mapChangelogsToReview(rows, user);
        if (!mounted) return;
        setCurrentHistory(mapped.notes.map(n => ({ ...n, taskId: n.taskId || task.id })));
      } catch {
        console.warn('Failed to load task history:');
        if (mounted) setCurrentHistory([]);
      }
    };

    loadHistory();

    return () => { mounted = false; };
  }, [selectedTaskForHistory, selectedTaskForReview, user]);

  // Dropdown open/close handled by Radix DropdownMenu component

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
  month: 'short',
  day: 'numeric',
  year: 'numeric'
    });
  };


  // toasts are handled by react-hot-toast globally

  // no-op: keep `redirecting` only to drive the UI overlay

  const getReviewStats = () => {
    const pending = tasksForReview.filter(task => task.reviewStatus === 'pending' || !task.reviewStatus).length;
    const approved = tasksForReview.filter(task => task.reviewStatus === 'approved').length;
    const changesRequested = tasksForReview.filter(task => task.reviewStatus === 'changes_requested').length;
    const onHold = tasksForReview.filter(task => task.reviewStatus === 'on_hold').length;

    return { pending, approved, changesRequested, onHold };
  };

  const getFilteredTasks = () => {
    switch (reviewFilter) {
      case 'approved':
        return tasksForReview.filter(task => task.reviewStatus === 'approved');
      case 'pending':
        return tasksForReview.filter(task => task.reviewStatus === 'pending' || !task.reviewStatus);
      case 'changes_requested':
        return tasksForReview.filter(task => task.reviewStatus === 'changes_requested');
      case 'on_hold':
        return tasksForReview.filter(task => task.reviewStatus === 'on_hold');
      default:
        return tasksForReview;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading review dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = getReviewStats();
  const filteredTasks = getFilteredTasks();
  
  // For project-specific reviews, use the single project passed via `reviewProjects`
  const currentProject = (reviewProjects && reviewProjects.length === 1) ? reviewProjects[0] : null;
  const getProjectString = (proj: (Project & { tasks?: Task[] }) | null, keys: string[]) => {
    if (!proj) return null;
    for (const k of keys) {
      const val = (proj as unknown as Record<string, unknown>)[k];
      if (typeof val === 'string' && val.trim().length > 0) return val;
    }
    return null;
  };
  const isProjectSpecific = !!currentProject;

  const currentProjectTitle = currentProject
    ? getProjectString(currentProject, ['name', 'title', 'project_name', 'projectName']) || 'Untitled Project'
    : null;
  const currentProjectDescription = currentProject
    ? getProjectString(currentProject, ['description', 'desc', 'contents', 'summary']) || ''
    : null;

  // For project approval: only allow approving the project when all tasks in that project are approved
  const projectTasks = currentProject ? tasksForReview.filter(t => t.projectId === currentProject.id) : [];
  const allProjectApproved = projectTasks.length > 0 && projectTasks.every(t => t.reviewStatus === 'approved');

  return (
    <div className="min-h-screen bg-background">
      {/* Review Header */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
  <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            
            {isProjectSpecific && currentProject ? (
              <>
                {/* keep title+date together on a single inline row and prevent them from shrinking so badges take truncation priority */}
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <h1 className="text-sm [@media(min-width:769px) and (max-width:1080px)]:text-base lg:text-2xl font-semibold truncate">Review Hive</h1>

                  {/* small separator */}
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted-foreground opacity-40" aria-hidden></span>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Calendar className="h-3 w-3 [@media(min-width:769px) and (max-width:1080px)]:h-4 [@media(min-width:769px) and (max-width:1080px)]:w-4 lg:h-4 lg:w-4" />
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline text-muted-foreground">Due:</span>
                    {
                      (() => {
                        const pd = getProjectString(currentProject, ['due', 'dueDate', 'due_date']);
                        return (
                          <span className="font-xs">{pd ? formatReviewDate(pd) : 'No due date'}</span>
                        );
                      })()
                    }
                  </div>
                </div>

                {/* badges live in a separate container that can shrink and truncate when space is tight */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 max-w-[7rem] overflow-hidden truncate shrink ${
                    currentProject.priority === 'High' ? 'bg-red-100 text-red-700' : 
                    currentProject.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {currentProject.priority === 'High' && <Flame className="inline h-3 w-3" aria-hidden />}
                    {currentProject.priority === 'Medium' && <Gauge className="inline h-3 w-3" aria-hidden />}
                    {currentProject.priority === 'Low' && <Leaf className="inline h-3 w-3" aria-hidden />}
                    {/* label hidden on xs, visible from sm+; sr-only for xs */}
                    <span className="hidden sm:inline truncate">{currentProject.priority}</span>
                    <span className="sr-only sm:hidden">Priority: {currentProject.priority}</span>
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-purple-100 text-purple-700 max-w-[6rem] overflow-hidden truncate shrink">
                    <PlayCircle className="h-3 w-3" />
                    <span className="hidden sm:inline truncate">To Review</span>
                    <span className="sr-only sm:hidden">To Review</span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-base [@media(min-width:769px) and (max-width:1080px)]:text-2xl lg:text-3xl font-bold">Review Hive</h1>
                <div className="flex items-center gap-2 text-sm truncate">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-blue-100 text-blue-700">
                      <CheckCircle className="h-3 w-3" />
                      {/* show full label from sm+, sr-only on xs */}
                      <span className="hidden sm:inline [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Team Review Center</span>
                      <span className="sr-only sm:hidden">Team Review Center</span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Approve Project button */}
          <div className="flex-shrink-0">
            {isProjectSpecific && currentProject && (
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className={`${allProjectApproved ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'} px-2 py-1 text-xs`}
                    disabled={submitting || !allProjectApproved}
                    title={allProjectApproved ? 'Approve this project' : 'All tasks must be approved before approving the project'}
                  >
                    <CheckCircle className="h-4 w-4 [@media(min-width:769px) and (max-width:1080px)]:mr-2.5 lg:mr-2.5" />
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Approve Project</span>
                    {/* icon-only on xs/md; full label appears at lg+ */}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirm Project Approval</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to approve this project and mark it as Completed? This will update all visible tasks and set the project status to Completed.</p>
                    <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={async () => {
                      // keep the dialog open while approval runs
                      setSubmitting(true);
                      try {
                        const ok = await handleProjectApproval(currentProject.id);
                        if (ok) {
                          // begin redirect flow and then close the dialog once the approval finished
                          setRedirecting(true);
                          setConfirmOpen(false);
                          setTimeout(() => {
                            try {
                              router.replace(`/dashboard/completed/${currentProject.id}`);
                            } catch (navErr) {
                              console.warn('Failed to navigate after approval', navErr);
                              setRedirecting(false);
                            }
                          }, 450);
                        }
                      } finally {
                        setSubmitting(false);
                      }
                    }} disabled={submitting}>
                      {submitting ? 'Approving project...' : 'Confirm Approve'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
  <div className="space-y-6 p-4 lg:p-6 relative">
        {/* redirecting overlay removed - using toast for feedback instead */}
        {/* Page Header */}
        <div>
          {isProjectSpecific && currentProject ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight">{currentProjectTitle}</h1>
              <p className="text-muted-foreground">
                {currentProjectDescription || 'Review all completed tasks for this project and provide team feedback'}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">TaskHive Loading Data</h1>
              <p className="text-muted-foreground">
                TaskHive Loading Data
              </p>
            </>
          )}
        </div>

        {/* Stats Cards */}
  <div className="grid grid-cols-2 sm:grid-cols-2 [@media(min-width:769px) and (max-width:1080px)]:grid-cols-4 lg:grid-cols-4 gap-2">
          <Card className={`cursor-pointer transition-all ${reviewFilter === 'pending' ? 'ring-2 ring-blue-700' : 'hover:shadow-md'}`} 
                onClick={() => setReviewFilter('pending')}>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-700" />
                <div className="truncate">
                  <p className="text-xs text-muted-foreground [@media(min-width:769px) and (max-width:1080px)]:text-sm lg:text-sm">
                    <span className="inline [@media(min-width:769px) and (max-width:1080px)]:hidden lg:hidden">Pending</span>
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Pending Review</span>
                  </p>
                  <p className="text-sm [@media(min-width:769px) and (max-width:1080px)]:text-2xl font-bold text-blue-700 truncate lg:text-2xl">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'approved' ? 'ring-2 ring-green-700' : 'hover:shadow-md'}`} onClick={() => setReviewFilter('approved')}>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-700" />
                <div className="truncate">
                  <p className="text-xs text-muted-foreground [@media(min-width:769px) and (max-width:1080px)]:text-sm lg:text-sm">
                    <span className="inline [@media(min-width:769px) and (max-width:1080px)]:hidden lg:hidden">Approved</span>
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Approved</span>
                  </p>
                  <p className="text-sm [@media(min-width:769px) and (max-width:1080px)]:text-2xl font-bold text-green-700 truncate lg:text-2xl">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'changes_requested' ? 'ring-2 ring-red-700' : 'hover:shadow-md'}`} onClick={() => setReviewFilter('changes_requested')}>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-700" />
                <div className="truncate">
                  <p className="text-xs text-muted-foreground [@media(min-width:769px) and (max-width:1080px)]:text-sm lg:text-sm">
                    <span className="inline [@media(min-width:769px) and (max-width:1080px)]:hidden lg:hidden">Changes</span>
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Changes Requested</span>
                  </p>
                  <p className="text-sm [@media(min-width:769px) and (max-width:1080px)]:text-2xl font-bold text-red-700 truncate lg:text-2xl">{stats.changesRequested}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'on_hold' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`} onClick={() => setReviewFilter('on_hold')}>
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Pause className="h-4 w-4 text-orange-400" />
                <div className="truncate">
                  <p className="text-xs text-muted-foreground [@media(min-width:769px) and (max-width:1080px)]:text-sm lg:text-sm">
                    <span className="inline [@media(min-width:769px) and (max-width:1080px)]:hidden lg:hidden">On Hold</span>
                    <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">On Hold</span>
                  </p>
                  <p className="text-sm [@media(min-width:769px) and (max-width:1080px)]:text-2xl font-bold text-orange-400 truncate lg:text-2xl">{stats.onHold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Tasks for Review</h3>
            <div className="flex items-center">
              {/* Funnel dropdown for small/medium screens */}
              <div className="relative lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Filter tasks">
                      <Funnel className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="center" className="w-40">
                    <DropdownMenuItem asChild>
                      <Button variant={reviewFilter === 'all' ? 'default' : 'ghost'} size="sm" className="w-full text-left text-xs" onClick={() => setReviewFilter('all')}>
                        All ({tasksForReview.length})
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant={reviewFilter === 'pending' ? 'default' : 'ghost'} size="sm" className="w-full text-left text-xs" onClick={() => setReviewFilter('pending')}>
                        Pending ({stats.pending})
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant={reviewFilter === 'approved' ? 'default' : 'ghost'} size="sm" className="w-full text-left text-xs" onClick={() => setReviewFilter('approved')}>
                        Approved ({stats.approved})
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant={reviewFilter === 'changes_requested' ? 'default' : 'ghost'} size="sm" className="w-full text-left text-xs" onClick={() => setReviewFilter('changes_requested')}>
                        Changes Requested ({stats.changesRequested})
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Button variant={reviewFilter === 'on_hold' ? 'default' : 'ghost'} size="sm" className="w-full text-left text-xs" onClick={() => setReviewFilter('on_hold')}>
                        On Hold ({stats.onHold})
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Full buttons shown on large screens */}
              <div className="hidden [@media(min-width:769px) and (max-width:1080px)]:flex lg:flex items-center gap-2">
                <Button
                  variant={reviewFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('all')}
                  title={`All (${tasksForReview.length})`}
                >
                  All ({tasksForReview.length})
                </Button>
                <Button
                  variant={reviewFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('pending')}
                  title={`Pending (${stats.pending})`}
                >
                  Pending ({stats.pending})
                </Button>
                <Button
                  variant={reviewFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('approved')}
                  title={`Approved (${stats.approved})`}
                >
                  Approved ({stats.approved})
                </Button>
                <Button
                  variant={reviewFilter === 'changes_requested' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('changes_requested')}
                  title={`Changes Requested (${stats.changesRequested})`}
                >
                  Changes Requested ({stats.changesRequested})
                </Button>
                <Button
                  variant={reviewFilter === 'on_hold' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReviewFilter('on_hold')}
                  title={`On Hold (${stats.onHold})`}
                >
                  On Hold ({stats.onHold})
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <Card>
          <CardContent>
            {filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tasks found for the selected filter</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 [@media(min-width:769px) and (max-width:1080px)]:gap-2 mb-2">
                          <h3 className="font-semibold text-sm [@media(min-width:769px) and (max-width:1080px)]:text-base lg:text-base truncate">{task.title}</h3>
                          <Badge className={`${reviewStatusConfig[task.reviewStatus || 'pending'].color} max-w-[8rem] [@media(min-width:769px) and (max-width:1080px)]:max-w-none lg:max-w-none overflow-hidden` }>
                            <span className="hidden sm:inline text-xs [@media(min-width:769px) and (max-width:1080px)]:text-sm lg:text-sm truncate whitespace-nowrap">{reviewStatusConfig[task.reviewStatus || 'pending'].label}</span>
                            <span className="sr-only sm:hidden">{reviewStatusConfig[task.reviewStatus || 'pending'].label}</span>
                          </Badge>
                          {task.needsReview && (
                            <>
                              <Badge variant="outline" className="hidden sm:inline [@media(min-width:769px) and (max-width:1080px)]:inline-flex lg:inline-flex text-white bg-black px-2 py-0.5 text-xs max-w-[6rem] [@media(min-width:769px) and (max-width:1080px)]:max-w-none lg:max-w-none overflow-hidden items-center">
                                <span className="truncate whitespace-nowrap">Needs Review</span>
                              </Badge>
                              <span className="sr-only sm:hidden">Needs Review</span>
                            </>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {task.assignee && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{task.assignee}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatReviewDate(task.dueDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                        <div className="flex gap-1 items-center flex-shrink-0">
                        {/* Review History Button (icon-only on small/medium, full text on lg) */}
                        <Button variant="outline" size="sm" className="px-2 py-1 text-xs flex-shrink-0" title={`Feedbacks (${task.reviewNotes ? task.reviewNotes.length : 0})`} onClick={async () => {
                          try {
                            const res = await tasksApi.getChangelogs(task.id);
                            const data = extractDataArray<ChangeLogEntry>(res);
                            const notes: ReviewNote[] = data.map((r) => ({
                              id: String(r.id),
                              taskId: r.task_id || task.id,
                              reviewerId: String(r.user_id || 'User'),
                              reviewerName: 'User',
                              action: (r.new_status || '').toLowerCase().includes('request') ? 'request_changes' : 
                                     (r.new_status || '').toLowerCase().includes('hold') ? 'hold_discussion' : 'approve',
                              reviewType: 'general_review',
                              notes: r.description || r.remark || '',
                              changeDetails: r.remark || undefined,
                              timestamp: r.createdAt || new Date().toISOString()
                            }));
                            
                            setCurrentHistory(notes);
                            setSelectedTaskForHistory(task);
                          } catch {
                            console.warn('Failed to fetch changelogs for task', task.id);
                            setCurrentHistory([]);
                            setSelectedTaskForHistory(task);
                          }
                        }}>
                          <MessageSquare className="h-3 w-3 [@media(min-width:769px) and (max-width:1080px)]:h-4 [@media(min-width:769px) and (max-width:1080px)]:w-4 lg:h-4 lg:w-4" aria-hidden />
                          {/* show label in custom medium (769-1080px) and on desktop */}
                          <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline [@media(min-width:769px) and (max-width:1080px)]:ml-1 lg:ml-1">Feedback's ({task.reviewNotes ? task.reviewNotes.length : 0})</span>
                        </Button>

                        {/* Add Review Button: icon-only on small/medium, text on lg */}
                        <Button size="sm" className="px-2 py-1 text-xs flex-shrink-0" title="Add feedback" onClick={() => {
                          if (suppressDialogOpen) {
                            // prevent reopening while we just submitted feedback and refreshing
                            toast('Please wait while changes are applied');
                            return;
                          }
                          setSelectedTaskForReview(task);
                          setReviewNotes('');
                          setChangeDetails('');
                          setSelectedAction('approve');
                        }}>
                          {/* Plus icon visible on small only; label shown from md+ */}
                          <Plus className="h-3 w-3 [@media(min-width:769px) and (max-width:1080px)]:h-4 [@media(min-width:769px) and (max-width:1080px)]:w-4 lg:h-4 lg:w-4 [@media(min-width:769px) and (max-width:1080px)]:hidden lg:hidden" aria-hidden />
                          <span className="hidden [@media(min-width:769px) and (max-width:1080px)]:inline lg:inline">Add feedback</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* History Dialog - read-only */}
      <Dialog open={!!selectedTaskForHistory} onOpenChange={(open) => {
        if (!open) {
          setSelectedTaskForHistory(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Feedback's - {selectedTaskForHistory?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {currentHistory.length > 0 ? (
              currentHistory.map((review) => {
                const actionConfig = reviewActionConfig[review.action];
                const IconComponent = actionConfig.icon;
                // compute static classes per action so Tailwind's JIT can detect utilities
                const badgeClass = review.action === 'approve'
                  ? '!bg-green-100 !text-green-700'
                  : review.action === 'request_changes'
                    ? '!bg-red-100 !text-red-700'
                    : '!bg-orange-100 !text-orange-400';
                const iconClass = review.action === 'approve'
                  ? '!text-green-700'
                  : review.action === 'request_changes'
                    ? '!text-red-700'
                    : '!text-orange-400';

                return (
                  <div key={review.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${actionConfig.bgColor && actionConfig.bgColor.startsWith('!') ? actionConfig.bgColor : '!' + actionConfig.bgColor}`}>
                        <IconComponent className={`h-4 w-4 ${iconClass}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{review.reviewerName}</span>
                          <Badge className={badgeClass}>
                            {actionConfig.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatReviewDate(review.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{review.notes}</p>
                        {review.changeDetails && review.action === 'request_changes' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-xs font-medium text-red-700 mb-1">Changes Required:</p>
                            <p className="text-sm text-red-600">{review.changeDetails}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No Feedback history found for this task</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog - submit reviews */}
      <Dialog open={!!selectedTaskForReview && !suppressDialogOpen && selectedTaskForReview?.id !== justSubmittedRef.current} onOpenChange={(open) => {
        if (!open) {
          setSelectedTaskForReview(null);
          setReviewNotes('');
          setChangeDetails('');
          setSelectedAction('approve');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add Feedback - {selectedTaskForReview?.title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Feedback Action</label>
                <Select value={selectedAction} onValueChange={(value: ReviewAction) => setSelectedAction(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reviewActionConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Feedback Notes</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Provide detailed feedback..."
                  className="h-20 sm:h-28 [@media(min-width:769px) and (max-width:1080px)]:h-36 lg:h-40 overflow-auto resize-none"
                  style={{ resize: 'none' }}
                />
              </div>

              {selectedAction === 'request_changes' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Specific Changes Required</label>
                  <Textarea
                    value={changeDetails}
                    onChange={(e) => setChangeDetails(e.target.value)}
                    placeholder="Describe specific changes that need to be made..."
                    className="h-20 sm:h-28 [@media(min-width:769px) and (max-width:1080px)]:h-36 lg:h-40 overflow-auto resize-none"
                    style={{ resize: 'none' }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleReviewSubmit}
                  disabled={!reviewNotes.trim() || submitting}
                  className="flex-1"
                >
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTaskForReview(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* react-hot-toast renders toasts via a Toaster in the app layout */}
    </div>
  );
}