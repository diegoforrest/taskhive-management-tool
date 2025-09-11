"use client";

import React, { useState, useCallback } from 'react';
import ClientDate from '@/components/ui/client-date'
import { Plus, MoreHorizontal, Calendar, Edit3, Trash2, X, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Type definitions
type ItemType = 'project' | 'task';
type ItemStatus = 'Todo' | 'In Progress' | 'Completed';
type Priority = 'High' | 'Medium' | 'Low';
type BadgeVariant = 'destructive' | 'secondary' | 'outline' | 'default';

interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  status: ItemStatus;
  priority: Priority;
  dueDate: string;
  assignee: string;
  progress?: number;
}

interface NewItem {
  title: string;
  description: string;
  type: ItemType;
  priority: Priority;
  dueDate: string;
  assignee: string;
  progress: number;
}

interface Column {
  id: ItemStatus;
  title: string;
  color: string;
  bgColor: string;
}

interface ItemCardProps {
  item: Item;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, item: Item) => void;
  onDragEnd: () => void;
}

interface ItemModalProps {
  item: Item;
  onClose: () => void;
}

interface NewItemFormProps {
  columnId: ItemStatus;
  onCancel: () => void;
  onAdd: (item: Item) => void;
}

interface DropZoneProps {
  columnId: ItemStatus;
  onDrop: (e: React.DragEvent, columnId: ItemStatus) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  isDragOver: boolean;
  children: React.ReactNode;
}

// Mock data with both tasks and projects
const initialItems: Item[] = [
  {
    id: '1',
    title: 'Design System Update',
    description: 'Revamp the entire design system with new color palette',
    type: 'project',
    status: 'Todo',
    priority: 'High',
    dueDate: '2024-02-15',
    assignee: 'Sarah Wilson',
    progress: 0
  },
  {
    id: '2',
    title: 'Mobile App Development',
    description: 'Build native mobile app for iOS and Android',
    type: 'project',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2024-03-20',
    assignee: 'Mike Johnson',
    progress: 65
  },
  {
    id: '3',
    title: 'Marketing Website',
    description: 'Complete redesign and development of marketing site',
    type: 'project',
    status: 'Completed',
    priority: 'Medium',
    dueDate: '2024-01-30',
    assignee: 'Lisa Chen',
    progress: 100
  },
  {
    id: '4',
    title: 'Setup authentication system',
    description: 'Implement JWT-based authentication with refresh tokens',
    type: 'task',
    status: 'Todo',
    priority: 'High',
    dueDate: '2024-01-18',
    assignee: 'John Doe'
  },
  {
    id: '5',
    title: 'Database optimization',
    description: 'Optimize queries and add proper indexing',
    type: 'task',
    status: 'In Progress',
    priority: 'Medium',
    dueDate: '2024-01-25',
    assignee: 'Jane Smith'
  },
  {
    id: '6',
    title: 'Write API documentation',
    description: 'Document all endpoints with examples and schemas',
    type: 'task',
    status: 'Completed',
    priority: 'Low',
    dueDate: '2024-01-12',
    assignee: 'Bob Wilson'
  }
];

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

const priorityConfig: Record<Priority, { color: BadgeVariant; icon: string }> = {
  'High': { color: 'destructive', icon: '🔥' },
  'Medium': { color: 'secondary', icon: '⚡' },
  'Low': { color: 'outline', icon: '📝' }
};

const typeConfig: Record<ItemType, { label: string; color: string }> = {
  'project': { label: 'PROJECT', color: 'bg-purple-100 text-purple-800' },
  'task': { label: 'TASK', color: 'bg-blue-100 text-blue-800' }
};

