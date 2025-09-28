import { Task, UpdateTaskData, TaskStatus, TaskPriority } from '../../../domain/entities/Task';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';

export interface UpdateTaskRequest {
  taskId: number;
  name?: string;
  contents?: string;
  status?: 'Todo' | 'In Progress' | 'Done';
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate?: Date | null;
  assignee?: string;
}

export interface UpdateTaskResponse {
  success: boolean;
  task?: Task;
  message?: string;
}

export class UpdateTaskUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(request: UpdateTaskRequest): Promise<UpdateTaskResponse> {
    try {
      // Get existing task to validate it exists
      const existingTask = await this.taskRepository.findById(request.taskId);
      
      if (!existingTask) {
        return {
          success: false,
          message: 'Task not found'
        };
      }

      // Create update data from request
      const updateData: UpdateTaskData = {};
      
      if (request.name !== undefined) {
        updateData.name = request.name;
      }
      
      if (request.contents !== undefined) {
        updateData.contents = request.contents;
      }
      
      if (request.status !== undefined) {
        // Convert string to TaskStatus enum
        switch(request.status) {
          case 'Todo':
            updateData.status = TaskStatus.TODO;
            break;
          case 'In Progress':
            updateData.status = TaskStatus.IN_PROGRESS;
            break;
          case 'Done':
            updateData.status = TaskStatus.DONE;
            break;
        }
      }
      
      if (request.priority !== undefined) {
        // Convert string to TaskPriority enum
        switch(request.priority) {
          case 'Low':
            updateData.priority = TaskPriority.LOW;
            break;
          case 'Medium':
            updateData.priority = TaskPriority.MEDIUM;
            break;
          case 'High':
            updateData.priority = TaskPriority.HIGH;
            break;
          case 'Critical':
            updateData.priority = TaskPriority.CRITICAL;
            break;
        }
      }
      
      if (request.dueDate !== undefined) {
        updateData.due_date = request.dueDate?.toISOString() || undefined;
      }
      
      if (request.assignee !== undefined) {
        updateData.assignee = request.assignee;
      }

      const result = await this.taskRepository.update(request.taskId, updateData);

      return {
        success: true,
        task: result,
        message: 'Task updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to update task'
      };
    }
  }
}