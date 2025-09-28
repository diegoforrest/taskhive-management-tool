import { Injectable, BadRequestException } from '@nestjs/common';
import { Priority, ProjectStatus } from '../../../modules/projects/entities/project.entity';

@Injectable()
export class ProjectValidationService {
  validateProjectName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Project name is required');
    }

    if (name.length > 200) {
      throw new BadRequestException('Project name cannot exceed 200 characters');
    }
  }

  validateProjectDescription(description?: string): void {
    if (description && description.length > 2000) {
      throw new BadRequestException('Project description cannot exceed 2000 characters');
    }
  }

  validatePriority(priority: string): Priority {
    const validPriorities = Object.values(Priority);
    if (!validPriorities.includes(priority as Priority)) {
      throw new BadRequestException(
        `Invalid priority. Valid options are: ${validPriorities.join(', ')}`
      );
    }
    return priority as Priority;
  }

  validateStatus(status: string): ProjectStatus {
    const validStatuses = Object.values(ProjectStatus);
    if (!validStatuses.includes(status as ProjectStatus)) {
      throw new BadRequestException(
        `Invalid status. Valid options are: ${validStatuses.join(', ')}`
      );
    }
    return status as ProjectStatus;
  }

  validateDueDate(dueDate: string | Date): Date {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    // Check if due date is in the past (optional business rule)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      throw new BadRequestException('Due date cannot be in the past');
    }

    return date;
  }

  validateProgress(progress: number): void {
    if (progress < 0 || progress > 100) {
      throw new BadRequestException('Progress must be between 0 and 100');
    }

    if (!Number.isInteger(progress)) {
      throw new BadRequestException('Progress must be an integer');
    }
  }

  validateProjectData(data: {
    name: string;
    description?: string;
    priority?: string;
    status?: string;
    due_date?: string | Date;
    progress?: number;
  }): {
    name: string;
    description?: string;
    priority?: Priority;
    status?: ProjectStatus;
    due_date?: Date;
    progress?: number;
  } {
    this.validateProjectName(data.name);
    
    if (data.description !== undefined) {
      this.validateProjectDescription(data.description);
    }

    const validated: any = {
      name: data.name.trim(),
      description: data.description?.trim(),
    };

    if (data.priority) {
      validated.priority = this.validatePriority(data.priority);
    }

    if (data.status) {
      validated.status = this.validateStatus(data.status);
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

  validateOwnership(project: { user_id: number }, requestingUserId: number, userRoles: string[] = []): boolean {
    // Admin can access any project
    if (userRoles.includes('admin')) {
      return true;
    }

    // Owner can access their own project
    return project.user_id === requestingUserId;
  }
}