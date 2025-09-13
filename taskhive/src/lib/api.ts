// Real API configuration for TaskHive Backend
// Use NEXT_PUBLIC_API_BASE_URL when deployed (Vercel) or fall back to localhost for local dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://taskhive-backend-cjry.onrender.com';

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

// Generic API response shape
export type ApiResponse<T = unknown> = {
  success?: boolean
  data?: T
  message?: string
} | T

import axios, { AxiosInstance } from 'axios';

// Create axios instance with baseURL and sensible defaults
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10s timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

// Centralized response/error interceptor to normalize errors across the app.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returned structured JSON, prefer that
    if (error && error.response) {
      const { status, data } = error.response;
      // If body is HTML (some servers return HTML error pages), normalize it
      if (typeof data === 'string' && data.toLowerCase().includes('<html')) {
        return Promise.reject({ message: 'Server error — please try again later.', status });
      }
      // If data has message or error fields, use them
      if (data && (data.message || data.error)) {
        return Promise.reject({ message: data.message || data.error, data, status });
      }
      // Fallback: if there's a status code, give a friendly message
      if (status >= 500) {
        return Promise.reject({ message: 'Server error — please try again later.', data, status });
      }
      return Promise.reject({ message: (data && data.message) || JSON.stringify(data) || 'Request failed', data, status });
    }

    // Network/unknown error
    return Promise.reject({ message: error?.message || 'Network error' });
  }
);

// Utility wrapper to call axios and normalize responses to ApiResponse<T>
const apiRequest = async (endpoint: string, options: { method?: string; data?: unknown; params?: Record<string, unknown>; headers?: Record<string, string> } = {}): Promise<ApiResponse<unknown>> => {
  try {
    const method = (options.method || 'GET').toUpperCase();

    // Ensure request bodies are sent as valid JSON text. Some environments
    // (proxies, CLI quoting, or accidental double-stringify) can cause the
    // server to receive malformed JSON. Explicitly stringify objects here
    // and set a strict Content-Type to reduce that class of errors.
    let requestData: unknown = options.data;
    const headers = {
      ...(options.headers || {}),
      // Ensure charset is included which helps some servers parse correctly
      'Content-Type': (options.headers && options.headers['Content-Type']) || 'application/json; charset=utf-8',
    } as Record<string, string>;

    if (requestData !== undefined && requestData !== null) {
      // If caller passed an object, stringify it exactly once.
      if (typeof requestData === 'object' && !(requestData instanceof FormData) && !(requestData instanceof URLSearchParams)) {
        requestData = JSON.stringify(requestData);
      }
    }

    const res = await axiosInstance.request({
      url: endpoint,
      method,
      data: requestData,
      params: options.params,
      headers,
    });

    // axios already parses JSON responses
    return res.data as ApiResponse<unknown>;
  } catch (error: any) {
    // Normalize error for callers
    console.error('API Request Error:', error?.message || error);
    if (error?.response && error.response.data) {
      // Backend returned structured error
      throw error.response.data;
    }
    throw error;
  }
};

