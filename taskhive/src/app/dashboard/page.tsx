"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, List, Plus, Clock, AlertCircle, PlayCircle, CheckCircle, Calendar } from "lucide-react";
import { tasksApi, authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

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
  const [note, setNote] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<{ [projectId: number]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  type Priority = "High" | "Medium" | "Low";
  type TaskStatus = "Todo" | "In Progress" | "Done";
  type ProjectStatus = "Active" | "Ready for Review" | "Completed";
  
  interface Task {
    id: number;
    name: string;
    status: TaskStatus;
    priority: Priority;
    contents: string;
    project_id: number;
  }
  
  interface Project {
    id: number;
    name: string;
    description: string;
    user_id: string;
    tasks: Task[];
    status?: ProjectStatus;
  }

  // Load projects and tasks from API
  useEffect(() => {
    console.log('Dashboard mounted, loading data...');
    loadData();
  }, [user]);

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
  }, [user?.user_id]);

  // Auto-update project status when all tasks are completed
  useEffect(() => {
    projects.forEach(project => {
      const { total, completed } = getTaskStats(project.id);
      if (total > 0 && completed === total && project.status === 'In Progress') {
        updateProjectStatusBasedOnTasks(project.id);
      }
    });
  }, [projectTasks, projects]);

  const loadData = async () => {
    if (!user?.user_id) return;
    
    try {
      setLoading(true);
      
      // Load projects from real API
      const projectsResponse = await authApi.getProjects(typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id));
      
      console.log('Current user ID:', user.user_id);
      console.log('Projects API response:', projectsResponse);
      
      // Extract projects from the response
      const projectsData = projectsResponse.data || [];
      console.log('Projects data:', projectsData);
      
      setProjects(projectsData);
      
      // Load tasks for each project
      if (projectsData.length > 0) {
        await loadProjectTasks(projectsData);
      }
      
    } catch (error) {
      console.error('Failed to load data:', error);
      
      // Fallback to mock data if API fails
      try {
        console.log('Falling back to mock data...');
        const [projectsData, tasksData] = await Promise.all([
          tasksApi.getAllProjects(),
          tasksApi.getAllTasks()
        ]);
        
        // Convert user_id to number for comparison since API returns numbers
        const userIdNum = typeof user.user_id === 'number' ? user.user_id : parseInt(user.user_id);
        
        // Filter projects for current user
        const userProjects = projectsData
          .filter((project: any) => project.user_id === userIdNum)
          .map((project: any) => ({
            ...project,
            tasks: tasksData.filter((task: any) => task.project_id === project.id)
          }));
        
        setProjects(userProjects);
        setTasks(tasksData.filter((task: any) => {
          const userProjectIds = userProjects.map((p: any) => p.id);
          return userProjectIds.includes(task.project_id);
        }));
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProjectTasks = async (projectsData: any[]) => {
    const tasksByProject: { [projectId: number]: any[] } = {};
    
    // Load tasks for each project
    const taskPromises = projectsData.map(async (project) => {
      try {
        const response = await authApi.getTasks(project.id);
        return { projectId: project.id, tasks: response.data || [] };
      } catch (error) {
        console.error(`Failed to load tasks for project ${project.id}:`, error);
        return { projectId: project.id, tasks: [] };
      }
    });

    const results = await Promise.all(taskPromises);
    
    results.forEach(({ projectId, tasks }) => {
      tasksByProject[projectId] = tasks;
    });

    setProjectTasks(tasksByProject);
  };

  // Function to get task statistics for a project
  const getTaskStats = (projectId: number) => {
    const tasks = projectTasks[projectId] || [];
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'Done').length;
    const inProgress = tasks.filter(task => task.status === 'In Progress').length;
    const todo = tasks.filter(task => task.status === 'Todo').length;
    
    // Debug logging
    console.log(`Project ${projectId} tasks:`, {
      total,
      completed,
      inProgress, 
      todo,
      taskStatuses: tasks.map(t => ({ id: t.id, name: t.name, status: t.status }))
    });
    
    return { total, completed, inProgress, todo };
  };

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

  // Function to auto-update project status based on task completion
  const updateProjectStatusBasedOnTasks = async (projectId: number) => {
    const { total, completed } = getTaskStats(projectId);
    
    if (total > 0 && completed === total) {
      // All tasks completed, set project to "To Review"
      try {
        await authApi.updateProject(projectId, { status: 'To Review' });
        // Refresh projects to show updated status
        loadData();
      } catch (error) {
        console.error('Failed to update project status:', error);
      }
    }
  };

  const handleCompleteProject = () => {
    if (completionDialog.projectId) {
      setProjects(prevProjects => 
        prevProjects.map((project: any) => 
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
    const { total, completed } = getTaskStats(projectId);
    if (total === 0) return "No Tasks";
    const progress = getProjectProgress(projectId);
    if (progress === 100) return "Ready for Review";
    return "In Progress"; // Changed from "Not Started" to "In Progress" as default
  };

  // Filter projects based on active tab
  const getFilteredProjects = () => {
    switch (activeTab) {
      case "review":
        return projects.filter((project: any) => {
          const progress = getProjectProgress(project.id);
          return progress === 100 && project.status !== "Completed";
        });
      case "completed":
        return projects.filter((project: any) => {
          return project.status === "Completed";
        });
      default:
        return projects.filter((project: any) => {
          const progress = getProjectProgress(project.id);
          return progress < 100 && project.status !== "Completed";
        });
    }
  };

  const filteredProjects = getFilteredProjects();

  // Default priority for projects since API doesn't provide it
  const getProjectPriority = (projectId: number): Priority => {
    const tasks = projectTasks[projectId] || [];
    if (tasks.some((t: any) => t.priority === "High")) return "High";
    if (tasks.some((t: any) => t.priority === "Medium")) return "Medium";
    return "Low";
  };

  const priorityOrder: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  const sortedProjects = filteredProjects.sort((a: any, b: any) => {
    const aPriority = getProjectPriority(a.id);
    const bPriority = getProjectPriority(b.id);
    
    if (priorityOrder[aPriority] !== priorityOrder[bPriority]) {
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    }
    return new Date(a.due || '2025-12-31').getTime() - new Date(b.due || '2025-12-31').getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="w-full border-b bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-14 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`text-lg font-bold transition-colors ${
                activeTab === "all" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Projects ({projects.filter(p => getProjectProgress(p.id) < 100 && p.status !== "Completed").length})
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`text-lg font-bold transition-colors ${
                activeTab === "review" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Review ({projects.filter(p => getProjectProgress(p.id) === 100 && p.status !== "Completed").length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`text-lg font-bold transition-colors ${
                activeTab === "completed" 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              Completed ({projects.filter(p => p.status === "Completed").length})
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/dashboard/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              Add New Project
            </Link>
          </Button>
        </div>
      </nav>

      <main className="p-6">
        {sortedProjects.length > 0 ? (
          <div className="grid grid-cols-3 gap-6 items-start">
            {sortedProjects.map((project) => (
              <div key={project.id} className="bg-white dark:bg-gray-900 rounded-lg shadow p-5 flex flex-col gap-2 border border-gray-200 dark:border-gray-800 hover:shadow-lg hover:border-primary/20 transition-all duration-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {project.due_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(project.due_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        {/* Overdue indicator */}
                        {new Date(project.due_date) < new Date() && project.status !== "Completed" && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                            Overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No due date</span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      project.priority === 'High' ? 'bg-red-100 text-red-700' : 
                      project.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {project.priority === 'High' && '🔥 '}
                      {project.priority === 'Medium' && '⚡ '}
                      {project.priority === 'Low' && '🌱 '}
                      {project.priority}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                      project.status === "Completed" ? 'bg-green-100 text-green-700' :
                      getProjectStatus(project.id) === "Ready for Review" ? 'bg-yellow-100 text-yellow-700' :
                      getProjectStatus(project.id) === "In Progress" ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {project.status === "Completed" ? <CheckCircle className="h-3 w-3" /> :
                       getProjectStatus(project.id) === "Ready for Review" ? <AlertCircle className="h-3 w-3" /> :
                       getProjectStatus(project.id) === "In Progress" ? <PlayCircle className="h-3 w-3" /> :
                       <Clock className="h-3 w-3" />}
                      {project.status === "Completed" ? "Completed" : getProjectStatus(project.id)}
                    </span>
                  </div>
                  {activeTab !== "review" && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="outline" className="ml-2" asChild>
                        <Link href={`/dashboard/projects/${project.id}/edit`} aria-label="Edit Project">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z" />
                          </svg>
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                <Link 
                  href={activeTab === "review" ? `/dashboard/review?projectId=${project.id}` : `/dashboard/projects/${project.id}`} 
                  className="cursor-pointer flex flex-col flex-1"
                >
                  <h2 className="text-lg font-bold mb-1 truncate hover:text-primary transition-colors">
                    {project.name || project.title || 'Unnamed Project'}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-3 truncate">
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
                              className="bg-blue-500 transition-all duration-500 ease-out"
                              style={{ width: `${getProgressSegments(project.id).inProgressPercent}%` }}
                            ></div>
                            {/* Completed (Green) - always right */}
                            <div 
                              className="bg-green-500 transition-all duration-500 ease-out"
                              style={{ width: `${getProgressSegments(project.id).completedPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        {/* Progress percentage overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {getProjectProgress(project.id)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-gray-200 rounded-full h-3 flex items-center justify-center">
                        <span className="text-xs text-gray-500">No tasks</span>
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
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="font-medium text-blue-700">{getTaskStats(project.id).inProgress} In Progress</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="font-medium text-green-700">{getTaskStats(project.id).completed} Done</span>
                        </div>


                      </div>
                    )}

                  </div>
                </Link>
                
                {/* Tasks Dropdown */}
                <details className="w-full" onClick={(e) => e.stopPropagation()}>
                  <summary className="flex items-center justify-between cursor-pointer text-sm mb-2">
                    <span className="font-medium">Tasks ({getTaskStats(project.id).total})</span>
                    <ChevronDown className="h-4 w-4" />
                  </summary>
                  <ul className="space-y-1">
                    {projectTasks[project.id]?.length > 0 ? (
                      projectTasks[project.id].map((task: any) => (
                        <li key={task.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              task.status === 'Done' ? 'bg-green-500' : 
                              task.status === 'In Progress' ? 'bg-blue-500' : 
                              'bg-gray-400'
                            }`}></span>
                            <span className={`truncate ${task.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                              {task.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1 py-0.5 rounded text-white font-medium ${
                              task.priority === 'High' ? 'bg-red-500' : 
                              task.priority === 'Medium' ? 'bg-yellow-500' : 
                              task.priority === 'Critical' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}>
                              {task.priority === 'High' && '🔥'}
                              {task.priority === 'Medium' && '⚡'}
                              {task.priority === 'Low' && '📝'}
                              {task.priority === 'Critical' && '🚨'}
                            </span>
                            {task.assignee && (
                              <span className="text-muted-foreground">@{task.assignee}</span>
                            )}
                            {task.due_date && (
                              <span className="text-muted-foreground">
                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
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

      {/* Dialogs */}
      <Dialog open={completionDialog.open} onOpenChange={(open) => setCompletionDialog({ ...completionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this project as completed? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletionDialog({ open: false, projectId: null })}>
              Cancel
            </Button>
            <Button onClick={handleCompleteProject}>
              Complete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog({ ...noteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note or comment for this project review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              className="w-full min-h-[100px] p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your note here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNote("");
              setNoteDialog({ open: false, projectId: null });
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddNote} disabled={!note.trim()}>
              Add Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
