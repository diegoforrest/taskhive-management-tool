import { Task } from '../../../domain/entities/Task';
import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';

export interface GetTasksByProjectRequest {
  projectId: number;
}

export interface GetTasksByProjectResponse {
  success: boolean;
  tasks?: Task[];
  message?: string;
}

export class GetTasksByProjectUseCase {
  constructor(private readonly taskRepository: ITaskRepository) {}

  async execute(request: GetTasksByProjectRequest): Promise<GetTasksByProjectResponse> {
    try {
      const tasks = await this.taskRepository.findByProjectId(request.projectId);

      return {
        success: true,
        tasks,
        message: 'Tasks retrieved successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to get tasks'
      };
    }
  }
}