// Authentication API functions
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    console.log('Real API login request:', credentials);
    
    return (await apiRequest('/testlogin', {
      method: 'POST',
      data: credentials,
    })) as LoginResponse;
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    console.log('Real API registration request:', userData);
    
    return (await apiRequest('/test01/create_member', {
      method: 'POST',
      data: userData,
    })) as RegisterResponse;
  },

  createProject: async (projectData: {
    user_id: number;
    name: string;
    description?: string;
  }): Promise<ApiResponse<Project>> => {
    console.log('Real API create project request:', projectData);
    
    const res = await apiRequest('/test02/create_project', {
      method: 'POST',
      data: projectData,
    }) as ApiResponse<Project>;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('projectCreated'))
      window.dispatchEvent(new Event('projectsUpdated'))
    }
    return res
  },

  getProjects: async (user_id: number): Promise<ApiResponse<Project[]>> => {
    console.log('Real API get projects request for user_id:', user_id);
    
    return (await apiRequest(`/test03/get_projects?user_id=${user_id}`, {
      method: 'GET',
    })) as ApiResponse<Project[]>;
  },

  updateProject: async (projectId: number, updateData: {
    name?: string;
    description?: string;
    priority?: string;
    due_date?: string;
    status?: string;
  }): Promise<ApiResponse<Project>> => {
    console.log('Real API update project request:', { projectId, updateData });
    
    const res = await apiRequest(`/test04/update_project/${projectId}`, {
      method: 'POST',
      data: updateData,
    }) as ApiResponse<Project>;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('projectUpdated'))
      window.dispatchEvent(new Event('projectsUpdated'))
    }
    return res
  },

  deleteProject: async (projectId: number): Promise<ApiResponse<unknown>> => {
    console.log('Real API delete project request:', projectId);
    
    const res = await apiRequest(`/test09/delete_project/${projectId}`, {
      method: 'POST',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('projectDeleted'))
      window.dispatchEvent(new Event('projectsUpdated'))
    }
  return res
  },

  getProject: async (projectId: number, user_id: number): Promise<{ success: boolean; data: Project }> => {
    console.log('Real API get project request:', { projectId, user_id });
    
    // Since we don't have a single project endpoint, get all projects and filter
    const response = await apiRequest(`/test03/get_projects?user_id=${user_id}`, {
      method: 'GET',
    });
    
    // response may be ApiResponse<Project[]> or Project[]
    if (typeof response === 'object' && response !== null && 'data' in response) {
      const maybeData = (response as Record<string, unknown>)['data'];
      if (Array.isArray(maybeData)) {
        const project = (maybeData as Project[]).find((p) => p.id === projectId);
        if (project) {
          return { success: true, data: project };
        }
        throw new Error('Project not found');
      }
    } else if (Array.isArray(response)) {
      const project = (response as Project[]).find((p) => p.id === projectId);
      if (project) {
        return { success: true, data: project };
      }
      throw new Error('Project not found');
    }

    throw new Error('Failed to fetch projects');
  },

  // Update user profile on the backend
  updateUser: async (userId: number, updateData: { email?: string; firstName?: string; lastName?: string }) => {
    console.log('Real API update user request:', userId, updateData)
    const res = await apiRequest(`/test11/update_user/${userId}`, {
      method: 'POST',
      data: updateData,
    })
    return res
  },

  // Change password endpoint
  changePassword: async (userId: number, currentPassword: string, newPassword: string) => {
    console.log('Real API change password request for user:', userId)
    const res = await apiRequest(`/test12/change_password/${userId}`, {
      method: 'POST',
      data: { currentPassword, newPassword },
    })
    return res
  },

  // Verify password without changing it
  verifyPassword: async (userId: number, password: string) => {
    console.log('Real API verify password request for user:', userId)
    const res = await apiRequest(`/test13/verify_password/${userId}`, {
      method: 'POST',
      data: { password },
    })
    return res
  },

  // Request password reset (forgot password)
  // NOTE: Assumes backend exposes POST /test14/forgot_password accepting { email }
  requestPasswordReset: async (email: string) => {
    console.log('Real API request password reset for:', email)
    const res = await apiRequest(`/test14/forgot_password`, {
      method: 'POST',
      data: { email },
    })
    return res
  },

  // Reset password using token (frontend calls POST /test15/reset_password { token, newPassword })
  resetPassword: async (token: string, newPassword: string) => {
    console.log('Real API reset password request')
    const res = await apiRequest(`/test15/reset_password`, {
      method: 'POST',
      data: { token, newPassword },
    })
    return res
  },

  // Reset password using tid + token
  resetPasswordWithTid: async (tid: number, token: string, newPassword: string) => {
    console.log('Real API reset password with tid request')
    const res = await apiRequest(`/test15/reset_password`, {
      method: 'POST',
      data: { tid, token, newPassword },
    })
    return res
  },

  // Validate reset token (tid + token)
  validateReset: async (tid: number, token: string) => {
    console.log('Real API validate reset token')
    const res = await apiRequest(`/test16/validate_reset?tid=${tid}&token=${encodeURIComponent(token)}`, {
      method: 'GET',
    })
    return res
  },

  createTask: async (taskData: {
    project_id: number;
    name: string;
    contents?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }): Promise<ApiResponse<Task>> => {
    console.log('Real API create task request:', taskData);
    
    const res = await apiRequest('/test05/create_task', {
      method: 'POST',
      data: taskData,
    }) as ApiResponse<Task>;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taskCreated'))
      window.dispatchEvent(new Event('tasksUpdated'))
    }
    return res
  },

  getTasks: async (project_id: number): Promise<ApiResponse<Task[]>> => {
    console.log('Real API get tasks request for project_id:', project_id);
    
    return (await apiRequest(`/test06/get_tasks?project_id=${project_id}`, {
      method: 'GET',
    })) as ApiResponse<Task[]>;
  },

  deleteTask: async (taskId: number): Promise<ApiResponse<unknown>> => {
    console.log('Real API delete task request:', taskId);
    
    const res = await apiRequest(`/test07/delete_task/${taskId}`, {
      method: 'POST',
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taskDeleted'))
      window.dispatchEvent(new Event('tasksUpdated'))
    }
  return res
  },

  updateTask: async (taskId: number, updateData: {
    name?: string;
    contents?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }): Promise<ApiResponse<Task>> => {
    console.log('Real API update task request:', taskId, updateData);
    
    const res = await apiRequest(`/test08/update_task/${taskId}`, {
      method: 'POST',
      data: updateData,
    }) as ApiResponse<Task>;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taskUpdated'))
      window.dispatchEvent(new Event('tasksUpdated'))
    }
    return res
  },
};

