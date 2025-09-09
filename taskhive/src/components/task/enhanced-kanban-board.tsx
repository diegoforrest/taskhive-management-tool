"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, MoreHorizontal, Calendar, Edit3, Trash2, X, GripVertical, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import Link from "next/link";
import { tasksApi, authApi, Task, CreateTaskRequest, TasksByStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSearch } from "@/lib/search-context";

// Type definitions
type ItemType = 'project' | 'task';
type ItemStatus = 'Todo' | 'In Progress' | 'Done';  // Changed from 'Completed' to match backend
type Priority = 'High' | 'Medium' | 'Low' | 'Critical';

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

const columns: Column[] = [
  {
    id: 'Todo',
    title: 'TO DO',
    color: 'border-l-gray-400',
    bgColor: 'bg-gray-50'
  },
  {
    id: 'In Progress', 
    title: 'IN PROGRESS',
    color: 'border-l-blue-500',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'Done',  // Changed from 'Completed'
    title: 'DONE',  // Changed from 'COMPLETED'
    color: 'border-l-green-500',
    bgColor: 'bg-green-50'
  }
];

const priorityConfig: Record<Priority, { color: string; icon: string }> = {
  'Critical': { color: 'destructive', icon: '🚨' },
  'High': { color: 'destructive', icon: '🔥' },
  'Medium': { color: 'secondary', icon: '⚡' },
  'Low': { color: 'outline', icon: '📝' }
};

const typeConfig: Record<ItemType, { label: string; color: string }> = {
  'project': { label: 'PROJECT', color: 'bg-purple-100 text-purple-800' },
  'task': { label: 'TASK', color: 'bg-blue-100 text-blue-800' }
};

