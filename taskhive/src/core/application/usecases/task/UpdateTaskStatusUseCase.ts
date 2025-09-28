import { ITaskRepository } from '../../../domain/repositories/ITaskRepository';
import { Task, TaskStatus } from '../../../domain/entities/Task';
import { NotFoundError } from '@/shared/errors/NotFoundError';

export interface UpdateTaskStatusUseCaseRequest {
  taskId: number;
  newStatus: TaskStatus;
  projectId: number;
}

export interface UpdateTaskStatusUseCaseResponse {
  task: Task;
  previousStatus: TaskStatus;
  message: string;
}

export class UpdateTaskStatusUseCase {
  constructor(private taskRepository: ITaskRepository) {}

  async execute(request: UpdateTaskStatusUseCaseRequest, _userId: number): Promise<UpdateTaskStatusUseCaseResponse> {
    const { taskId, newStatus, projectId } = request;

    // Find the task by getting all tasks in the project and filtering
    const projectTasks = await this.taskRepository.findByProjectId(projectId);
    const task = projectTasks.find(t => t.id === taskId);
    
    if (!task) {
      throw new NotFoundError('Task');
    }

    const previousStatus = task.status;

    // Create a new task entity with updated status
    // This will validate the status transition
    const taskEntity = Task.fromData(task.toData());
    taskEntity.changeStatus(newStatus);

    // Update in repository
    const updatedTask = await this.taskRepository.updateStatus(taskId, newStatus);

    // Here we could add business logic like:
    // - Log status change in changelog
    // - Send notifications to assignees/watchers
    // - Update project progress
    // - Trigger workflow automation
    // - etc.

    return {
      task: updatedTask,
      previousStatus,
      message: `Task status updated from ${previousStatus} to ${newStatus}`,
    };
  }
}