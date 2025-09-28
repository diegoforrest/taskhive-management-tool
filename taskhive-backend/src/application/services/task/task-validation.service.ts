import { Injectable, BadRequestException } from '@nestjs/common';
import { TaskStatus, TaskPriority, TaskType } from '../../../modules/tasks/entities/task.entity';

@Injectable()
export class TaskValidationService {
  validateTaskName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Task name is required');
    }

    if (name.length > 200) {
      throw new BadRequestException('Task name cannot exceed 200 characters');
    }
  }

  validateTaskContents(contents?: string): void {
    if (contents && contents.length > 5000) {
      throw new BadRequestException('Task contents cannot exceed 5000 characters');
    }
  }

  validateTaskStatus(status: string): TaskStatus {
    const validStatuses = Object.values(TaskStatus);
    if (!validStatuses.includes(status as TaskStatus)) {
      throw new BadRequestException(
        `Invalid status. Valid options are: ${validStatuses.join(', ')}`
      );
    }
    return status as TaskStatus;
  }

  validateTaskPriority(priority: string): TaskPriority {
    const validPriorities = Object.values(TaskPriority);
    if (!validPriorities.includes(priority as TaskPriority)) {
      throw new BadRequestException(
        `Invalid priority. Valid options are: ${validPriorities.join(', ')}`
      );
    }
    return priority as TaskPriority;
  }

  validateTaskType(type: string): TaskType {
    const validTypes = Object.values(TaskType);
    if (!validTypes.includes(type as TaskType)) {
      throw new BadRequestException(
        `Invalid task type. Valid options are: ${validTypes.join(', ')}`
      );
    }
    return type as TaskType;
  }

  validateDueDate(dueDate: string | Date): Date {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    return date;
  }

  validateAssignee(assignee: string): void {
    if (assignee && assignee.trim().length === 0) {
      throw new BadRequestException('Assignee cannot be empty string');
    }

    if (assignee && assignee.length > 100) {
      throw new BadRequestException('Assignee name cannot exceed 100 characters');
    }
  }

  validateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    if (!Number.isInteger(progress)) {
      throw new BadRequestException('Progress must be an integer');
    }
  }

  validateTaskData(data: {
    name: string;
    contents?: string;
    status?: string;
    priority?: string;
    type?: string;
    due_date?: string | Date;
    assignee?: string;
    progress?: number;
  }): {
    name: string;
    contents?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    due_date?: Date;
    assignee?: string;
    progress?: number;
  } {
    this.validateTaskName(data.name);
    
    if (data.contents !== undefined) {
      this.validateTaskContents(data.contents);
    }

    if (data.assignee !== undefined) {
      this.validateAssignee(data.assignee);
    }

    const validated: any = {
      name: data.name.trim(),
      contents: data.contents?.trim(),
      assignee: data.assignee?.trim() || undefined,
    };

    if (data.status) {
      validated.status = this.validateTaskStatus(data.status);
    }

    if (data.priority) {
      validated.priority = this.validateTaskPriority(data.priority);
    }

    if (data.type) {
      validated.type = this.validateTaskType(data.type);
    }

    if (data.due_date) {
      validated.due_date = this.validateDueDate(data.due_date);
    }

    if (data.progress !== undefined) {
      this.validateProgress(data.progress);
      validated.progress = data.progress;
    }

    return validated;
  }

  validateTaskTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    // Define valid status transitions
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.ON_HOLD, TaskStatus.REQUEST_CHANGES, TaskStatus.TODO],
      [TaskStatus.COMPLETED]: [TaskStatus.REQUEST_CHANGES, TaskStatus.TODO], // Allow reopening
      [TaskStatus.ON_HOLD]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
      [TaskStatus.REQUEST_CHANGES]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  validateOwnership(
    task: { project: { user_id: number } } | { project_id: number },
    projectOwnerUserId: number,
    requestingUserId: number,
    userRoles: string[] = []
  ): boolean {
    // Admin can access any task
    if (userRoles.includes('admin')) {
      return true;
    }

    // Project owner can access tasks in their project
    const taskProjectUserId = 'project' in task ? task.project.user_id : projectOwnerUserId;
    return taskProjectUserId === requestingUserId;
  }
}