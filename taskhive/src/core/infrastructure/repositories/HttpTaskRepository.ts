import { ITaskRepository, TasksByStatus } from '../../domain/repositories/ITaskRepository';
import { Task, TaskData, CreateTaskData, UpdateTaskData, TaskStatus } from '../../domain/entities/Task';
import { HttpClient } from '../http/ApiResponse';

export class HttpTaskRepository implements ITaskRepository {
  constructor(private httpClient: HttpClient) {}

  async create(taskData: CreateTaskData): Promise<Task> {
    const response = await this.httpClient.post<TaskData>('/tasks', taskData);

    const responseData = (response as any).data || response;
    if (!responseData || !responseData.id) {
      throw new Error('Failed to create task');
    }

    return Task.fromData(responseData);
  }

  async findById(_id: number): Promise<Task | null> {
    try {
      // The current API doesn't have a single task endpoint
      // This would require getting all tasks and filtering
      throw new Error('findById not implemented - requires single task endpoint');
    } catch {
      return null;
    }
  }

  async findByProjectId(projectId: number): Promise<Task[]> {
    const response = await this.httpClient.get<TaskData[]>(`/tasks?project_id=${projectId}`);

    const responseData = (response as any).data || response;
    if (!Array.isArray(responseData)) {
      return [];
    }

    return responseData.map(data => Task.fromData(data));
  }

  async update(id: number, taskData: UpdateTaskData): Promise<Task> {
    const response = await this.httpClient.post<TaskData>(`/tasks/${id}`, taskData);

    const responseData = (response as any).data || response;
    if (!responseData || !responseData.id) {
      throw new Error('Failed to update task');
    }

    return Task.fromData(responseData);
  }

  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    return this.update(id, { status });
  }

  async updateProgress(id: number, progress: number): Promise<Task> {
    return this.update(id, { progress });
  }

  async delete(id: number): Promise<void> {
    const response = await this.httpClient.post(`/tasks/delete/${id}`);

    const responseData = (response as any).data || response;
    if (!responseData.success) {
      throw new Error(responseData.message || 'Failed to delete task');
    }
  }

  // Helper method to get tasks grouped by status
  async getTasksByStatus(projectId: number): Promise<TasksByStatus> {
    const tasks = await this.findByProjectId(projectId);
    
    const groupedTasks: TasksByStatus = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.DONE]: [],
    };

    tasks.forEach(task => {
      // Handle legacy "Completed" status mapping to "Done"
      const status = task.status === TaskStatus.COMPLETED ? TaskStatus.DONE : task.status;
      if (groupedTasks[status]) {
        groupedTasks[status].push(task);
      }
    });

    return groupedTasks;
  }

  // Helper method to find a task by ID within a project
  async findByIdInProject(taskId: number, projectId: number): Promise<Task | null> {
    const tasks = await this.findByProjectId(projectId);
    return tasks.find(task => task.id === taskId) || null;
  }
}