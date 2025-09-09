"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Pause, MessageSquare, Calendar, User, ArrowLeft, PlayCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { tasksApi, Task } from "@/lib/api";
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

interface TaskWithReviews extends Task {
  projectId?: number;
  projectTitle?: string;
  reviewNotes?: ReviewNote[];
  lastReviewAction?: ReviewAction;
  reviewStatus?: ReviewStatus;
  needsReview?: boolean;
}

const reviewTypeConfig = {
  code_review: { label: '💻 Code Review', color: 'bg-purple-100 text-purple-700' },
  design_review: { label: '🎨 Design Review', color: 'bg-pink-100 text-pink-700' },
  content_review: { label: '📝 Content Review', color: 'bg-orange-100 text-orange-700' },
  qa_review: { label: '🧪 QA Review', color: 'bg-teal-100 text-teal-700' },
  general_review: { label: '📋 General Review', color: 'bg-gray-100 text-gray-700' }
};

const reviewActionConfig = {
  approve: {
    label: 'Approve & Complete',
    icon: CheckCircle,
    color: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50'
  },
  request_changes: {
    label: 'Request Changes',
    icon: XCircle,
    color: 'bg-red-500 hover:bg-red-600',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50'
  },
  hold_discussion: {
    label: 'Hold for Discussion',
    icon: Pause,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50'
  }
};

