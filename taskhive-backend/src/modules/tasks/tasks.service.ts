import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../../entities/task.entity';
import { Project } from '../../entities/project.entity';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(Project)
    private projectRepo: Repository<Project>,
    private readonly authService: AuthService,
  ) {}

  createTask(projectId: number, payload: any) {
    return this.authService.createTask(projectId, payload);
  }

  getTasksByProjectId(projectId?: number | undefined) {
    return this.authService.getTasksByProjectId(projectId as any);
  }

  async deleteTask(taskId: number, requestingUserId: number, requestingUserRoles: string[] = []) {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new Error('Task not found');

    // allow admin or owner of project
    const project = await this.projectRepo.findOne({ where: { id: task.project_id } });
    if (!project) throw new Error('Project not found');
    if (!(requestingUserRoles && requestingUserRoles.includes('admin')) && project.user_id !== requestingUserId) {
      throw new ForbiddenException('Not authorized to delete this task');
    }

    // Transactionally delete changelogs related to the task and the task itself
    const qr = this.taskRepo.manager.connection.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.manager.createQueryBuilder().delete().from('change_logs').where('task_id = :tid', { tid: taskId }).execute();
      await qr.manager.delete(Task, taskId as any);
      await qr.commitTransaction();
      return { success: true, message: 'Task deleted successfully' };
    } catch (e) {
      await qr.rollbackTransaction();
      throw new Error('Failed to delete task: ' + (e && e.message ? e.message : String(e)));
    } finally {
      await qr.release();
    }
  }

  updateTask(taskId: number, dto: any) {
    return this.authService.updateTask(taskId, dto as any);
  }
}
