"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, MoreHorizontal, Calendar, Edit3, Trash2, X, GripVertical, MessageSquare, Flame, Gauge, Leaf, AlertTriangle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Button } from "@/presentation/components/ui/button";
import { Badge } from "@/presentation/components/ui/badge";
import { Input } from "@/presentation/components/ui/input";
import { Textarea } from "@/presentation/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/presentation/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/presentation/components/ui/dialog";
import { Slider } from "@/presentation/components/ui/slider";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useProjects } from "@/presentation/hooks/useProjects";
import { useTasks } from "@/presentation/hooks/useTasks";
import { Project } from "@/core/domain/entities/Project";
import { Task, TaskStatus, TaskPriority, CreateTaskData, UpdateTaskData } from "@/core/domain/entities/Task";
import { useSearch } from "@/lib/search-context";
import { tasksApi, ChangeLogEntry } from "@/lib/api";
import toast from 'react-hot-toast';
import ClientDate from "@/presentation/components/ui/client-date"

// Type definitions
type ItemType = 'project' | 'task';
type ItemStatus = 'Todo' | 'In Progress' | 'Done';
type Priority = 'High' | 'Medium' | 'Low' | 'Critical';
type BadgeVariant = 'destructive' | 'secondary' | 'outline' | 'default';
type ReviewStatus = 'pending' | 'approved' | 'changes_requested' | 'on_hold';

interface ProjectInfo {
  title: string;
  description?: string;
}

interface EnhancedKanbanBoardProps {
  project?: ProjectInfo;
  projectId?: number;
}

interface Column {
  id: ItemStatus;
  title: string;
  color: string;
  bgColor: string;
}

