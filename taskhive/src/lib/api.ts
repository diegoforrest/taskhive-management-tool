const API_BASE_URL = 'https://m-backend.dowinnsys.com';

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
  user_id?: string;
  email?: string;
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
      const response = await fetch(`${API_BASE_URL}/testlogin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      
      console.log('Login response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login failed with status:', response.status, errorText);
        return {
          success: false,
          message: `Login failed: ${response.status} - ${errorText}`,
        };
      }
      
      const result = await response.json();
      console.log('Login API response:', result);
      
      // Handle successful response
      if (result.data) {
        // Get the numeric user_id from the members table
        let numericUserId = result.data.user_id;
        
        // If API doesn't return numeric user_id, look it up from members table
        if (!numericUserId || isNaN(parseInt(numericUserId))) {
          console.log('API did not return numeric user_id, looking up from members...');
          
          try {
            const membersResponse = await fetch(`${API_BASE_URL}/test01/get_all_member`);
            if (membersResponse.ok) {
              const membersData = await membersResponse.json();
              const members = membersData.data || membersData;
              const userRecord = members.find((member: any) => member.email === credentials.user_id);
              
              if (userRecord) {
                numericUserId = userRecord.id;
                console.log(`Found numeric user_id: ${numericUserId} for email: ${credentials.user_id}`);
              }
            }
          } catch (error) {
            console.error('Failed to lookup user_id from members:', error);
          }
        }
        
        return {
          success: true,
          user: {
            user_id: numericUserId ? String(numericUserId) : credentials.user_id,
            email: credentials.user_id,
          },
          token: result.data.token || result.data.access_token,
          message: 'Login successful',
        };
      } else {
        console.error('Login API response missing data field:', result);
        return {
          success: false,
          message: result.message || 'Login failed - no data returned',
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.message || 'Login failed. Please check your connection.',
      };
    }
  },

  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    try {
      console.log('Sending registration request:', userData);
      const response = await fetch(`${API_BASE_URL}/test01/create_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      console.log('Registration response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Registration failed with status:', response.status, errorText);
        return {
          success: false,
          message: `Registration failed: ${response.status} - ${errorText}`,
        };
      }
      
      const result = await response.json();
      console.log('Registration API response:', result);
      
      // Extract the numeric user ID from the registration response
      let numericUserId = result.data?.id || result.id;
      
      console.log('Extracted user ID from registration:', numericUserId);
      
      // Handle successful response
      return {
        success: true,
        message: result.message || 'Account created successfully',
        user_id: numericUserId ? String(numericUserId) : undefined,
        email: userData.email
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error.message || 'Registration failed. Please check your connection.',
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

  // Get all tasks from the real API
  getAllTasks: async (): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/test03/get_all_task`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get all tasks:', error);
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

  // Update task status using the real API
  updateTaskStatus: async (taskId: number, status: string): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/test03/patch_task`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          status: status,
          name: "Updated via review", // Required field
          contents: "Updated via review system" // Required field
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to update task status:', error);
      throw error;
    }
  },

  // Get all projects from the real API
  getAllProjects: async (): Promise<any[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/test02/get_all_project`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get all projects:', error);
      throw error;
    }
  },

  // Create a new project
  createProject: async (projectData: {
    name: string;
    description?: string;
    user_id: number; // Changed to number to match API
    due_date?: string;
    priority?: string;
  }): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/test02/create_project`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create project:', error);
      throw error;
    }
  },

  // Create changelog entry
  createChangelog: async (taskId: number, oldStatus: string, newStatus: string, remark: string): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/test04/create_changelog`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_id: taskId,
          old_status: oldStatus,
          new_status: newStatus,
          remark: remark
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to create changelog:', error);
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