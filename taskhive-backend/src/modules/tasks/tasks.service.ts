import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskManagementService, TaskQueryService } from '../../application/services/task';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private readonly taskManagementService: TaskManagementService,
    private readonly taskQueryService: TaskQueryService,
  ) {}

  createTask(projectId: number, payload: any) {
    return this.taskManagementService.createTask(projectId, payload);
  }

  getTasksByProjectId(projectId?: number | undefined) {
    return this.taskQueryService.getTasksByProjectId(projectId as number);
  }

  async deleteTask(taskId: number, requestingUserId: number, requestingUserRoles: string[] = []) {
    return this.taskManagementService.deleteTask(taskId, requestingUserId, requestingUserRoles);
  }

  updateTask(taskId: number, dto: any) {
    return this.taskManagementService.updateTask(taskId, dto);
  }
}
