// Real API configuration for TaskHive Backend
const API_BASE_URL = 'http://localhost:3001';

interface LoginRequest {
  user_id: string; // Can be either numeric string or email
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    user_id: number;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  token?: string;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  user_id?: number;
  email?: string;
}

// Utility function to make HTTP requests
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Authentication API functions
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    console.log('Real API login request:', credentials);
    
    return await apiRequest('/testlogin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    console.log('Real API registration request:', userData);
    
    return await apiRequest('/test01/create_member', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  createProject: async (projectData: {
    user_id: number;
    name: string;
    description?: string;
  }): Promise<any> => {
    console.log('Real API create project request:', projectData);
    
    return await apiRequest('/test02/create_project', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  getProjects: async (user_id: number): Promise<any> => {
    console.log('Real API get projects request for user_id:', user_id);
    
    return await apiRequest(`/test03/get_projects?user_id=${user_id}`, {
      method: 'GET',
    });
  },

  updateProject: async (projectId: number, updateData: {
    name?: string;
    description?: string;
    priority?: string;
    due_date?: string;
    status?: string;
  }): Promise<any> => {
    console.log('Real API update project request:', { projectId, updateData });
    
    return await apiRequest(`/test04/update_project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  },

  deleteProject: async (projectId: number): Promise<any> => {
    console.log('Real API delete project request:', projectId);
    
    return await apiRequest(`/test09/delete_project/${projectId}`, {
      method: 'POST',
    });
  },

  getProject: async (projectId: number, user_id: number): Promise<any> => {
    console.log('Real API get project request:', { projectId, user_id });
    
    // Since we don't have a single project endpoint, get all projects and filter
    const response = await apiRequest(`/test03/get_projects?user_id=${user_id}`, {
      method: 'GET',
    });
    
    if (response.success && response.data) {
      const project = response.data.find((p: any) => p.id === projectId);
      if (project) {
        return { success: true, data: project };
      }
      throw new Error('Project not found');
    }
    
    throw new Error('Failed to fetch projects');
  },

  createTask: async (taskData: {
    project_id: number;
    name: string;
    contents?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }): Promise<any> => {
    console.log('Real API create task request:', taskData);
    
    return await apiRequest('/test05/create_task', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  getTasks: async (project_id: number): Promise<any> => {
    console.log('Real API get tasks request for project_id:', project_id);
    
    return await apiRequest(`/test06/get_tasks?project_id=${project_id}`, {
      method: 'GET',
    });
  },

  deleteTask: async (taskId: number): Promise<any> => {
    console.log('Real API delete task request:', taskId);
    
    return await apiRequest(`/test07/delete_task/${taskId}`, {
      method: 'POST',
    });
  },

  updateTask: async (taskId: number, updateData: {
    name?: string;
    contents?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }): Promise<any> => {
    console.log('Real API update task request:', taskId, updateData);
    
    return await apiRequest(`/test08/update_task/${taskId}`, {
      method: 'POST',
      body: JSON.stringify(updateData),
    });
  },
};

// Task interfaces
export interface Task {
  id: number;
  name: string;  // Changed from 'title' to match backend
  contents?: string;  // Changed from 'description' to match backend
  type?: 'task' | 'project';
  status: 'Todo' | 'In Progress' | 'Done';  // Updated to match backend enum
  priority: 'Low' | 'Medium' | 'High' | 'Critical';  // Added 'Critical' to match backend
  due_date?: string;  // Changed from 'dueDate' to match backend
  assignee?: string;
  progress?: number;
  project_id?: number;  // Added to match backend
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  name: string;  // Changed from 'title' to match backend
  contents?: string;  // Changed from 'description' to match backend
  type?: 'task' | 'project';
  status?: 'Todo' | 'In Progress' | 'Done';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';  // Added 'Critical' to match backend
  due_date?: string;  // Changed from 'dueDate' to match backend
  assignee?: string;
  progress?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export interface TasksByStatus {
  'Todo': Task[];
  'In Progress': Task[];
  'Done': Task[];  // Changed from 'Completed' to match backend
}

// Mock data storage for tasks (keep for now until we build task endpoints)
let mockTasks: Task[] = [
  {
    id: 1,
    name: "Setup project structure",  // Changed from 'title'
    contents: "Initialize the project with proper folder structure",  // Changed from 'description'
    type: 'task',
    status: 'Done',  // Changed from 'Completed'
    priority: 'High',
    assignee: "John Doe",
    progress: 100,
    project_id: 1,  // Changed from 'user_id' and added project_id
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "Design user interface",  // Changed from 'title'
    contents: "Create mockups and wireframes for the application",  // Changed from 'description'
    type: 'task',
    status: 'In Progress',
    priority: 'Medium',
    assignee: "Jane Smith",
    progress: 60,
    project_id: 1,  // Changed from 'user_id' and added project_id
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: "Implement authentication",  // Changed from 'title'
    contents: "Set up user login and registration system",  // Changed from 'description'
    type: 'task',
    status: 'Todo',
    priority: 'High',
    assignee: "Bob Johnson",
    progress: 0,
    project_id: 1,  // Changed from 'user_id' and added project_id
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let mockProjects: any[] = [
  {
    id: 1,
    name: "TaskHive Management System",
    description: "A comprehensive task and project management tool",
    user_id: 1,
    due_date: "2024-12-31",
    priority: "High",
    status: "In Progress",
    createdAt: new Date().toISOString()
  }
];

let nextTaskId = 4;
let nextProjectId = 2;

// Utility function to simulate API delay
const mockDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Tasks API functions (keeping mock for now)
export const tasksApi = {
  // Get all tasks grouped by status
  getTasksByStatus: async (): Promise<TasksByStatus> => {
    await mockDelay();
    
    const groupedTasks: TasksByStatus = {
      'Todo': mockTasks.filter(task => task.status === 'Todo'),
      'In Progress': mockTasks.filter(task => task.status === 'In Progress'),
      'Done': mockTasks.filter(task => task.status === 'Done'),  // Changed from 'Completed'
    };
    
    return groupedTasks;
  },

  // Get all tasks
  getAllTasks: async (): Promise<Task[]> => {
    await mockDelay();
    return [...mockTasks];
  },

  // Create a new task
  createTask: async (task: CreateTaskRequest): Promise<Task> => {
    await mockDelay();
    
    const newTask: Task = {
      id: nextTaskId++,
      ...task,
      status: task.status || 'Todo',
      priority: task.priority || 'Medium',
      progress: task.progress || 0,
      project_id: 1, // Mock project ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockTasks.push(newTask);
    return newTask;
  },

  // Update a task
  updateTask: async (id: number, updates: UpdateTaskRequest): Promise<Task> => {
    await mockDelay();
    
    const taskIndex = mockTasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    mockTasks[taskIndex] = {
      ...mockTasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return mockTasks[taskIndex];
  },

  // Update task status
  updateTaskStatus: async (taskId: number, status: string): Promise<any> => {
    await mockDelay();
    
    const taskIndex = mockTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    mockTasks[taskIndex] = {
      ...mockTasks[taskIndex],
      status: status as 'Todo' | 'In Progress' | 'Done',  // Changed from 'Completed'
      updatedAt: new Date().toISOString()
    };
    
    return { success: true, data: mockTasks[taskIndex] };
  },

  // Get all projects
  getAllProjects: async (): Promise<any[]> => {
    await mockDelay();
    return [...mockProjects];
  },

  // Create a new project
  createProject: async (projectData: {
    name: string;
    description?: string;
    user_id: number;
    due_date?: string;
    priority?: string;
  }): Promise<any> => {
    await mockDelay();
    
    const newProject = {
      id: nextProjectId++,
      ...projectData,
      status: "Todo",
      createdAt: new Date().toISOString()
    };
    
    mockProjects.push(newProject);
    return { success: true, data: newProject };
  },

  // Create changelog entry
  createChangelog: async (taskId: number, oldStatus: string, newStatus: string, remark: string): Promise<any> => {
    await mockDelay();
    
    console.log('Mock changelog created:', {
      task_id: taskId,
      old_status: oldStatus,
      new_status: newStatus,
      remark: remark,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, message: "Changelog created successfully" };
  },

  // Delete a task
  deleteTask: async (id: number): Promise<void> => {
    await mockDelay();
    
    const taskIndex = mockTasks.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    mockTasks.splice(taskIndex, 1);
  },

  // Get a single task
  getTask: async (id: number): Promise<Task> => {
    await mockDelay();
    
    const task = mockTasks.find(task => task.id === id);
    if (!task) {
      throw new Error('Task not found');
    }
    
    return task;
  },
};