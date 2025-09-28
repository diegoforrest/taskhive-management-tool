import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus, Priority } from '../../../modules/projects/entities/project.entity';

@Injectable()
export class ProjectQueryService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async getProjectsByUserId(userId: number): Promise<{
    success: boolean;
    data: Project[];
    count: number;
  }> {
    const projects = await this.projectRepository.find({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: projects,
      count: projects.length,
    };
  }

  async getProjectById(projectId: number): Promise<Project | null> {
    return this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['user', 'tasks'],
    });
  }

  async getProjectsByStatus(
    userId: number,
    status: ProjectStatus
  ): Promise<Project[]> {
    return this.projectRepository.find({
      where: { user_id: userId, status },
      order: { updatedAt: 'DESC' },
    });
  }

  async getProjectsByPriority(
    userId: number,
    priority: Priority
  ): Promise<Project[]> {
    return this.projectRepository.find({
      where: { user_id: userId, priority },
      order: { due_date: 'ASC' },
    });
  }

  async getArchivedProjects(userId: number): Promise<Project[]> {
    return this.projectRepository.find({
      where: { user_id: userId, archived: true },
      order: { archived_at: 'DESC' },
    });
  }

  async getActiveProjects(userId: number): Promise<Project[]> {
    return this.projectRepository.find({
      where: { user_id: userId, archived: false },
      order: { updatedAt: 'DESC' },
    });
  }

  async getOverdueProjects(userId: number): Promise<Project[]> {
    const now = new Date();
    return this.projectRepository
      .createQueryBuilder('project')
      .where('project.user_id = :userId', { userId })
      .andWhere('project.due_date < :now', { now })
      .andWhere('project.status != :completed', { completed: ProjectStatus.COMPLETED })
      .andWhere('project.archived = false')
      .orderBy('project.due_date', 'ASC')
      .getMany();
  }

  async getProjectStats(userId: number): Promise<{
    total: number;
    inProgress: number;
    completed: number;
    overdue: number;
    archived: number;
  }> {
    const [total, inProgress, completed, archived] = await Promise.all([
      this.projectRepository.count({ where: { user_id: userId } }),
      this.projectRepository.count({ 
        where: { user_id: userId, status: ProjectStatus.IN_PROGRESS, archived: false } 
      }),
      this.projectRepository.count({ 
        where: { user_id: userId, status: ProjectStatus.COMPLETED } 
      }),
      this.projectRepository.count({ 
        where: { user_id: userId, archived: true } 
      }),
    ]);

    const overdue = (await this.getOverdueProjects(userId)).length;

    return {
      total,
      inProgress,
      completed,
      overdue,
      archived,
    };
  }
}