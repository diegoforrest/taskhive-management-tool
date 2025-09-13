"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Pause, MessageSquare, Calendar, User, ArrowLeft, AlertCircle, Flame, Gauge, Leaf, PlayCircle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { tasksApi, Task, authApi, Project } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
      } catch (e) {
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
    } catch (e) {
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
  const [showToast, setShowToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [currentHistory, setCurrentHistory] = useState<ReviewNote[]>([]);
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
            } catch (e) {
              console.warn('Failed to fetch changelogs for task', task.id, e);
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
        } catch (e) {
          console.warn('Failed to fetch tasks for project', p.id, e);
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

    setSubmitting(true);
    try {
      const reviewPayload = {
        reviewerId: String(user?.user_id || 'current-user'),
        reviewerName: user?.email?.split('@')[0] || 'Current User',
        action: selectedAction,
        reviewType: 'general_review',
        notes: reviewNotes.trim(),
        changeDetails: selectedAction === 'request_changes' ? changeDetails.trim() : undefined,
        timestamp: new Date().toISOString()
      };

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

      await loadTasksForReview();

      // Refresh history cache for this task
      try {
        const res = await tasksApi.getChangelogs(target.id);
        const rows = extractDataArray<ChangeLogEntry>(res);
        const mapped = mapChangelogsToReview(rows, user);
        setCurrentHistory(mapped.notes.map(n => ({ ...n, taskId: n.taskId || target.id })));
      } catch (e) {
        console.warn('Failed to refresh task history after submit:', e);
      }

      setShowToast({ message: 'Review submitted successfully', type: 'success' });

      // Reset form inputs but keep the review dialog open (user may submit multiple reviews)
      setReviewNotes('');
      setChangeDetails('');
      setSelectedAction('approve');
    } catch (error) {
      console.error('Failed to submit review:', error);
      setShowToast({ message: 'Failed to submit review', type: 'error' });
    } finally {
      setSubmitting(false);
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
        } catch (e) {
          console.warn('Failed to update task status during project approval', task.id, e);
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
          } catch (e) {
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
      } catch (e) {
        console.warn('Failed to create project-level changelog during approval', e);
      }

      // Mark the project status as Completed in the backend
      try {
        await authApi.updateProject(projectId, { status: 'Completed' });
        setShowToast({ message: 'Project approved and marked Completed', type: 'success' });
      } catch (e) {
        console.warn('Failed to update project status to Completed', projectId, e);
        setShowToast({ message: 'Failed to update project status', type: 'error' });
        return false;
      }

      // Refresh the data to reflect changes
      await loadTasksForReview();
      return true;
    } catch (error) {
      console.error('Failed to approve project:', error);
      setShowToast({ message: 'Failed to approve project', type: 'error' });
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
      } catch (e) {
        console.warn('Failed to load task history:', e);
        if (mounted) setCurrentHistory([]);
      }
    };

    loadHistory();

    return () => { mounted = false; };
  }, [selectedTaskForHistory, selectedTaskForReview, user]);

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
  month: 'short',
  day: 'numeric',
  year: 'numeric'
    });
  };


  // Auto-hide toast
  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(null), 3500);
    return () => clearTimeout(t);
  }, [showToast]);

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link href="/dashboard?tab=review">
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            
            {isProjectSpecific && currentProject ? (
              <>
                <h1 className="text-xl sm:text-2xl font-bold">Review Hive</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due:</span>
                        {
                          (() => {
                            const pd = getProjectString(currentProject, ['due', 'dueDate', 'due_date']);
                            return (
                              <span className="font-medium">{pd ? formatReviewDate(pd) : 'No due date'}</span>
                            );
                          })()
                        }
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      currentProject.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      currentProject.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {currentProject.priority === 'High' && <Flame className="inline h-3 w-3" aria-hidden />}
                      {currentProject.priority === 'Medium' && <Gauge className="inline h-3 w-3" aria-hidden />}
                      {currentProject.priority === 'Low' && <Leaf className="inline h-3 w-3" aria-hidden />}
                      {currentProject.priority}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-purple-100 text-purple-700">
                      <PlayCircle className="h-3 w-3" />
                      To Review
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-xl sm:text-2xl font-bold">Review Hive</h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-blue-100 text-blue-700">
                      <CheckCircle className="h-3 w-3" />
                      <span className="hidden sm:inline">Status: </span>
                      Team Review Center
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Approve Project button */}
          <div className="ml-2">
            {isProjectSpecific && currentProject && (
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className={`${allProjectApproved ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                    disabled={submitting || !allProjectApproved}
                    title={allProjectApproved ? 'Approve this project' : 'All tasks must be approved before approving the project'}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Approve Project</span>
                    <span className="sm:hidden">Approve</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Confirm Project Approval</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to approve this project and mark it as Completed? This will update all visible tasks and set the project status to Completed.</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      setConfirmOpen(false);
                      setSubmitting(true);
                      try {
                        const ok = await handleProjectApproval(currentProject.id);
                        if (ok) {
                          // show redirecting overlay and small delay so the success toast is visible before navigation
                          setRedirecting(true);
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
                    }}>
                      {submitting ? 'Approving...' : 'Confirm Approve'}
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
        {redirecting && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="relative z-50 w-full max-w-sm p-4 text-center">
              <div className="mb-3 text-sm font-medium text-primary">Applying changes, preparing the page...</div>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          </div>
        )}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`cursor-pointer transition-all ${reviewFilter === 'pending' ? 'ring-2 ring-blue-700' : 'hover:shadow-md'}`} 
                onClick={() => setReviewFilter('pending')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-700" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'approved' ? 'ring-2 ring-green-700' : 'hover:shadow-md'}`}
                onClick={() => setReviewFilter('approved')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-700" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'changes_requested' ? 'ring-2 ring-red-700' : 'hover:shadow-md'}`}
                onClick={() => setReviewFilter('changes_requested')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-700" />
                <div>
                  <p className="text-sm text-muted-foreground">Changes Requested</p>
                  <p className="text-2xl font-bold text-red-700">{stats.changesRequested}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all ${reviewFilter === 'on_hold' ? 'ring-2 ring-orange-500' : 'hover:shadow-md'}`}
                onClick={() => setReviewFilter('on_hold')}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Pause className="h-5 w-5 text-orange-400" />
                <div>
                  <p className="text-sm text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.onHold}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Tasks for Review</h3>
            <div className="flex items-center gap-2">
              <Button
                variant={reviewFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewFilter('all')}
              >
                All ({tasksForReview.length})
              </Button>
              <Button
                variant={reviewFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewFilter('pending')}
              >
                Pending ({stats.pending})
              </Button>
              <Button
                variant={reviewFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewFilter('approved')}
              >
                Approved ({stats.approved})
              </Button>
              <Button
                variant={reviewFilter === 'changes_requested' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewFilter('changes_requested')}
              >
                Changes Requested ({stats.changesRequested})
              </Button>
              <Button
                variant={reviewFilter === 'on_hold' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReviewFilter('on_hold')}
              >
                On Hold ({stats.onHold})
              </Button>
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
                  <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <Badge className={reviewStatusConfig[task.reviewStatus || 'pending'].color}>
                            {reviewStatusConfig[task.reviewStatus || 'pending'].label}
                          </Badge>
                          {task.needsReview && (
                            <Badge variant="outline" className="text-white bg-black">
                              Needs Review
                            </Badge>
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

                      <div className="flex gap-2">
                        {/* Review History Button */}
                        <Button variant="outline" size="sm" onClick={async () => {
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
                          } catch (e) {
                            console.warn('Failed to fetch changelogs for task', task.id, e);
                            setCurrentHistory([]);
                            setSelectedTaskForHistory(task);
                          }
                        }}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Feedback's ({task.reviewNotes ? task.reviewNotes.length : 0})
                        </Button>

                        {/* Add Review Button */}
                        <Button size="sm" onClick={() => {
                          setSelectedTaskForReview(task);
                          setReviewNotes('');
                          setChangeDetails('');
                          setSelectedAction('approve');
                        }}>Add feedback</Button>
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
      <Dialog open={!!selectedTaskForReview} onOpenChange={(open) => {
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
                  className="h-20 sm:h-28 md:h-36 lg:h-40 overflow-auto resize-none"
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
                    className="h-20 sm:h-28 md:h-36 lg:h-40 overflow-auto resize-none"
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
                  {submitting ? "Submitting..." : "Submit Review"}
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

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-xs p-3 rounded shadow-lg text-sm ${
          showToast.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 
          showToast.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' : 
          'bg-gray-50 border border-gray-200 text-gray-800'
        }`}>
          <div className="font-medium">{showToast.message}</div>
        </div>
      )}
    </div>
  );
}