import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    private readonly authService: AuthService,
  ) {}

  createProject(userId: number, name: string, description: string, due_date?: string | null, priority?: string) {
    return this.authService.createProject(userId, name, description, due_date, priority);
  }

  getProjectsByUserId(userId: number) {
    return this.authService.getProjectsByUserId(userId);
  }

  updateProject(projectId: number, dto: any) {
    return this.authService.updateProject(projectId, dto);
  }

  // Deletes a project if the requestingUserId is owner or has admin role
  async deleteProject(projectId: number, requestingUserId: number, requestingUserRoles: string[] = []) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new Error('Project not found');

    // Allow if admin
    if (requestingUserRoles && requestingUserRoles.includes('admin')) {
      // proceed with deletion
    } else if (project.user_id !== requestingUserId) {
      throw new ForbiddenException('Not authorized to delete this project');
    }

    // Perform deletion in a transaction: remove related changelogs, tasks, then project
    const qr = this.projectRepo.manager.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Delete changelogs that reference this project or tasks in this project
      await qr.query(
        'DELETE FROM `change_logs` WHERE `project_id` = ? OR `task_id` IN (SELECT `id` FROM `tasks` WHERE `project_id` = ?)',
        [projectId, projectId],
      );

      // Delete tasks
      await qr.manager.delete(Task, { project_id: projectId } as any);

      // Delete project
      await qr.manager.delete(Project, projectId as any);

      await qr.commitTransaction();
      return { success: true, message: 'Project and associated tasks deleted successfully' };
    } catch (e) {
      await qr.rollbackTransaction();
      throw new Error('Failed to delete project: ' + (e && e.message ? e.message : String(e)));
    } finally {
      await qr.release();
    }
  }
}