const reviewStatusConfig = {
  pending: { label: 'Pending Review', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  changes_requested: { label: 'Changes Requested', color: 'bg-red-100 text-red-800' },
  on_hold: { label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' }
};

interface ReviewDashboardProps {
  reviewProjects?: any[];
}

export default function ReviewDashboard({ reviewProjects = [] }: ReviewDashboardProps) {
  const { user, isAuthenticated } = useAuth();
  const [tasksForReview, setTasksForReview] = useState<TaskWithReviews[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithReviews | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [changeDetails, setChangeDetails] = useState('');
  const [selectedAction, setSelectedAction] = useState<ReviewAction>('approve');
  const [selectedReviewType, setSelectedReviewType] = useState<ReviewType>('general_review');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'approved' | 'pending' | 'changes_requested' | 'on_hold'>('all');

  // Mock review data - updated to match actual task IDs
  const mockReviewData: ReviewNote[] = [
    {
      id: '1',
      taskId: 4, // Market Research from "Soon Due Project"
      reviewerId: 'team-leader-1',
      reviewerName: 'John Smith',
      action: 'request_changes',
      reviewType: 'content_review',
      notes: 'Please add more detailed market analysis and update the competitive landscape section.',
      changeDetails: 'Need to include competitor pricing analysis and market size projections',
      timestamp: '2025-09-08T14:30:00Z'
    },
    {
      id: '2',
      taskId: 6, // Strategy Planning from "Soon Due Project"
      reviewerId: 'team-leader-1',
      reviewerName: 'John Smith',
      action: 'approve',
      reviewType: 'general_review',
      notes: 'Excellent strategic planning! The roadmap is comprehensive and well-structured.',
      timestamp: '2025-09-08T16:45:00Z'
    },
    {
      id: '3',
      taskId: 13, // Bug Fix from "Urgent Project"
      reviewerId: 'team-leader-2',
      reviewerName: 'Sarah Johnson',
      action: 'hold_discussion',
      reviewType: 'code_review',
      notes: 'The bug fix works but we need to discuss the architectural implications before approving.',
      changeDetails: 'Consider refactoring the error handling mechanism',
      timestamp: '2025-09-09T09:15:00Z'
    }
  ];

  // Load tasks that need review from API
  useEffect(() => {
    loadTasksForReview();
  }, []); // Remove reviewProjects dependency since we're loading from API

  const loadTasksForReview = async () => {
    try {
      setLoading(true);
      
      // Load real tasks from API
      const allTasks = await tasksApi.getAllTasks();
      const allProjects = await tasksApi.getAllProjects();
      
      // Filter completed tasks that need review
      const completedTasks = allTasks.filter((task: any) => task.status === "Done"); // API uses "Done" instead of "Completed"
      
      // Map API tasks to our format
      const tasksWithReviews: TaskWithReviews[] = completedTasks.map((task: any) => {
        // Check if we have any mock review data for this task
        const taskReviews = mockReviewData.filter(review => review.taskId === task.id);
        const lastReview = taskReviews.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];
        
        // Find the project this task belongs to
        const project = allProjects.find((p: any) => p.id === task.project_id);
        
        return {
          id: task.id,
          title: task.name,
          description: task.contents,
          type: 'task' as const,
          status: 'Completed' as const, // Map "Done" to "Completed" for UI
          priority: 'Medium' as const, // Default priority since API doesn't provide it
          projectId: task.project_id,
          projectTitle: project?.name || 'Unknown Project',
          reviewNotes: taskReviews,
          lastReviewAction: lastReview?.action,
          reviewStatus: lastReview?.action === 'approve' ? 'approved' : 
                       lastReview?.action === 'request_changes' ? 'changes_requested' :
                       lastReview?.action === 'hold_discussion' ? 'on_hold' : 'pending',
          needsReview: !lastReview || lastReview.action !== 'approve'
        };
      });

      setTasksForReview(tasksWithReviews);
    } catch (error) {
      console.error('Failed to load tasks for review:', error);
      // Fallback to empty array if API fails
      setTasksForReview([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!selectedTask || !reviewNotes.trim()) return;

    setSubmitting(true);
    try {
      // Create new review note
      const newReview: ReviewNote = {
        id: Date.now().toString(),
        taskId: selectedTask.id,
        reviewerId: user?.user_id || 'current-user',
        reviewerName: user?.email?.split('@')[0] || 'Current User',
        action: selectedAction,
        reviewType: 'general_review', // Default to general review
        notes: reviewNotes.trim(),
        changeDetails: selectedAction === 'request_changes' ? changeDetails.trim() : undefined,
        timestamp: new Date().toISOString()
      };

      // Update task status based on review action
      if (selectedAction === 'request_changes') {
        // Move task back to In Progress
        await tasksApi.updateTaskStatus(selectedTask.id, 'In Progress');
        // Create changelog entry
        await tasksApi.createChangelog(
          selectedTask.id,
          'Completed',
          'In Progress',
          `Review: ${reviewNotes.trim()}${changeDetails ? ` - Changes needed: ${changeDetails}` : ''}`
        );
      } else if (selectedAction === 'approve') {
        // Keep task as Completed when approved
        console.log(`Task ${selectedTask.id} approved and remains Completed`);
        // Create changelog entry for approval
        await tasksApi.createChangelog(
          selectedTask.id,
          'Completed',
          'Completed',
          `Review approved: ${reviewNotes.trim()}`
        );
      }
      // Note: 'hold_discussion' keeps the task in its current status

      // In a real app, you would save the review to the backend
      console.log('Review submitted:', newReview);

      // Update local state
      setTasksForReview(prev => 
        prev.map(task => 
          task.id === selectedTask.id 
            ? {
                ...task,
                reviewNotes: [...(task.reviewNotes || []), newReview],
                lastReviewAction: selectedAction,
                reviewStatus: (selectedAction === 'approve' ? 'approved' : 
                             selectedAction === 'request_changes' ? 'changes_requested' : 'on_hold') as ReviewStatus,
                needsReview: selectedAction !== 'approve',
                status: (selectedAction === 'approve' ? 'Completed' : 
                        selectedAction === 'request_changes' ? 'In Progress' : task.status) as "Todo" | "In Progress" | "Completed"
              }
            : task
        )
        // Keep all tasks in the list, don't filter out approved ones
      );

      // Reset form
      setSelectedTask(null);
      setReviewNotes('');
      setChangeDetails('');
      setSelectedAction('approve');
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProjectApproval = async (projectId: number) => {
    try {
      console.log(`Approving entire project ${projectId}`);
      
      // In a real implementation, you might want to:
      // 1. Update all tasks in the project to a final "Approved" status
      // 2. Update the project status
      // 3. Create changelog entries for the entire project
      
      // For now, create a changelog entry for project approval
      const projectTasks = tasksForReview.filter(task => task.projectId === projectId);
      
      // Create changelog entries for all tasks in the project
      for (const task of projectTasks) {
        await tasksApi.createChangelog(
          task.id,
          'Completed',
          'Completed',
          `Project approved by team leader`
        );
      }
      
      alert(`Project approved! All tasks in this project have been marked as approved.`);
      
      // Refresh the data to reflect changes
      await loadTasksForReview();
      
    } catch (error) {
      console.error('Failed to approve project:', error);
      alert('Failed to approve project. Please try again.');
    }
  };

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
  
  // For project-specific reviews, check if we have a projectId parameter
  // This would come from the URL or props
  const isProjectSpecific = false; // Set to true when implementing project-specific routing
  const currentProject: any = null; // This would be loaded based on projectId

  return (
    <div className="min-h-screen bg-background">
      {/* Review Header - Similar to Project Page */}
      <div className="border-b bg-white dark:bg-gray-900 px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-6">
            <Button variant="ghost" size="sm" asChild className="w-fit">
              <Link href="/dashboard">
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
                    <span className="font-medium">{currentProject.due || currentProject.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      currentProject.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      currentProject.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {currentProject.priority === 'High' && '🔥 '}
                      {currentProject.priority === 'Medium' && '⚡ '}
                      {currentProject.priority === 'Low' && '🌱 '}
                      <span className="hidden sm:inline">Priority: </span>
                      {currentProject.priority}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 bg-yellow-100 text-yellow-700">
                      <AlertCircle className="h-3 w-3" />
                      <span className="hidden sm:inline">Status: </span>
                      Ready for Review
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
          {/* Project Approval Button - Only show for project-specific reviews */}
          {isProjectSpecific && currentProject && (
            <Button 
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => handleProjectApproval(currentProject.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Approve Project</span>
              <span className="sm:hidden">Approve</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 p-4 lg:p-6">
      {/* Page Header */}
      <div>
        {isProjectSpecific && currentProject ? (
          <>
            <h1 className="text-3xl font-bold tracking-tight">{currentProject.title}</h1>
            <p className="text-muted-foreground">
              Review all completed tasks for this project and provide team feedback
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Team Review Dashboard</h1>
            <p className="text-muted-foreground">
              Review completed tasks and provide feedback to your team
            </p>
          </>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`cursor-pointer transition-all ${reviewFilter === 'pending' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`} 
              onClick={() => setReviewFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${reviewFilter === 'approved' ? 'ring-2 ring-green-500' : 'hover:shadow-md'}`}
              onClick={() => setReviewFilter('approved')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${reviewFilter === 'changes_requested' ? 'ring-2 ring-red-500' : 'hover:shadow-md'}`}
              onClick={() => setReviewFilter('changes_requested')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Changes Requested</p>
                <p className="text-2xl font-bold text-red-600">{stats.changesRequested}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${reviewFilter === 'on_hold' ? 'ring-2 ring-yellow-500' : 'hover:shadow-md'}`}
              onClick={() => setReviewFilter('on_hold')}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Pause className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">On Hold</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.onHold}</p>
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
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Needs Review
                          </Badge>
                        )}
                      </div>
                      
                      {task.projectTitle && (
                        <p className="text-sm text-blue-600 font-medium mb-1">
                          📁 {task.projectTitle}
                        </p>
                      )}
                      
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
                      {/* Review History Dialog */}
                      {task.reviewNotes && task.reviewNotes.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              History ({task.reviewNotes.length})
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review History - {task.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 max-h-96 overflow-y-auto">
                              {task.reviewNotes.map((review, index) => {
                                const actionConfig = reviewActionConfig[review.action];
                                const IconComponent = actionConfig.icon;
                                
                                return (
                                  <div key={review.id} className="border rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                      <div className={`p-2 rounded-full ${actionConfig.bgColor}`}>
                                        <IconComponent className={`h-4 w-4 ${actionConfig.textColor}`} />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-medium">{review.reviewerName}</span>
                                          <Badge className={actionConfig.textColor.replace('text-', 'bg-').replace('-700', '-100')}>
                                            {actionConfig.label}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {formatReviewDate(review.timestamp)}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{review.notes}</p>
                                        {review.changeDetails && (
                                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                            <p className="text-xs font-medium text-red-700 mb-1">Changes Required:</p>
                                            <p className="text-sm text-red-600">{review.changeDetails}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Add Review Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            onClick={() => setSelectedTask(task)}
                          >
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Review Task - {task.title}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Review Action</label>
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
                              <label className="text-sm font-medium mb-2 block">Review Notes</label>
                              <Textarea
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Provide detailed feedback..."
                                className="min-h-[100px]"
                              />
                            </div>

                            {selectedAction === 'request_changes' && (
                              <div>
                                <label className="text-sm font-medium mb-2 block">Specific Changes Required</label>
                                <Textarea
                                  value={changeDetails}
                                  onChange={(e) => setChangeDetails(e.target.value)}
                                  placeholder="Describe specific changes that need to be made..."
                                  className="min-h-[80px]"
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
                                onClick={() => {
                                  setSelectedTask(null);
                                  setReviewNotes('');
                                  setChangeDetails('');
                                  setSelectedAction('approve');
                                }}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
