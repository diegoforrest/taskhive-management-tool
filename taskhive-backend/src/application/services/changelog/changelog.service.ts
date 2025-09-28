import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeLog } from '../../../modules/changelogs/entities/changelog.entity';

@Injectable()
export class ChangelogService {
  constructor(
    @InjectRepository(ChangeLog)
    private changelogRepository: Repository<ChangeLog>,
  ) {}

  async createChangelog(data: {
    taskId?: number | null;
    projectId?: number | null;
    userId: number;
    oldStatus?: string | null;
    newStatus?: string | null;
    description?: string;
    remark?: string | null;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const changelogData: Partial<ChangeLog> = {
        description: data.description || data.remark || '',
        old_status: data.oldStatus || undefined,
        new_status: data.newStatus || undefined,
        remark: data.remark || undefined,
        user_id: data.userId,
        project_id: data.projectId || undefined,
        task_id: data.taskId || undefined,
      };

      await this.changelogRepository.save(changelogData);

      return { success: true, message: 'Changelog recorded successfully' };
    } catch (error) {
      console.error('Failed to create changelog:', error);
      throw new Error(`Failed to create changelog: ${error.message}`);
    }
  }

  async getChangelogsByTask(taskId: number): Promise<{
    success: boolean;
    data: ChangeLog[];
  }> {
    try {
      const changelogs = await this.changelogRepository.find({
        where: { task_id: taskId },
        order: { createdAt: 'DESC' },
        relations: ['user'],
      });

      return { success: true, data: changelogs };
    } catch (error) {
      console.error('Failed to fetch task changelogs:', error);
      throw new Error(`Failed to fetch task changelogs: ${error.message}`);
    }
  }

  async getChangelogsByProject(projectId: number): Promise<{
    success: boolean;
    data: ChangeLog[];
  }> {
    try {
      const changelogs = await this.changelogRepository.find({
        where: { project_id: projectId },
        order: { createdAt: 'DESC' },
        relations: ['user', 'task', 'project'],
      });

      return { success: true, data: changelogs };
    } catch (error) {
      console.error('Failed to fetch project changelogs:', error);
      throw new Error(`Failed to fetch project changelogs: ${error.message}`);
    }
  }

  async getChangelogsByUser(userId: number): Promise<{
    success: boolean;
    data: ChangeLog[];
  }> {
    try {
      const changelogs = await this.changelogRepository.find({
        where: { user_id: userId },
        order: { createdAt: 'DESC' },
        relations: ['task', 'project'],
      });

      return { success: true, data: changelogs };
    } catch (error) {
      console.error('Failed to fetch user changelogs:', error);
      throw new Error(`Failed to fetch user changelogs: ${error.message}`);
    }
  }

  async getAllChangelogs(filters?: {
    taskId?: number;
    projectId?: number;
    userId?: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{
    success: boolean;
    data: ChangeLog[];
  }> {
    try {
      const query = this.changelogRepository.createQueryBuilder('changelog')
        .leftJoinAndSelect('changelog.user', 'user')
        .leftJoinAndSelect('changelog.task', 'task')
        .leftJoinAndSelect('changelog.project', 'project');

      if (filters?.taskId) {
        query.andWhere('changelog.task_id = :taskId', { taskId: filters.taskId });
      }

      if (filters?.projectId) {
        query.andWhere('changelog.project_id = :projectId', { projectId: filters.projectId });
      }

      if (filters?.userId) {
        query.andWhere('changelog.user_id = :userId', { userId: filters.userId });
      }

      if (filters?.fromDate) {
        query.andWhere('changelog.createdAt >= :fromDate', { fromDate: filters.fromDate });
      }

      if (filters?.toDate) {
        query.andWhere('changelog.createdAt <= :toDate', { toDate: filters.toDate });
      }

      const changelogs = await query
        .orderBy('changelog.createdAt', 'DESC')
        .getMany();

      return { success: true, data: changelogs };
    } catch (error) {
      console.error('Failed to fetch changelogs:', error);
      throw new Error(`Failed to fetch changelogs: ${error.message}`);
    }
  }

  // Utility methods for common changelog scenarios
  async logTaskStatusChange(
    taskId: number,
    userId: number,
    oldStatus: string,
    newStatus: string,
    projectId?: number
  ): Promise<void> {
    await this.createChangelog({
      taskId,
      projectId,
      userId,
      oldStatus,
      newStatus,
      description: `Task status changed from ${oldStatus} to ${newStatus}`,
    });
  }

  async logTaskCreation(
    taskId: number,
    userId: number,
    taskName: string,
    projectId: number
  ): Promise<void> {
    await this.createChangelog({
      taskId,
      projectId,
      userId,
      description: `Task "${taskName}" created`,
    });
  }

  async logTaskUpdate(
    taskId: number,
    userId: number,
    changes: string,
    projectId?: number
  ): Promise<void> {
    await this.createChangelog({
      taskId,
      projectId,
      userId,
      description: `Task updated: ${changes}`,
    });
  }

  async logProjectStatusChange(
    projectId: number,
    userId: number,
    oldStatus: string,
    newStatus: string
  ): Promise<void> {
    await this.createChangelog({
      projectId,
      userId,
      oldStatus,
      newStatus,
      description: `Project status changed from ${oldStatus} to ${newStatus}`,
    });
  }

  async logProjectCreation(
    projectId: number,
    userId: number,
    projectName: string
  ): Promise<void> {
    await this.createChangelog({
      projectId,
      userId,
      description: `Project "${projectName}" created`,
    });
  }
}