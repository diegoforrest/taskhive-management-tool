"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, MoreHorizontal, Calendar, Edit3, Trash2, X, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { tasksApi, Task, CreateTaskRequest, TasksByStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useSearch } from "@/lib/search-context";

// Type definitions
type ItemType = 'project' | 'task';
type ItemStatus = 'Todo' | 'In Progress' | 'Completed';
type Priority = 'High' | 'Medium' | 'Low';

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
    id: 'Completed',
    title: 'COMPLETED',
    color: 'border-l-green-500',
    bgColor: 'bg-green-50'
  }
];

const priorityConfig: Record<Priority, { color: string; icon: string }> = {
  'High': { color: 'destructive', icon: '🔥' },
  'Medium': { color: 'secondary', icon: '⚡' },
  'Low': { color: 'outline', icon: '📝' }
};

const typeConfig: Record<ItemType, { label: string; color: string }> = {
  'project': { label: 'PROJECT', color: 'bg-purple-100 text-purple-800' },
  'task': { label: 'TASK', color: 'bg-blue-100 text-blue-800' }
};

export default function EnhancedKanbanBoard() {
  const { user, isAuthenticated } = useAuth();
  const { highlightedTaskId } = useSearch();
  const [tasks, setTasks] = useState<TasksByStatus>({
    'Todo': [],
    'In Progress': [],
    'Completed': []
  });
  const [showNewItemForm, setShowNewItemForm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Task | null>(null);
  const [draggedItem, setDraggedItem] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [errorCountdown, setErrorCountdown] = useState<number>(0);

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

  // Load tasks on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadTasks();
    }
  }, [isAuthenticated]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const tasksByStatus = await tasksApi.getTasksByStatus();
      setTasks(tasksByStatus);
      setError('');
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      // For demo purposes, use mock data if API fails
      setTasks({
        'Todo': [],
        'In Progress': [],
        'Completed': []
      });
    } finally {
      setLoading(false);
    }
  };

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
      await tasksApi.updateTaskStatus(taskId, newStatus);
    } catch (error) {
      console.error('Failed to move task:', error);
      // Revert optimistic update by reloading tasks
      loadTasks();
    }
  }, []);

  const addNewTask = useCallback(async (taskData: CreateTaskRequest): Promise<void> => {
    try {
      const newTask = await tasksApi.createTask(taskData);
      setTasks(prevTasks => ({
        ...prevTasks,
        [newTask.status]: [...prevTasks[newTask.status], newTask]
      }));
      setShowNewItemForm('');
    } catch (error) {
      console.error('Failed to create task:', error);
      setErrorWithCountdown('Failed to create task. Please try again.');
    }
  }, []);

  const deleteTask = useCallback(async (taskId: number): Promise<void> => {
    try {
      await tasksApi.deleteTask(taskId);
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        for (const status of Object.keys(newTasks) as ItemStatus[]) {
          newTasks[status] = newTasks[status].filter(task => task.id !== taskId);
        }
        return newTasks;
      });
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
      setErrorWithCountdown('Failed to delete task. Please try again.');
    }
  }, []);

  const updateTask = useCallback(async (updatedTask: Task): Promise<void> => {
    try {
      // Create the update payload with all the fields
      const updatePayload = {
        title: updatedTask.title,
        description: updatedTask.description,
        type: updatedTask.type,
        status: updatedTask.status,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        assignee: updatedTask.assignee,
        progress: updatedTask.progress
      };
      
      const result = await tasksApi.updateTask(updatedTask.id, updatePayload);
      
      // Update the local state optimistically
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        
        // Remove from all statuses first
        for (const status of Object.keys(newTasks) as ItemStatus[]) {
          newTasks[status] = newTasks[status].filter(task => task.id !== updatedTask.id);
        }
        
        // Add to the correct status
        newTasks[result.status].push(result);
        
        return newTasks;
      });
      
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to update task:', error);
      setErrorWithCountdown('Failed to update task. Please try again.');
      // Reload tasks to revert any optimistic updates
      loadTasks();
    }
  }, []);

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Project Board</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Drag and drop items between columns to change their status
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewItemForm(column.id)}
                  className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
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
  const getStatusOptions = () => {
    const currentStatus = item.status;
    const options = [];
    
    if (currentStatus !== 'Todo') options.push({ value: 'Todo', label: '📋 Todo', icon: '←' });
    if (currentStatus !== 'In Progress') options.push({ value: 'In Progress', label: '⚡ In Progress', icon: '↔' });
    if (currentStatus !== 'Completed') options.push({ value: 'Completed', label: '✅ Completed', icon: '→' });
    
    return options;
  };

  return (
    <div
      data-item-id={item.id}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      className={`mb-2 sm:mb-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group select-none ${
        isDragging ? 'opacity-50 scale-105' : 'hover:scale-[1.01]'
      } ${
        isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 animate-pulse' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
          <GripVertical className="hidden sm:block h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          <Badge className={`text-xs font-bold ${typeConfig[item.type].color} flex-shrink-0`}>
            {typeConfig[item.type].label}
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

      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{item.title}</h3>
      
      {item.description && (
        <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{item.description}</p>
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
          {item.dueDate && (
            <div className="flex items-center flex-shrink-0 mr-2">
              <Calendar className="h-3 w-3 flex-shrink-0 mr-1" />
              <span className="hidden sm:inline truncate">
                {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="sm:hidden truncate">
                {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
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
    title: '',
    description: '',
    type: 'task',
    priority: 'Medium',
    dueDate: '',
    assignee: '',
    progress: 0,
    status: columnId
  });

  const handleSubmit = () => {
    if (!formData.title.trim()) return;
    onAdd(formData);
  };

  return (
    <div className="mb-2 sm:mb-3 p-3 sm:p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select 
            value={formData.type} 
            onValueChange={(value: any) => setFormData(prev => ({...prev, type: value}))}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="project">Project</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex justify-end">
            <Select 
              value={formData.priority} 
              onValueChange={(value: any) => setFormData(prev => ({...prev, priority: value}))}
            >
              <SelectTrigger className="text-sm w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Input
          placeholder={`${formData.type === 'project' ? 'Project' : 'Task'} title`}
          value={formData.title}
          onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
          autoFocus
          className="text-sm"
        />
        
        <Textarea
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
          className="min-h-[60px] text-sm resize-none"
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({...prev, dueDate: e.target.value}))}
            className="text-sm"
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
            Add {formData.type === 'project' ? 'Project' : 'Task'}
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

  // Prevent body scroll when modal is open on mobile
  useEffect(() => {
    if (window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }
    
    return () => {
      // Clean up on unmount
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4 touch-none">
      <Card className="max-w-lg w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        <div className="flex flex-col h-full max-h-[95vh] sm:max-h-[90vh]">
          <CardHeader className="pb-2 sm:pb-4 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex-1 mr-2">
                <CardTitle className="text-base sm:text-xl mb-1 sm:mb-2">Edit {item.type === 'project' ? 'Project' : 'Task'}</CardTitle>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Badge className={`text-xs font-bold ${typeConfig[editedItem.type].color}`}>
                    {typeConfig[editedItem.type].label}
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
          
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <CardContent className="space-y-3 sm:space-y-6">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Title</label>
            <Input
              value={editedItem.title}
              onChange={(e) => setEditedItem({...editedItem, title: e.target.value})}
              placeholder={`${item.type === 'project' ? 'Project' : 'Task'} title`}
              className="text-sm sm:text-base"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium">Description</label>
            <Textarea
              value={editedItem.description || ''}
              onChange={(e) => setEditedItem({...editedItem, description: e.target.value})}
              placeholder={`${item.type === 'project' ? 'Project' : 'Task'} description`}
              className="min-h-[60px] sm:min-h-[100px] resize-none text-sm"
            />
          </div>
          
          {/* Mobile: Stack all fields, Desktop: Inline type/status and date/priority */}
          <div className="space-y-3">
            {/* Type and Status inline */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Type</label>
                <Select value={editedItem.type} onValueChange={(value: any) => setEditedItem({...editedItem, type: value})}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Status</label>
                <Select value={editedItem.status} onValueChange={(value: any) => setEditedItem({...editedItem, status: value})}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todo">Todo</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Due Date and Priority inline */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Due Date</label>
                <Input
                  type="date"
                  value={editedItem.dueDate || ''}
                  onChange={(e) => setEditedItem({...editedItem, dueDate: e.target.value})}
                  className="h-9 text-sm"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Priority</label>
                <div className="flex justify-end">
                  <Select value={editedItem.priority} onValueChange={(value: any) => setEditedItem({...editedItem, priority: value})}>
                    <SelectTrigger className="h-9 text-sm w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">
                        <div className="flex items-center space-x-2">
                          <span>📝</span>
                          <span>Low</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Medium">
                        <div className="flex items-center space-x-2">
                          <span>⚡</span>
                          <span>Medium</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="High">
                        <div className="flex items-center space-x-2">
                          <span>🔥</span>
                          <span>High</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t">
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
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};