export default function EnhancedKanbanBoard({ project, projectId }: EnhancedKanbanBoardProps = {}) {
  const { user, isAuthenticated } = useAuth();
  const { highlightedTaskId } = useSearch();
  const [tasks, setTasks] = useState<TasksByStatus>({
    'Todo': [],
    'In Progress': [],
    'Done': []  // Changed from 'Completed' to 'Done'
  });
  const [showNewItemForm, setShowNewItemForm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Task | null>(null);
  const [draggedItem, setDraggedItem] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [errorCountdown, setErrorCountdown] = useState<number>(0);
  const [projectData, setProjectData] = useState<any>(null);

  // Function to set error with countdown
  const setErrorWithCountdown = useCallback((message: string) => {
    setError(message);
    setErrorCountdown(5);
    
    const timer = setInterval(() => {
      setErrorCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const loadTasks = useCallback(async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await authApi.getTasks(projectId);
      if (response.success && response.data) {
        // Group tasks by status
        const groupedTasks: TasksByStatus = {
          'Todo': response.data.filter((task: Task) => task.status === 'Todo'),
          'In Progress': response.data.filter((task: Task) => task.status === 'In Progress'),
          'Done': response.data.filter((task: Task) => task.status === 'Done'),
        };
        setTasks(groupedTasks);
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      // For demo purposes, use empty state if API fails
      setTasks({
        'Todo': [],
        'In Progress': [],
        'Done': []
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load tasks on component mount
  useEffect(() => {
    if (isAuthenticated && projectId) {
      loadTasks();
    }
  }, [isAuthenticated, projectId, loadTasks]);

  const loadProject = useCallback(async () => {
    if (!projectId || !user?.user_id) return;
    
    try {
      const response = await authApi.getProject(projectId, user.user_id);
      if (response.success && response.data) {
        setProjectData(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load project:', err);
      // Use fallback project data if API fails
      setProjectData(project || { name: 'Unknown Project', description: '' });
    }
  }, [projectId, user?.user_id, project]);

  // Load project data on component mount
  useEffect(() => {
    if (isAuthenticated && projectId && user?.user_id) {
      loadProject();
    }
  }, [isAuthenticated, projectId, user?.user_id, loadProject]);

  const moveTask = useCallback(async (taskId: number, newStatus: ItemStatus): Promise<void> => {
    try {
      // Optimistic update
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        let taskToMove: Task | null = null;
        
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
      await authApi.updateTask(taskId, { status: newStatus });
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revert optimistic update by reloading tasks
      loadTasks();
    }
  }, []);

  const addNewTask = useCallback(async (taskData: CreateTaskRequest): Promise<void> => {
    if (!projectId) {
      setErrorWithCountdown('Project ID is required to create a task.');
      return;
    }

    try {
      // Convert frontend form data to backend format
      const backendTaskData = {
        project_id: projectId,
        name: taskData.name,
        contents: taskData.contents,
        priority: taskData.priority,
        due_date: taskData.due_date,
        assignee: taskData.assignee,
      };

      const response = await authApi.createTask(backendTaskData);
      
      if (response.success && response.data) {
        // Add the new task to the appropriate column
        const newTask: Task = {
          ...response.data,
          status: taskData.status || 'Todo'  // Use the column status
        };
        
        setTasks(prevTasks => ({
          ...prevTasks,
          [newTask.status]: [...prevTasks[newTask.status], newTask]
        }));
        setShowNewItemForm('');
      } else {
        throw new Error(response.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrorWithCountdown('Failed to create task. Please try again.');
    }
  }, [projectId]);

  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      const response = await authApi.deleteTask(taskId);
      if (response.success) {
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          for (const status of Object.keys(newTasks) as ItemStatus[]) {
            newTasks[status] = newTasks[status].filter(task => task.id !== taskId);
          }
          return newTasks;
        });
        setSelectedItem(null);
      } else {
        throw new Error(response.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setErrorWithCountdown('Failed to delete task. Please try again.');
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task): Promise<void> => {
    try {
      // Create the update payload with only the fields supported by backend
      const updatePayload = {
        name: updatedTask.name,
        contents: updatedTask.contents,
        status: updatedTask.status,
        priority: updatedTask.priority,
        due_date: updatedTask.due_date,
        assignee: updatedTask.assignee
      };
      
      const result = await authApi.updateTask(updatedTask.id, updatePayload);
      
      if (result.success && result.data) {
        // Update the local state optimistically
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          const updatedTaskData = result.data;
          
          // Remove from all statuses first
          for (const status of Object.keys(newTasks) as ItemStatus[]) {
            newTasks[status] = newTasks[status].filter(task => task.id !== updatedTask.id);
          }
          
          // Add to the correct status (ensure it's a valid ItemStatus)
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
      setErrorWithCountdown('Failed to update task. Please try again.');
      // Reload tasks to revert any optimistic updates
      loadTasks();
    }
  }, [loadTasks]);

  // Helper function for mobile move functionality
  const updateTaskStatus = useCallback(async (task: Task, newStatus: string): Promise<void> => {
    const updatedTask = { ...task, status: newStatus as ItemStatus };
    await updateTask(updatedTask);
  }, [updateTask]);

  const getTasksByStatus = useCallback((status: ItemStatus): Task[] => {
    return tasks[status] || [];
  }, [tasks]);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Enhanced drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: Task): void => {
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
            {projectData?.name || project?.title || 'Project Board'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base line-clamp-1">
            {projectData?.description || project?.description || 'Drag and drop items between columns to change their status'}
          </p>
        </div>
        <Button onClick={() => setShowNewItemForm('Todo')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded text-sm">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            {errorCountdown > 0 && (
              <span className="text-red-500 text-xs">({errorCountdown}s)</span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {columns.map((column) => {
          // Create column ID for search navigation - convert to lowercase and replace spaces
          const columnId = column.id.toLowerCase().replace(/\s+/g, '-') + '-column';
          
          return (
            <div 
              key={column.id} 
              id={columnId}
              className={`${column.bgColor} rounded-lg border-l-4 ${column.color}`}
            >
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-base sm:text-lg text-gray-800">
                  {column.title}
                </h2>

              </div>
              
              <div className="flex space-x-2 text-xs sm:text-sm text-gray-600">
                <span>
                  {getTasksByStatus(column.id).filter(item => item.type === 'project').length} Projects
                </span>
                <span>•</span>
                <span>
                  {getTasksByStatus(column.id).filter(item => item.type === 'task').length} Tasks
                </span>
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
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-muted-foreground">
                    <p className="text-sm mb-2">No items yet</p>
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

// Task Card Component
interface TaskCardProps {
  item: Task;
  isDragging: boolean;
  isHighlighted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, item: Task) => void;
  onDragEnd: () => void;
  onMove?: (newStatus: string) => void;
}

const TaskCard = ({ item, isDragging, isHighlighted = false, onEdit, onDelete, onDragStart, onDragEnd, onMove }: TaskCardProps) => {
  const [isMouseInDescription, setIsMouseInDescription] = React.useState(false);
  
  const getStatusOptions = () => {
    const currentStatus = item.status;
    const options = [];
    
    if (currentStatus !== 'Todo') options.push({ value: 'Todo', label: '📋 Todo', icon: '←' });
    if (currentStatus !== 'In Progress') options.push({ value: 'In Progress', label: '⚡ In Progress', icon: '↔' });
    if (currentStatus !== 'Done') options.push({ value: 'Done', label: '✅ Done', icon: '→' });  // Changed from 'Completed'
    
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
      className={`mb-2 sm:mb-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 ${
        isMouseInDescription ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      } group select-none ${
        isDragging ? 'opacity-50 scale-105' : 'hover:scale-[1.01]'
      } ${
        isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 animate-pulse' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
          <GripVertical className="hidden sm:block h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <Badge className={`text-xs font-bold ${item.type ? typeConfig[item.type].color : 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
            {item.type ? typeConfig[item.type].label : 'Task'}
          </Badge>
          <Badge variant={priorityConfig[item.priority].color as any} className="text-xs flex-shrink-0">
            <span className="hidden sm:inline">{priorityConfig[item.priority].icon} {item.priority}</span>
            <span className="sm:hidden">{priorityConfig[item.priority].icon}</span>
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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
              <div className="flex items-start gap-3 mb-3">
                <Badge className={`${item.type ? typeConfig[item.type].color : 'bg-gray-100 text-gray-700'} text-xs`}>
                  {item.type ? typeConfig[item.type].label : 'Task'}
                </Badge>
                <Badge variant={priorityConfig[item.priority].color as any} className="text-xs">
                  {priorityConfig[item.priority].icon} {item.priority}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-left leading-tight pr-8">
                {item.name}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    📄 Description
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
                    <Badge variant="secondary" className="text-sm">
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
          {item.due_date && (
            <div className="flex items-center flex-shrink-0 mr-2">
              <Calendar className="h-3 w-3 flex-shrink-0 mr-1" />
              <span className="hidden sm:inline truncate">
                {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="sm:hidden truncate">
                {new Date(item.due_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>
        {item.assignee && (
          <div className="flex items-center space-x-1 flex-shrink-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium flex-shrink-0">
              👤
            </div>
            <span className="text-base truncate max-w-[60px] sm:max-w-[80px]">{item.assignee.split(' ')[0]}</span>
          </div>
        )}
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
  const [formData, setFormData] = useState<CreateTaskRequest>({
    name: '',  // Changed from 'title'
    contents: '',  // Changed from 'description'
    type: 'task',
    priority: 'Medium',
    due_date: '',  // Changed from 'dueDate'
    assignee: '',
    progress: 0,
    status: columnId
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;  // Changed from 'title'
    onAdd(formData);
  };

  return (
    <div className="mb-2 sm:mb-3 p-3 sm:p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
      <div className="space-y-3">
        {/* Priority at very top left */}
        <div className="w-full sm:w-1/3">
          <Select 
            value={formData.priority} 
            onValueChange={(value: any) => setFormData(prev => ({...prev, priority: value}))}
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
          value={formData.name}  // Changed from 'title'
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}  // Changed from 'title'
          autoFocus
          className="text-sm"
        />
        
        <Textarea
          placeholder="Description (optional)"
          value={formData.contents}  // Changed from 'description'
          onChange={(e) => setFormData(prev => ({...prev, contents: e.target.value}))}  // Changed from 'description'
          className="min-h-[60px] text-sm resize-none"
        />
        
        {/* Due Date and Assignee Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="date"
            value={formData.due_date}  // Changed from 'dueDate'
            onChange={(e) => setFormData(prev => ({...prev, due_date: e.target.value}))}  // Changed from 'dueDate'
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
          <Button onClick={handleSubmit} className="flex-1 text-sm">
            Add Task
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1 text-sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Task Modal Component
interface TaskModalProps {
  item: Task;
  onClose: () => void;
  onUpdate: (updatedTask: Task) => void;
  onDelete: (id: number) => void;
}

const TaskModal = ({ item, onClose, onUpdate, onDelete }: TaskModalProps) => {
  const [editedItem, setEditedItem] = useState<Task>(item);

  const saveItem = (): void => {
    onUpdate(editedItem);
    onClose();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Clean up on unmount
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
        {/* Header - Fixed */}
        <CardHeader className="pb-2 sm:pb-4 flex-shrink-0 border-b">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-2">
              <CardTitle className="text-base sm:text-xl mb-1 sm:mb-2">Edit {item.type === 'project' ? 'Project' : 'Task'}</CardTitle>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Badge className={`text-xs font-bold ${editedItem.type ? typeConfig[editedItem.type].color : 'bg-gray-100 text-gray-700'}`}>
                  {editedItem.type ? typeConfig[editedItem.type].label : 'Task'}
                </Badge>
                <Badge variant={priorityConfig[editedItem.priority].color as any} className="text-xs">
                  {priorityConfig[editedItem.priority].icon} {editedItem.priority}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <CardContent className="space-y-3 sm:space-y-6 p-6">
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
                // Auto-resize textarea
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
          
          {/* Due Date, Priority, and Status inline - Equal size */}
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
                <Select value={editedItem.priority} onValueChange={(value: any) => setEditedItem({...editedItem, priority: value})}>
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
                <Select value={editedItem.status} onValueChange={(value: any) => setEditedItem({...editedItem, status: value})}>
                  <SelectTrigger className="h-9 text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" sideOffset={4} avoidCollisions={false}>
                    <SelectItem value="Todo">Todo</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Assignee - Full width with icon */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">👤 Assignee</label>
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
        
        {/* Fixed Bottom Action Bar */}
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
