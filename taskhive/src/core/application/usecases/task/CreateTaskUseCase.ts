import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { IProjectRepository } from '../../../domain/repositories/IProjectRepository';
import { Task, CreateTaskData } from '../../../domain/entities/Task';
import { UserId } from '../../../domain/valueObjects/UserId';
import { ProjectId } from '../../../domain/valueObjects/ProjectId';
import { NotFoundError } from '@/shared/errors/NotFoundError';

export type CreateTaskUseCaseRequest = CreateTaskData;

export interface CreateTaskUseCaseResponse {
  task: Task;
  message: string;
}

export class CreateTaskUseCase {
  constructor(
    private taskRepository: ITaskRepository,
    private projectRepository: IProjectRepository
  ) {}

  async execute(request: CreateTaskUseCaseRequest, userId: UserId): Promise<CreateTaskUseCaseResponse> {
    // Verify project exists and user has access
    const projectId = new ProjectId(request.project_id);
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError('Project');
    }

    // Verify user owns the project
    if (!project.userId.equals(userId)) {
      throw new Error('You do not have permission to add tasks to this project');
    }

    // Validate task data through Task entity creation
    Task.create(request);

    // Save to repository
    const savedTask = await this.taskRepository.create(request);

    // Here we could add business logic like:
    // - Send notifications to assignees
    // - Log task creation in changelog
    // - Update project statistics
    // - etc.

    return {
      task: savedTask,
      message: 'Task created successfully',
    };
  }
}