// Enhanced Task interface to include review information
interface TaskWithReview extends Task {
  reviewStatus?: ReviewStatus;
  lastReviewNotes?: string;
  needsReview?: boolean;
  reviewChangeDetails?: string;
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

// Lightweight typed shape returned by mapChangelogsToReviewInfo
interface ReviewInfo {
  reviewStatus: ReviewStatus;
  lastReviewNotes?: string;
  needsReview: boolean;
  reviewChangeDetails?: string;
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

// Map backend changelogs to review data
const mapChangelogsToReviewInfo = (rows: ChangeLogEntry[]) => {
  if (rows.length === 0) {
    return {
      reviewStatus: 'pending' as ReviewStatus,
      lastReviewNotes: undefined,
      needsReview: false,
      reviewChangeDetails: undefined
    };
  }

  // Get the latest changelog entry
  const latest = rows.slice().sort((a, b) => 
    new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
  )[0];

  let reviewStatus: ReviewStatus = 'pending';
  let needsReview = false;
  const lastReviewNotes = latest.description || latest.remark || '';
  const reviewChangeDetails = latest.remark || undefined;

  if (latest && latest.new_status) {
    const ns = (latest.new_status || '').toLowerCase();
    if (ns === 'request changes') {
      reviewStatus = 'changes_requested';
      needsReview = true;
    } else if (ns === 'on hold') {
      reviewStatus = 'on_hold';
      needsReview = true;
    } else if (ns === 'completed' || ns === 'done') {
      reviewStatus = 'approved';
      needsReview = false;
    }
  }

  return { reviewStatus, lastReviewNotes, needsReview, reviewChangeDetails };
};

const columns: Column[] = [
  {
    id: 'Todo',
    title: 'TO DO',
    color: 'border-l-gray-400 dark:border-l-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900'
  },
  {
    id: 'In Progress', 
    title: 'IN PROGRESS',
  color: 'border-l-blue-500 dark:border-l-blue-400',
  bgColor: 'bg-blue-50 dark:bg-blue-900'
  },
  {
    id: 'Done',
    title: 'DONE',
  color: 'border-l-green-500 dark:border-l-green-400',
  bgColor: 'bg-green-50 dark:bg-green-900'
  }
];

const priorityConfig: Record<Priority, { color: BadgeVariant; icon: React.ReactNode; textClass?: string; bgClass?: string }> = {
  'Critical': {
    color: 'destructive',
    icon: <AlertTriangle className="h-3 w-3 inline-block mr-1 text-current" aria-hidden />,
  textClass: '!text-red-700 ',
  bgClass: '!bg-red-100'
  },

  'High': {
    color: 'destructive',
    icon: <Flame className="h-3 w-3 inline-block mr-1 text-current" aria-hidden />,
  textClass: '!text-red-700 text-xs font-semibold rounded-full flex items-center gap-1',
  bgClass: '!bg-red-100'
  },

  'Medium': {
    color: 'secondary',
    icon: <Gauge className="h-3 w-3 inline-block mr-1 text-current" aria-hidden />,
  textClass: '!text-yellow-700 text-xs font-semibold rounded-full flex items-center gap-1',
  bgClass: '!bg-yellow-100'
  },

  'Low': {
    color: 'outline',
    icon: <Leaf className="h-3 w-3 inline-block mr-1 text-current" aria-hidden />,
  textClass: '!text-gray-700 text-xs font-semibold rounded-full flex items-center gap-1',
  bgClass: '!bg-gray-100'
  }
};

const typeConfig: Record<ItemType, { label: string; color: string }> = {
  'project': { label: 'PROJECT', color: 'bg-black text-white' },
  // light: black text, dark: white text
  'task': { label: 'TASK', color: 'bg-black text-white' }
};

const reviewStatusConfig = {
  pending: { label: 'Pending Review', color: 'bg-blue-100 text-blue-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  changes_requested: { label: 'Changes Requested', color: 'bg-red-100 text-red-800' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-800' }
};

export default function EnhancedKanbanBoard({ project, projectId }: EnhancedKanbanBoardProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const { projects, createProject } = useProjects();
  const { tasksByProject, createTask: createTaskViaCleanArchitecture, updateTask: updateTaskViaCleanArchitecture, deleteTask: deleteTaskViaCleanArchitecture, loadTasksForProject } = useTasks();
  const { highlightedTaskId } = useSearch();
  const [tasks, setTasks] = useState<Record<ItemStatus, TaskWithReview[]>>({
    'Todo': [],
    'In Progress': [],
    'Done': []
  });
  const [showNewItemForm, setShowNewItemForm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<TaskWithReview | null>(null);
  const [draggedItem, setDraggedItem] = useState<TaskWithReview | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string>('');
  const [loading, setLoading] = useState(true);
  // error UI replaced by react-hot-toast notifications
  const [projectData, setProjectData] = useState<Project | ProjectInfo | null>(null);

  // Use react-hot-toast for transient error messaging instead of local error state

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const result = await loadTasksForProject(projectId);
      
      if (result.success && result.tasks) {
        // Enhance tasks with review information
        const enhancedTasks: TaskWithReview[] = [];
        
        for (const task of result.tasks) {
          let reviewInfo: ReviewInfo = {
            reviewStatus: 'pending',
            lastReviewNotes: undefined,
            needsReview: false,
            reviewChangeDetails: undefined
          };

          try {
            // TODO: Fetch changelog for each task to get review information
            // This would require implementing a Clean Architecture changelog service
            // For now, keeping the tasksApi call as a temporary measure
            const changelogRes = await tasksApi.getChangelogs(task.id);
            const changelogData = extractDataArray<ChangeLogEntry>(changelogRes);
            
            if (changelogData.length > 0) {
              reviewInfo = mapChangelogsToReviewInfo(changelogData) as ReviewInfo;
            }
          } catch {
            // Ignore changelog fetch errors for individual tasks (non-fatal)
          }

          enhancedTasks.push({
            ...task.toData(), // Convert Task entity to plain object for compatibility
            ...reviewInfo
          });
        }
        
        // Group tasks by status
        const groupedTasks: Record<ItemStatus, TaskWithReview[]> = {
          'Todo': enhancedTasks.filter((task) => task.status === 'Todo'),
          'In Progress': enhancedTasks.filter((task) => task.status === 'In Progress'),
          'Done': enhancedTasks.filter((task) => task.status === 'Done'),
        };
        
        setTasks(groupedTasks);
      } else {
        console.error('Failed to load tasks:', result.message);
        // Fall back to empty lists
        setTasks({
          'Todo': [],
          'In Progress': [],
          'Done': []
        });
      }
    } catch {
      // Failed to load tasks - fall back to empty lists
      setTasks({
        'Todo': [],
        'In Progress': [],
        'Done': []
      });
    } finally {
      setLoading(false);
    }
  }, [projectId, loadTasksForProject]);