// Task interfaces
export interface Task {
  id: number;
  name: string;  // Changed from 'title' to match backend
  // Legacy aliases kept for compatibility with components that still use older field names
  title?: string;
  contents?: string;  // Changed from 'description' to match backend
  description?: string;
  // legacy dueDate camelCase alias
  dueDate?: string;
  // UI helper: optional URL anchor used by sidebar and links
  url?: string;
  type?: 'task' | 'project';
  status: 'Todo' | 'In Progress' | 'Done' | 'Completed';  // Accept both backend and legacy enums
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

export type UpdateTaskRequest = Partial<CreateTaskRequest>

export interface TasksByStatus {
  'Todo': Task[];
  'In Progress': Task[];
  'Done': Task[];  // Changed from 'Completed' to match backend
  'Completed'?: Task[]; // legacy variant
}

// Mock data storage for tasks (keep for now until we build task endpoints)
const mockTasks: Task[] = [
  {
    id: 1,
  name: "Setup project structure",  // Changed from 'title'
  title: "Setup project structure",
  contents: "Initialize the project with proper folder structure",  // Changed from 'description'
  description: "Initialize the project with proper folder structure",
    type: 'task',
    status: 'Done',  // Changed from 'Completed'
    priority: 'High',
    assignee: "John Doe",
    progress: 100,
  project_id: 1,  // Changed from 'user_id' and added project_id
  due_date: undefined,
  dueDate: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
  name: "Design user interface",  // Changed from 'title'
  title: "Design user interface",
  contents: "Create mockups and wireframes for the application",  // Changed from 'description'
  description: "Create mockups and wireframes for the application",
    type: 'task',
    status: 'In Progress',
    priority: 'Medium',
    assignee: "Jane Smith",
    progress: 60,
  project_id: 1,  // Changed from 'user_id' and added project_id
  due_date: undefined,
  dueDate: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
  name: "Implement authentication",  // Changed from 'title'
  title: "Implement authentication",
  contents: "Set up user login and registration system",  // Changed from 'description'
  description: "Set up user login and registration system",
    type: 'task',
    status: 'Todo',
    priority: 'High',
    assignee: "Bob Johnson",
    progress: 0,
  project_id: 1,  // Changed from 'user_id' and added project_id
  due_date: undefined,
  dueDate: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export interface Project {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  due_date?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
}

const mockProjects: Project[] = [
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
export interface ChangeLogEntry {
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
  updateTaskStatus: async (taskId: number, status: string): Promise<ApiResponse<unknown>> => {
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
    
    const res = { success: true, data: mockTasks[taskIndex] };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('taskUpdated'))
      window.dispatchEvent(new Event('tasksUpdated'))
    }
    return res;
  },
  // Get all projects
  getAllProjects: async (): Promise<Project[]> => {
    await mockDelay();
    return [...mockProjects];
  },

  // Create a new project (mock)
  createProject: async (projectData: {
    name: string;
    description?: string;
    user_id: number;
    due_date?: string;
    priority?: string;
  }): Promise<ApiResponse<Project>> => {
    await mockDelay();

    const newProject: Project = {
      id: nextProjectId++,
      ...projectData,
      status: "Todo",
      createdAt: new Date().toISOString()
  };
  mockProjects.push(newProject);

  return { success: true, data: newProject };
  },

  // Create changelog entry
  createChangelog: async (taskId: number, oldStatus: string, newStatus: string, remark: string, projectId?: number, userId?: number): Promise<ApiResponse<unknown>> => {
    // Try to call backend endpoint first
    try {
      const currentUserId = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).CURRENT_USER_ID ? Number((window as unknown as Record<string, unknown>).CURRENT_USER_ID) : 1;
      const payload: Record<string, unknown> = {
        task_id: taskId,
        old_status: oldStatus,
        new_status: newStatus,
        remark,
        user_id: userId ?? currentUserId,
      };
      if (typeof projectId === 'number') payload.project_id = projectId;
      const res = await apiRequest('/test10/create_changelog', {
        method: 'POST',
        data: payload,
      });
      return res;
    } catch (e) {
      console.warn('Backend changelog call failed, falling back to mock:', e);
      await mockDelay();
      return { success: true, message: 'Changelog created (mock)' };
    }
  },

  // Fetch changelogs for a task or project
  getChangelogs: async (taskId?: number, projectId?: number): Promise<ApiResponse<ChangeLogEntry[]>> => {
    const q: string[] = [];
    if (typeof taskId === 'number') q.push(`task_id=${taskId}`);
    if (typeof projectId === 'number') q.push(`project_id=${projectId}`);
    const query = q.length ? `?${q.join('&')}` : '';
    try {
  const res = await apiRequest(`/test10/get_changelogs${query}`, { method: 'GET' });
  return res as ApiResponse<ChangeLogEntry[]>;
    } catch (e) {
      console.warn('Failed to fetch changelogs:', e);
      return { success: false, data: [] };
    }
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