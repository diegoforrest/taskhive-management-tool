import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';

export interface DeleteTaskRequest {
  taskId: number;
}

export interface DeleteTaskResponse {
  success: boolean;
  message?: string;
}

export class DeleteTaskUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(request: DeleteTaskRequest): Promise<DeleteTaskResponse> {
    try {
      // Check if task exists
      const existingTask = await this.taskRepository.findById(request.taskId);
      
      if (!existingTask) {
        return {
          success: false,
          message: 'Task not found'
        };
      }

      await this.taskRepository.delete(request.taskId);

      return {
        success: true,
        message: 'Task deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to delete task'
      };
    }
  }
}