export default function KanbanBoard() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [showNewItemForm, setShowNewItemForm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [draggedItem, setDraggedItem] = useState<Item | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string>('');

  const moveItem = useCallback((itemId: string, newStatus: ItemStatus): void => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
  }, []);

  const addNewItem = useCallback((item: Item): void => {
    setItems(prevItems => [...prevItems, item]);
    setShowNewItemForm('');
  }, []);

  const deleteItem = useCallback((itemId: string): void => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
    setSelectedItem(null);
  }, []);

  const updateItem = useCallback((updatedItem: Item): void => {
    setItems(prevItems => 
      prevItems.map(item => item.id === updatedItem.id ? updatedItem : item)
    );
  }, []);

  const getItemsByStatus = useCallback((status: ItemStatus): Item[] => {
    return items.filter(item => item.status === status);
  }, [items]);

  // formatDate replaced by client-only component to avoid SSR/CSR mismatches

  // Drag and drop handlers with enhanced visuals
  const handleDragStart = (e: React.DragEvent, item: Item): void => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Enhanced visual feedback
    const target = e.target as HTMLElement;
    const card = target.closest('[data-item-id]') as HTMLElement;
    if (card) {
      setTimeout(() => {
        card.style.opacity = '0.7';
        card.style.transform = 'rotate(3deg) scale(1.02)';
        card.style.zIndex = '1000';
        card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
        card.style.transition = 'all 0.2s ease';
      }, 0);
    }
  };

  const handleDragEnd = (): void => {
    setDraggedItem(null);
    setDragOverColumn('');
    
    // Reset visual feedback for all draggable elements
    const draggedElements = document.querySelectorAll('[data-item-id]');
    draggedElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.opacity = '1';
      htmlElement.style.transform = '';
      htmlElement.style.zIndex = '';
      htmlElement.style.boxShadow = '';
      htmlElement.style.transition = 'all 0.2s ease';
      
      // Clean up the transition after animation
      setTimeout(() => {
        htmlElement.style.transition = '';
      }, 200);
    });
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
    // Only clear drag over if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumn('');
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: ItemStatus): void => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    
    if (draggedItem && draggedItem.status !== columnId) {
      moveItem(itemId, columnId);
      
      // Success animation
      const dropZone = e.currentTarget as HTMLElement;
      dropZone.style.backgroundColor = '#10b981';
      dropZone.style.transform = 'scale(1.02)';
      
      setTimeout(() => {
        dropZone.style.backgroundColor = '';
        dropZone.style.transform = '';
      }, 200);
    }
    
    setDragOverColumn('');
    setDraggedItem(null);
  };

  const DropZone = ({ columnId, onDrop, onDragOver, onDragLeave, isDragOver, children }: DropZoneProps) => (
    <div
      onDrop={(e) => onDrop(e, columnId)}
      onDragOver={onDragOver}
      onDragEnter={() => handleDragEnter(columnId)}
      onDragLeave={onDragLeave}
      className={`min-h-[600px] transition-all duration-300 ease-in-out ${
        isDragOver 
          ? 'bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg scale-[1.02] shadow-inner' 
          : ''
      }`}
      style={{
        background: isDragOver ? 'linear-gradient(145deg, #dbeafe, #bfdbfe)' : '',
      }}
    >
      {children}
    </div>
  );

  const ItemCard = ({ item, isDragging, onDragStart, onDragEnd }: ItemCardProps) => (
    <div
      data-item-id={item.id}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      className={`mb-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing group select-none ${
        isDragging ? 'shadow-2xl scale-105 rotate-2 z-50' : 'hover:scale-[1.01]'
      }`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <GripVertical className={`h-4 w-4 text-gray-400 transition-opacity ${
            isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`} />
          <Badge className={`text-xs font-bold ${typeConfig[item.type].color}`}>
            {typeConfig[item.type].label}
          </Badge>
          <Badge variant={priorityConfig[item.priority].color} className="text-xs">
            {priorityConfig[item.priority].icon} {item.priority}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedItem(item)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => deleteItem(item.id)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3 className="font-semibold text-sm mb-2 pointer-events-none">{item.title}</h3>
      
      {item.description && (
        <p className="text-muted-foreground text-xs mb-3 line-clamp-2 pointer-events-none">{item.description}</p>
      )}

      {item.type === 'project' && typeof item.progress === 'number' && (
        <div className="mb-3 pointer-events-none">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${item.progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground pointer-events-none">
        <div className="flex items-center space-x-2">
          {item.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <ClientDate iso={item.dueDate} options={{ month: 'short', day: 'numeric' }} />
            </div>
          )}
        </div>
        {item.assignee && (
          <div className="flex items-center space-x-1">
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
              {item.assignee.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs">{item.assignee.split(' ')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );

  const ItemModal = ({ item, onClose }: ItemModalProps) => {
    const [editedItem, setEditedItem] = useState<Item>(item);
    
    const saveItem = (): void => {
      updateItem(editedItem);
      onClose();
    };

    const moveItemInModal = (direction: 'next' | 'prev'): void => {
      const statuses: ItemStatus[] = ['Todo', 'In Progress', 'Completed'];
      const currentIndex = statuses.indexOf(item.status);
      let newIndex: number;
      
      if (direction === 'next' && currentIndex < statuses.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else {
        return;
      }
      
      moveItem(item.id, statuses[newIndex]);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Edit {item.type === 'project' ? 'Project' : 'Task'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editedItem.title}
                onChange={(e) => setEditedItem({...editedItem, title: e.target.value})}
                placeholder={`${item.type === 'project' ? 'Project' : 'Task'} title`}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editedItem.description}
                onChange={(e) => setEditedItem({...editedItem, description: e.target.value})}
                placeholder={`${item.type === 'project' ? 'Project' : 'Task'} description`}
                className="min-h-[80px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={editedItem.type} onValueChange={(value: ItemType) => setEditedItem({...editedItem, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={editedItem.priority} onValueChange={(value: Priority) => setEditedItem({...editedItem, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {editedItem.type === 'project' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Progress (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editedItem.progress || 0}
                  onChange={(e) => setEditedItem({...editedItem, progress: parseInt(e.target.value) || 0})}
                />
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editedItem.dueDate}
                  onChange={(e) => setEditedItem({...editedItem, dueDate: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Assignee</label>
                <Input
                  value={editedItem.assignee}
                  onChange={(e) => setEditedItem({...editedItem, assignee: e.target.value})}
                  placeholder="Assignee name"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Move Item</p>
              <div className="flex space-x-2">
                {item.status !== 'Todo' && (
                  <Button variant="outline" onClick={() => moveItemInModal('prev')} className="flex-1">
                    ← Move Back
                  </Button>
                )}
                {item.status !== 'Completed' && (
                  <Button onClick={() => moveItemInModal('next')} className="flex-1">
                    Move Forward →
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2 pt-4 border-t">
              <Button onClick={saveItem} className="flex-1">
                Save Changes
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteItem(item.id)}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const NewItemForm = ({ columnId, onCancel, onAdd }: NewItemFormProps) => {
    const [localNewItem, setLocalNewItem] = useState<NewItem>({
      title: '',
      description: '',
      type: 'task',
      priority: 'Medium',
      dueDate: '',
      assignee: '',
      progress: 0
    });

    const handleSubmit = () => {
      if (!localNewItem.title.trim()) return;

      const item: Item = {
        id: Date.now().toString(),
        ...localNewItem,
        status: columnId,
        progress: columnId === 'Completed' ? 100 : (columnId === 'In Progress' ? 30 : 0)
      };

      onAdd(item);
    };

    return (
      <div className="mb-3 p-4 bg-white border-2 border-dashed border-gray-300 rounded-lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select 
              value={localNewItem.type} 
              onValueChange={(value: ItemType) => setLocalNewItem(prev => ({...prev, type: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="project">Project</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={localNewItem.priority} 
              onValueChange={(value: Priority) => setLocalNewItem(prev => ({...prev, priority: value}))}
            >
              <SelectTrigger>
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
            placeholder={`${localNewItem.type === 'project' ? 'Project' : 'Task'} title`}
            value={localNewItem.title}
            onChange={(e) => setLocalNewItem(prev => ({...prev, title: e.target.value}))}
            autoFocus
          />
          
          <Textarea
            placeholder="Description (optional)"
            value={localNewItem.description}
            onChange={(e) => setLocalNewItem(prev => ({...prev, description: e.target.value}))}
            className="min-h-[60px]"
          />
          
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={localNewItem.dueDate}
              onChange={(e) => setLocalNewItem(prev => ({...prev, dueDate: e.target.value}))}
            />
            
            <Input
              placeholder="Assignee"
              value={localNewItem.assignee}
              onChange={(e) => setLocalNewItem(prev => ({...prev, assignee: e.target.value}))}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={handleSubmit} className="flex-1">
              Add {localNewItem.type === 'project' ? 'Project' : 'Task'}
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Project Board</h1>
          <p className="text-muted-foreground">
            Drag and drop items between columns to change their status
          </p>
        </div>
        <Button onClick={() => setShowNewItemForm('Todo')}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id} className={`${column.bgColor} rounded-lg border-l-4 ${column.color}`}>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-lg text-gray-800">
                  {column.title}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewItemForm(column.id)}
                  className="h-8 w-8 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex space-x-2 text-sm text-gray-600">
                <span>
                  {getItemsByStatus(column.id).filter(item => item.type === 'project').length} Projects
                </span>
                <span>•</span>
                <span>
                  {getItemsByStatus(column.id).filter(item => item.type === 'task').length} Tasks
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <DropZone
                columnId={column.id}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverColumn === column.id}
              >
                {showNewItemForm === column.id && (
                  <NewItemForm 
                    columnId={column.id} 
                    onCancel={() => setShowNewItemForm('')}
                    onAdd={addNewItem}
                  />
                )}
                
                {getItemsByStatus(column.id).map((item) => (
                  <ItemCard 
                    key={item.id} 
                    item={item}
                    isDragging={draggedItem?.id === item.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                
                {getItemsByStatus(column.id).length === 0 && showNewItemForm !== column.id && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
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
              </DropZone>
            </div>
          </div>
        ))}
      </div>

      {selectedItem && (
        <ItemModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </div>
  );
}