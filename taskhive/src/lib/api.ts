const API_BASE_URL = 'http://localhost:3001/api';

interface ApiResponse<T> {
  data: T;
}

interface LoginRequest {
  user_id: string;
  password: string;
}

interface RegisterRequest {
  user_id: string;
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    user_id: string;
    email?: string;
  };
  token?: string;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
}

// Task interfaces
export interface Task {
  id: number;
  title: string;
  description?: string;
  type: 'task' | 'project';
  status: 'Todo' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assignee?: string;
  progress?: number;
  user_id?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type: 'task' | 'project';
  status?: 'Todo' | 'In Progress' | 'Completed';
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assignee?: string;
  progress?: number;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {}

export interface TasksByStatus {
  'Todo': Task[];
  'In Progress': Task[];
  'Completed': Task[];
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('authContext');
    if (authData) {
      const parsedData = JSON.parse(authData);
      return parsedData.token;
    }
  }
  return null;
}

// API utility function
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Authentication API functions
export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      console.log('Sending login request:', credentials);
      const response = await apiRequest<any>('/testlogin', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      console.log('Login API response:', response);
      
      // Handle different possible response formats
      if (response.success || (response.data && response.data.success)) {
        return {
          success: true,
          user: {
            user_id: response.user_id || response.data?.user_id || credentials.user_id,
            email: response.email || response.data?.email,
          },
          token: response.access_token || response.token,
        };
      } else {
        return {
          success: false,
          message: response.message || response.data?.message || response.error || 'Invalid credentials',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed. Please try again.',
      };
    }
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    try {
      console.log('Sending registration request:', userData);
      const response = await apiRequest<any>('/test01/create_member', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      console.log('Registration API response:', response);
      
      // Handle different possible response formats
      if (response.success || (response.data && response.data.success)) {
        return {
          success: true,
          message: response.message || response.data?.message || 'Account created successfully',
        };
      } else {
        return {
          success: false,
          message: response.message || response.data?.message || response.error || 'Registration failed',
        };
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed. Please try again.',
      };
    }
  },
};

// Tasks API functions
export const tasksApi = {
  // Get all tasks grouped by status
  getTasksByStatus: async (): Promise<TasksByStatus> => {
    try {
      const response = await apiRequest<TasksByStatus>('/tasks?grouped=true');
      return response;
    } catch (error) {
      console.error('Failed to fetch tasks by status:', error);
      throw error;
    }
  },

  // Get all tasks
  getAllTasks: async (): Promise<Task[]> => {
    try {
      const response = await apiRequest<Task[]>('/tasks');
      return response;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      throw error;
    }
  },

  // Create a new task
  createTask: async (task: CreateTaskRequest): Promise<Task> => {
    try {
      const response = await apiRequest<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify(task),
      });
      return response;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  // Update a task
  updateTask: async (id: number, updates: UpdateTaskRequest): Promise<Task> => {
    try {
      const response = await apiRequest<Task>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return response;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  },

  // Update task status
  updateTaskStatus: async (id: number, status: string): Promise<Task> => {
    try {
      const response = await apiRequest<Task>(`/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response;
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  },

  // Delete a task
  deleteTask: async (id: number): Promise<void> => {
    try {
      await apiRequest<{ message: string }>(`/tasks/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  },

  // Get a single task
  getTask: async (id: number): Promise<Task> => {
    try {
      const response = await apiRequest<Task>(`/tasks/${id}`);
      return response;
    } catch (error) {
      console.error('Failed to fetch task:', error);
      throw error;
    }
  },
};