  // Keep a ref to loadTasks so other callbacks can call it
  const loadTasksRef = React.useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    loadTasksRef.current = loadTasks;
    return () => { loadTasksRef.current = null; };
  }, [loadTasks]);

  // Load tasks on component mount
  useEffect(() => {
    if (isAuthenticated && projectId) {
      loadTasksRef.current?.();
    }
  }, [isAuthenticated, projectId, loadTasks]);

  const loadProject = useCallback(async () => {
    if (!projectId || !user?.id) return;
    
    try {
      const response = await authApiRef.current.getProject(projectId, user.id);
      if (response.success && response.data) {
        setProjectData(response.data);
      }
    } catch {
      // Failed to load project details; fall back to minimal project info
      setProjectData((project as unknown as Project) || ({ id: -1, user_id: -1, name: 'Unknown Project', description: '' } as Project));
    }
  }, [projectId, user?.id, project]);

  // Load project data on component mount
  useEffect(() => {
    if (isAuthenticated && projectId && user?.id) {
      loadProject();
    }
  }, [isAuthenticated, projectId, user?.id, loadProject]);

  const moveTask = useCallback(async (taskId: number, newStatus: ItemStatus): Promise<void> => {
    try {
      // Optimistic update
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        let taskToMove: TaskWithReview | null = null;
        
        // Find and remove the task from its current status
        for (const status of Object.keys(newTasks) as ItemStatus[]) {
          const taskIndex = newTasks[status].findIndex(task => task.id === taskId);
          if (taskIndex !== -1) {
            taskToMove = newTasks[status][taskIndex];
            newTasks[status].splice(taskIndex, 1);
            break;
          }
        }
        
        // Add the task to the new status
        if (taskToMove) {
          taskToMove.status = newStatus;
          newTasks[newStatus].push(taskToMove);
        }
        
        return newTasks;
      });

      // Update on backend
      await authApiRef.current.updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revert optimistic update by reloading tasks
      loadTasksRef.current?.();
    }
  }, []);

  const addNewTask = useCallback(async (taskData: CreateTaskRequest): Promise<void> => {
    if (!projectId) {
      toast.error('Project ID is required to create a task.', { position: 'top-center' });
      return;
    }

    try {
      const backendTaskData = {
        project_id: projectId,
        name: taskData.name,
        contents: taskData.contents,
        priority: taskData.priority,
        due_date: taskData.due_date,
        assignee: taskData.assignee,
      };

      const rawResponse = await authApiRef.current.createTask(backendTaskData);
      const createdRaw = rawResponse;
      const createdTask: Task = (createdRaw && typeof createdRaw === 'object' && 'data' in (createdRaw as unknown as Record<string, unknown>)) ? (createdRaw as unknown as Record<string, unknown>)['data'] as Task : (createdRaw as Task);
      
        if (createdTask) {
        const newTask: TaskWithReview = {
          ...createdTask,
          status: (taskData.status as Task['status']) || 'Todo',
          reviewStatus: 'pending',
          needsReview: false
        };

        setTasks(prevTasks => {
          const key = (newTask.status || 'Todo') as ItemStatus;
          if (!prevTasks[key]) {
            return prevTasks; // Unknown status - skip
          }
          return {
            ...prevTasks,
            [key]: [...(prevTasks[key] ?? []), newTask]
          };
        });
        setShowNewItemForm('');
      } else {
        throw new Error('Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task. Please try again.', { position: 'top-center' });
    }
  }, [projectId]);

  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      const rawResponse = await authApiRef.current.deleteTask(taskId);
      const resp = (rawResponse && typeof rawResponse === 'object' && 'success' in (rawResponse as unknown as Record<string, unknown>)) ? (rawResponse as unknown as Record<string, unknown>) : { success: true };
      
      if (resp.success) {
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          for (const status of Object.keys(newTasks) as ItemStatus[]) {
            newTasks[status] = newTasks[status].filter(task => task.id !== taskId);
          }
          return newTasks;
        });
        setSelectedItem(null);
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task. Please try again.', { position: 'top-center' });
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: TaskWithReview): Promise<void> => {
    try {
      const updatePayload = {
        name: updatedTask.name,
        contents: updatedTask.contents,
        status: updatedTask.status,
        priority: updatedTask.priority,
        due_date: updatedTask.due_date,
        assignee: updatedTask.assignee
      };
      
      const rawResult = await authApiRef.current.updateTask(updatedTask.id, updatePayload);
      const result = (rawResult && typeof rawResult === 'object' && 'data' in (rawResult as unknown as Record<string, unknown>)) ? (rawResult as unknown as Record<string, unknown>)['data'] as Task : rawResult;
      
      if (result) {
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          const updatedTaskData = { ...updatedTask, ...(result as Task) };
          
          // Remove from all statuses first
          for (const status of Object.keys(newTasks) as ItemStatus[]) {
            newTasks[status] = newTasks[status].filter(task => task.id !== updatedTask.id);
          }
          
          // Add to the correct status
          const taskStatus = updatedTaskData.status as ItemStatus;
          if (taskStatus && newTasks[taskStatus]) {
            newTasks[taskStatus].push(updatedTaskData);
          }
          
          return newTasks;
        });
      }
      
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task. Please try again.', { position: 'top-center' });
      loadTasksRef.current?.();
    }
  }, []);

  const updateTaskStatus = useCallback(async (task: TaskWithReview, newStatus: string): Promise<void> => {
    const updatedTask = { ...task, status: newStatus as ItemStatus };
    await updateTask(updatedTask);
  }, [updateTask]);

  const getTasksByStatus = useCallback((status: ItemStatus): TaskWithReview[] => {
    return tasks[status] || [];
  }, [tasks]);

  // Enhanced drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: TaskWithReview): void => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (): void => {
    setDraggedItem(null);
    setDragOverColumn('');
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (columnId: ItemStatus): void => {
    if (draggedItem) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn('');
    }
  };

  const handleDrop = async (e: React.DragEvent, columnId: ItemStatus): Promise<void> => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (draggedItem && draggedItem.status !== columnId) {
      await moveTask(taskId, columnId);
    }
    
    setDragOverColumn('');
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {(projectData && ((projectData as Project).name || (projectData as ProjectInfo).title)) || project?.title || 'Project Board'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base line-clamp-1">
            {(projectData && ((projectData as Project).description || (projectData as ProjectInfo).description)) || project?.description || 'Drag and drop items between columns to change their status'}
          </p>
        </div>
        <Button onClick={() => setShowNewItemForm('Todo')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* transient errors are shown via react-hot-toast */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {columns.map((column) => {
          const columnId = column.id.toLowerCase().replace(/\s+/g, '-') + '-column';
          
          return (
            <div 
              key={column.id} 
              id={columnId}
              className={`${column.bgColor} rounded-lg border-l-4 ${column.color}`}
            >
              <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100">
                    {column.title}
                  </h2>
                </div>
                
                <div className="flex space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  <span>
                    {getTasksByStatus(column.id).filter(item => item.type === 'project').length} Projects
                  </span>
                  <span>•</span>
                  <span>
                    {getTasksByStatus(column.id).filter(item => item.type === 'task').length} Tasks
                  </span>
                  {getTasksByStatus(column.id).filter(item => item.needsReview).length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-600 font-medium">
                        {getTasksByStatus(column.id).filter(item => item.needsReview).length} Need Review
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-2 sm:p-4">
                <div
                  onDrop={(e) => handleDrop(e, column.id)}
                  onDragOver={handleDragOver}
                  onDragEnter={() => handleDragEnter(column.id)}
                  onDragLeave={handleDragLeave}
                  className={`min-h-[400px] sm:min-h-[600px] transition-all duration-300 ease-out ${
                    dragOverColumn === column.id 
                      ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-dashed border-blue-400 rounded-lg scale-[1.01] shadow-inner' 
                      : ''
                  }`}
                >
                  {showNewItemForm === column.id && (
                    <NewItemForm 
                      columnId={column.id} 
                      onCancel={() => setShowNewItemForm('')}
                      onAdd={addNewTask}
                    />
                  )}
                  
              {getTasksByStatus(column.id).map((item) => (
                    <TaskCard 
                      key={item.id} 
                      item={item}
                      isDragging={draggedItem?.id === item.id}
                      isHighlighted={highlightedTaskId === item.id}
                      onEdit={() => setSelectedItem(item)}
                      onDelete={() => deleteTask(item.id)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onMove={(newStatus) => updateTaskStatus(item, newStatus)}
                    />
                  ))}
                  
              {getTasksByStatus(column.id).length === 0 && showNewItemForm !== column.id && (
                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground dark:text-gray-300">
                      <p className="text-sm mb-2 dark:text-gray-300">No items yet</p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowNewItemForm(column.id)}
                        className="text-xs"
                      >
                        Add your first item
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedItem && (
        <TaskModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

// Enhanced Task Card Component with Review Status
interface TaskCardProps {
  item: TaskWithReview;
  isDragging: boolean;
  isHighlighted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, item: TaskWithReview) => void;
  onDragEnd: () => void;
  onMove?: (newStatus: string) => void;
}

const TaskCard = ({ item, isDragging, isHighlighted = false, onEdit, onDelete, onDragStart, onDragEnd, onMove }: TaskCardProps) => {
  const [isMouseInDescription, setIsMouseInDescription] = React.useState(false);
  
  const getStatusOptions = () => {
    const currentStatus = item.status;
    const options = [];
    
    if (currentStatus !== 'Todo') options.push({ value: 'Todo', label: 'Todo', icon: '←' });
    if (currentStatus !== 'In Progress') options.push({ value: 'In Progress', label: 'in Progress', icon: '↔' });
    if (currentStatus !== 'Done') options.push({ value: 'Done', label: 'Done', icon: '→' });
    
    return options;
  };

  return (
    <div
      data-item-id={item.id}
      draggable={!isMouseInDescription}
      onDragStart={(e) => {
        if (isMouseInDescription) {
          e.preventDefault();
          return;
        }
        onDragStart(e, item);
      }}
      onDragEnd={onDragEnd}
      className={`mb-2 sm:mb-3 p-3 sm:p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-all duration-200 ${
        isMouseInDescription ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } group select-none ${
        isDragging ? 'opacity-50 scale-105' : 'hover:scale-[1.01]'
      } ${
        isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 animate-pulse' : ''
      } ${
        item.needsReview ? 'border-l-4 border-l-amber-400' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1 flex-wrap gap-1">
          <GripVertical className="hidden sm:block h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <Badge className={`text-xs font-bold ${item.type ? typeConfig[item.type].color : 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
            {item.type ? typeConfig[item.type].label : 'Task'}
          </Badge>
          <Badge variant={priorityConfig[item.priority].color} className={`text-xs flex-shrink-0 ${priorityConfig[item.priority].bgClass ?? ''} ${priorityConfig[item.priority].textClass ?? ''}`}>
            <span className="hidden sm:inline">{priorityConfig[item.priority].icon} {item.priority}</span>
            <span className="sm:hidden">{priorityConfig[item.priority].icon}</span>
          </Badge>
          
          {/* Review Status Badge */}
          {item.reviewStatus && item.reviewStatus !== 'pending' && (
            <Badge className={`text-xs flex-shrink-0 ${reviewStatusConfig[item.reviewStatus].color}`}>
              <span className="hidden sm:inline">
                {item.reviewStatus === 'changes_requested' ? '⚠️ Changes Requested' :
                 item.reviewStatus === 'on_hold' ? '⏸️ On Hold' :
                 '✅ Approved'}
              </span>
              <span className="sm:hidden">
                {item.reviewStatus === 'changes_requested' ? '⚠️' :
                 item.reviewStatus === 'on_hold' ? '⏸️' :
                 '✅'}
              </span>
            </Badge>
          )}
          
          {/* Needs Review Indicator */}
          {item.needsReview && (
            <Badge className="text-xs bg-red-100 text-red-700 flex-shrink-0">
              <MessageSquare className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Review Required</span>
              <span className="sm:hidden">Review</span>
            </Badge>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <MoreHorizontal className="h-2 w-2 sm:h-3 sm:w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {/* Mobile Move Options */}
            {onMove && getStatusOptions().length > 0 && (
              <>
                <DropdownMenuSeparator className="sm:hidden" />
                {getStatusOptions().map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => onMove(option.value)}
                    className="sm:hidden"
                  >
                    <span className="mr-2">{option.icon}</span>
                    Move to {option.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-semibold text-sm mb-2 line-clamp-2">
        {item.name}
      </h3>
      
      {/* Review Feedback Section - Show if task has been reviewed */}
          {item.lastReviewNotes && item.reviewStatus && item.reviewStatus !== 'pending' && (
        <div className={`mb-3 p-2 border rounded ${
          item.reviewStatus === 'changes_requested' ? 'bg-red-50 border-red-200' :
          item.reviewStatus === 'on_hold' ? 'bg-orange-50 border-orange-200' :
          'bg-green-50 border-green-200'
        }`}>
          <p className={`text-xs font-medium mb-1 ${
            item.reviewStatus === 'changes_requested' ? 'text-red-700' :
            item.reviewStatus === 'on_hold' ? 'text-orange-700' :
            'text-green-700'
          }`}>
            {item.reviewStatus === 'changes_requested' ? '📝 Review Feedback:' :
             item.reviewStatus === 'on_hold' ? '⏸️ Discussion Notes:' :
             '✅ Review Notes:'}
          </p>
          <p className={`text-xs line-clamp-2 ${
            item.reviewStatus === 'changes_requested' ? 'text-red-600' :
            item.reviewStatus === 'on_hold' ? 'text-orange-600' :
            'text-green-600'
          }`}>
            {item.lastReviewNotes}
          </p>
          {item.reviewChangeDetails && item.reviewStatus === 'changes_requested' && (
            <div className="mt-1 pt-1 border-t border-red-300">
              <p className="text-xs font-medium text-red-700 mb-1">Changes Required:</p>
              <p className="text-xs text-red-600 line-clamp-2">{item.reviewChangeDetails}</p>
            </div>
          )}
        </div>
      )}
      
      {item.contents && (
        <Dialog>
          <DialogTrigger asChild>
            <div 
              className="p-2 bg-gray-50 dark:bg-gray-800 rounded-md mb-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onMouseEnter={() => setIsMouseInDescription(true)}
              onMouseLeave={() => setIsMouseInDescription(false)}
              onMouseDown={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="text-muted-foreground text-xs line-clamp-3 break-words select-text"
                dangerouslySetInnerHTML={{
                  __html: (item.contents || '').replace(
                    /(https?:\/\/[^\s]+)/g,
                    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline">$1</a>'
                  )
                }}
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-start gap-3 mb-3 flex-wrap">
                <Badge className={`${item.type ? typeConfig[item.type].color : 'bg-gray-100 text-gray-700'} text-xs`}>
                  {item.type ? typeConfig[item.type].label : 'Task'}
                </Badge>
                <Badge variant={priorityConfig[item.priority].color} className={`text-xs ${priorityConfig[item.priority].bgClass ?? ''} ${priorityConfig[item.priority].textClass ?? ''}`}>
                  {priorityConfig[item.priority].icon} {item.priority}
                </Badge>
                {item.reviewStatus && item.reviewStatus !== 'pending' && (
                  <Badge className={`text-xs ${reviewStatusConfig[item.reviewStatus].color}`}>
                    {item.reviewStatus === 'changes_requested' ? 'Changes Requested' :
                     item.reviewStatus === 'on_hold' ? 'On Hold' :
                     'Approved'}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-left leading-tight pr-8">
                {item.name}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] py-4">
              <div className="space-y-4">
                {/* Review Information Section */}
                {item.lastReviewNotes && item.reviewStatus && item.reviewStatus !== 'pending' && (
                  <div className={`p-4 border rounded-lg ${
                    item.reviewStatus === 'changes_requested' ? 'bg-red-50 border-red-200' :
                    item.reviewStatus === 'on_hold' ? 'bg-orange-50 border-orange-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <h4 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${
                      item.reviewStatus === 'changes_requested' ? 'text-red-900' :
                      item.reviewStatus === 'on_hold' ? 'text-orange-900' :
                      'text-green-900'
                    }`}>
                      {item.reviewStatus === 'changes_requested' ? '⚠️ Review Feedback' :
                       item.reviewStatus === 'on_hold' ? '⏸️ Discussion Notes' :
                       '✅ Approved'}
                    </h4>
                    <div className={`bg-white rounded p-3 border ${
                      item.reviewStatus === 'changes_requested' ? 'border-red-200' :
                      item.reviewStatus === 'on_hold' ? 'border-orange-200' :
                      'border-green-200'
                    }`}>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                        {item.lastReviewNotes}
                      </p>
                      {item.reviewChangeDetails && item.reviewStatus === 'changes_requested' && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-sm font-medium text-red-700 mb-2">Specific Changes Required:</p>
                          <p className="text-sm text-red-600 leading-relaxed whitespace-pre-wrap break-words">
                            {item.reviewChangeDetails}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    Description
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border">
                    <div 
                      className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{
                        __html: (item.contents || '').replace(
                          /(https?:\/\/[^\s]+)/g,
                          '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 underline font-medium">$1</a>'
                        )
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Due Date
                    </h5>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'Not set'}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Current Status
                    </h5>
                    {/* Status-colored badge: Todo = gray, In Progress = blue, Done = green */}
                    <Badge className={`text-sm ${
                      item.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100'
                        : item.status === 'Done'
                          ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100'
                    }`}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {item.type === 'project' && typeof item.progress === 'number' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-300" 
              style={{ width: `${item.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center min-w-0">
          <Calendar className="h-3 w-3 mr-1 text-gray-500" />
          {item.dueDate ? (
            <span className="text-sm font-medium">
              <ClientDate iso={item.dueDate} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
            </span>
          ) : item.due_date ? (
            <span className="text-sm font-medium">
              <ClientDate iso={item.due_date} options={{ month: 'short', day: 'numeric', year: 'numeric' }} />
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">No due date</span>
          )}
        </div>

        {item.assignee ? (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium flex-shrink-0">
              <User className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden />
            </div>
            <span className="text-base truncate max-w-[60px] sm:max-w-[80px]">{item.assignee.split(' ')[0]}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// New Item Form Component
interface NewItemFormProps {
  columnId: ItemStatus;
  onCancel: () => void;
  onAdd: (taskData: CreateTaskRequest) => void;
}

const NewItemForm = ({ columnId, onCancel, onAdd }: NewItemFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTaskRequest>({
    name: '',
    contents: '',
    type: 'task',
    priority: 'Medium',
    due_date: '',
    assignee: '',
    progress: 0,
    status: columnId
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onAdd(formData);
      toast.success('Task added', { position: 'top-center' });
    } catch (e) {
      console.error('Add task failed:', e);
      toast.error('Failed to add task', { position: 'top-center' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <div className="mb-2 sm:mb-3 p-3 sm:p-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-dashed dark:border-gray-700 rounded-lg">
      <div className="space-y-3">
        <div className="w-full sm:w-1/3">
          <Select 
            value={formData.priority} 
            onValueChange={(value: Priority) => setFormData(prev => ({...prev, priority: value}))}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">Low Priority</SelectItem>
              <SelectItem value="Medium">Medium Priority</SelectItem>
              <SelectItem value="High">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Input
          placeholder="Task title"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
          autoFocus
          className="text-sm"
        />
        
        <Textarea
          placeholder="Description (optional)"
          value={formData.contents}
          onChange={(e) => setFormData(prev => ({...prev, contents: e.target.value}))}
          className="min-h-[60px] text-sm resize-none"
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData(prev => ({...prev, due_date: e.target.value}))}
            className="text-sm"
            placeholder="Due date"
          />
          
          <Input
            placeholder="Assignee"
            value={formData.assignee}
            onChange={(e) => setFormData(prev => ({...prev, assignee: e.target.value}))}
            className="text-sm"
          />
        </div>

        {formData.type === 'project' && (
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs sm:text-sm font-medium">Initial Progress</label>
              <span className="text-xs sm:text-sm text-muted-foreground">{formData.progress || 0}%</span>
            </div>
            <Slider
              value={[formData.progress || 0]}
              onValueChange={(value) => setFormData(prev => ({...prev, progress: value[0]}))}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={handleSubmit} className="flex-1 text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Adding…' : 'Add Task'}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1 text-sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Task Modal Component
interface TaskModalProps {
  item: TaskWithReview;
  onClose: () => void;
  onUpdate: (updatedTask: TaskWithReview) => void;
  onDelete: (id: number) => void;
}

const TaskModal = ({ item, onClose, onUpdate, onDelete }: TaskModalProps) => {
  const [editedItem, setEditedItem] = useState<TaskWithReview>(item);

  const saveItem = (): void => {
    onUpdate(editedItem);
    onClose();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Auto-resize textarea on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="description"]') as HTMLTextAreaElement;
      if (textarea && editedItem.contents) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [editedItem.contents]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 touch-none">
      <Card className="max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <CardHeader className="pb-2 sm:pb-4 flex-shrink-0 border-b">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-2">
              <CardTitle className="text-base sm:text-xl mb-1 sm:mb-2">Edit {item.type === 'project' ? 'Project' : 'Task'}</CardTitle>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1">
                <Badge className={`text-xs font-bold ${editedItem.type ? typeConfig[editedItem.type].color : 'bg-gray-100 text-gray-700'}`}>
                  {editedItem.type ? typeConfig[editedItem.type].label : 'Task'}
                </Badge>
                
                <Badge variant={priorityConfig[editedItem.priority].color} className={`text-xs ${priorityConfig[editedItem.priority].bgClass ?? ''} ${priorityConfig[editedItem.priority].textClass ?? ''}`}>
                  {priorityConfig[editedItem.priority].icon} {editedItem.priority}
                </Badge>
                {editedItem.reviewStatus && editedItem.reviewStatus !== 'pending' && (
                  <Badge className={`text-xs ${reviewStatusConfig[editedItem.reviewStatus].color}`}>
                    {editedItem.reviewStatus === 'changes_requested' ? 'Changes Requested' :
                     editedItem.reviewStatus === 'on_hold' ? 'On Hold' :
                     'Approved'}
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-y-auto">
          <CardContent className="space-y-3 sm:space-y-6 p-6">
            {/* Review Information Section */}
            {editedItem.lastReviewNotes && editedItem.reviewStatus && editedItem.reviewStatus !== 'pending' && (
                  <div className={`p-3 border rounded-lg ${
                editedItem.reviewStatus === 'changes_requested' ? 'bg-red-50 border-red-200' :
                editedItem.reviewStatus === 'on_hold' ? 'bg-orange-50 border-orange-200' :
                'bg-green-50 border-green-200'
              }`}>
                <h4 className={`text-sm font-semibold mb-2 ${
                  editedItem.reviewStatus === 'changes_requested' ? 'text-red-900' :
                  editedItem.reviewStatus === 'on_hold' ? 'text-orange-900' :
                  'text-green-900'
                }`}>
                  {editedItem.reviewStatus === 'changes_requested' ? '⚠️ Review Feedback:' :
                   editedItem.reviewStatus === 'on_hold' ? '⏸️ Discussion Notes:' :
                   '✅ Review Notes:'}
                </h4>
                <p className={`text-sm ${
                  editedItem.reviewStatus === 'changes_requested' ? 'text-red-700' :
                  editedItem.reviewStatus === 'on_hold' ? 'text-orange-700' :
                  'text-green-700'
                }`}>
                  {editedItem.lastReviewNotes}
                </p>
                {editedItem.reviewChangeDetails && editedItem.reviewStatus === 'changes_requested' && (
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <p className="text-sm font-medium text-red-700 mb-1">Changes Required:</p>
                    <p className="text-sm text-red-600">{editedItem.reviewChangeDetails}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Title</label>
              <Input
                value={editedItem.name}
                onChange={(e) => setEditedItem({...editedItem, name: e.target.value})}
                placeholder={`${item.type === 'project' ? 'Project' : 'Task'} title`}
                className="text-sm sm:text-base"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Description</label>
              <Textarea
                value={editedItem.contents || ''}
                onChange={(e) => {
                  setEditedItem({...editedItem, contents: e.target.value});
                  const textarea = e.target as HTMLTextAreaElement;
                  textarea.style.height = 'auto';
                  textarea.style.height = `${Math.max(60, textarea.scrollHeight)}px`;
                }}
                onDragStart={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                placeholder={`${item.type === 'project' ? 'Project' : 'Task'} description (supports links)`}
                className="min-h-[60px] text-sm resize-none overflow-hidden"
                style={{ 
                  height: editedItem.contents ? 'auto' : '60px',
                  minHeight: '60px'
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-gray-600">Due Date</label>
                  <Input
                    type="date"
                    value={editedItem.due_date || ''}
                    onChange={(e) => setEditedItem({...editedItem, due_date: e.target.value})}
                    className="h-9 text-sm w-full"
                  />
                </div>
                
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-gray-600">Priority</label>
                  <Select value={editedItem.priority} onValueChange={(value: Priority) => setEditedItem({...editedItem, priority: value})}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
                      <SelectItem value="Low">Low Priority</SelectItem>
                      <SelectItem value="Medium">Medium Priority</SelectItem>
                      <SelectItem value="High">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-gray-600">Status</label>
                  <Select value={editedItem.status} onValueChange={(value: ItemStatus) => setEditedItem({...editedItem, status: value})}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
                      <SelectItem value="Todo">Todo</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600"> Assignee</label>
                <Input
                  value={editedItem.assignee || ''}
                  onChange={(e) => setEditedItem({...editedItem, assignee: e.target.value})}
                  placeholder="Enter assignee name"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {editedItem.type === 'project' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Progress</label>
                  <span className="text-xs text-muted-foreground">{editedItem.progress || 0}%</span>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[editedItem.progress || 0]}
                    onValueChange={(value) => setEditedItem({...editedItem, progress: value[0]})}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="hidden sm:flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </div>
        
        <div className="flex-shrink-0 border-t bg-white dark:bg-gray-800 p-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              onClick={saveItem} 
              className="flex-1 text-sm"
            >
              Save Changes
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => onDelete(item.id)}
              className="flex-1 sm:flex-none text-sm"
            >
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
