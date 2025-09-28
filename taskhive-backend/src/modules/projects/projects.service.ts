import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { ProjectManagementService, ProjectQueryService } from '../../application/services/project';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    private readonly projectManagementService: ProjectManagementService,
    private readonly projectQueryService: ProjectQueryService,
  ) {}

  createProject(userId: number, name: string, description: string, due_date?: string | null, priority?: string) {
    return this.projectManagementService.createProject(userId, { 
      name, 
      description, 
      due_date, 
      priority: priority as 'Low' | 'Medium' | 'High' | undefined 
    });
  }

  getProjectsByUserId(userId: number) {
    return this.projectQueryService.getProjectsByUserId(userId);
  }

  updateProject(projectId: number, dto: any) {
    return this.projectManagementService.updateProject(projectId, dto);
  }

  // Deletes a project if the requestingUserId is owner or has admin role
  async deleteProject(projectId: number, requestingUserId: number, requestingUserRoles: string[] = []) {
    return this.projectManagementService.deleteProject(projectId, requestingUserId, requestingUserRoles);
  }
}
