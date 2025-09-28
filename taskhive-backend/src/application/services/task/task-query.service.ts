import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../../../modules/tasks/entities/task.entity';
import { Project } from '../../../modules/projects/entities/project.entity';

@Injectable()
export class TaskQueryService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async getTasksByProjectId(projectId: number): Promise<{
    success: boolean;
    data: Task[];
    count: number;
  }> {
    const tasks = await this.taskRepository.find({
      where: { project_id: projectId },
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: tasks,
      count: tasks.length,
    };
  }

  async getTaskById(taskId: number): Promise<Task | null> {
    return this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'assignedUser'],
    });
  }

  async getTasksByStatus(projectId: number, status: TaskStatus): Promise<Task[]> {
    return this.taskRepository.find({
      where: { project_id: projectId, status },
      order: { updatedAt: 'DESC' },
    });
  }

  async getTasksByPriority(projectId: number, priority: TaskPriority): Promise<Task[]> {
    return this.taskRepository.find({
      where: { project_id: projectId, priority },
      order: { due_date: 'ASC' },
    });
  }

  async getTasksByAssignee(projectId: number, assignee: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: { project_id: projectId, assignee },
      order: { updatedAt: 'DESC' },
    });
  }

  async getUnassignedTasks(projectId: number): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere('(task.assignee IS NULL OR task.assignee = "")')
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }

  async getOverdueTasks(projectId?: number): Promise<Task[]> {
    const now = new Date();
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.due_date < :now', { now })
      .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED });

    if (projectId) {
      query.andWhere('task.project_id = :projectId', { projectId });
    }

    return query.orderBy('task.due_date', 'ASC').getMany();
  }

  async getTasksForUser(userId: number): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.project', 'project')
      .where('project.user_id = :userId', { userId })
      .orWhere('task.assigned_user_id = :userId', { userId })
      .orderBy('task.updatedAt', 'DESC')
      .getMany();
  }

  async getTaskStats(projectId: number): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    onHold: number;
    overdue: number;
  }> {
    const [total, todo, inProgress, completed, onHold] = await Promise.all([
      this.taskRepository.count({ where: { project_id: projectId } }),
      this.taskRepository.count({ 
        where: { project_id: projectId, status: TaskStatus.TODO } 
      }),
      this.taskRepository.count({ 
        where: { project_id: projectId, status: TaskStatus.IN_PROGRESS } 
      }),
      this.taskRepository.count({ 
        where: { project_id: projectId, status: TaskStatus.COMPLETED } 
      }),
      this.taskRepository.count({ 
        where: { project_id: projectId, status: TaskStatus.ON_HOLD } 
      }),
    ]);

    const overdue = (await this.getOverdueTasks(projectId)).length;

    return {
      total,
      todo,
      inProgress,
      completed,
      onHold,
      overdue,
    };
  }

  async searchTasks(
    projectId: number,
    searchTerm: string
  ): Promise<Task[]> {
    return this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId })
      .andWhere(
        '(task.name LIKE :searchTerm OR task.contents LIKE :searchTerm OR task.assignee LIKE :searchTerm)',
        { searchTerm: `%${searchTerm}%` }
      )
      .orderBy('task.updatedAt', 'DESC')
      .getMany();
  }

  async getTasksWithFilters(
    projectId: number,
    filters: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string;
      overdue?: boolean;
    }
  ): Promise<Task[]> {
    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.project_id = :projectId', { projectId });

    if (filters.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('task.priority = :priority', { priority: filters.priority });
    }

    if (filters.assignee) {
      query.andWhere('task.assignee = :assignee', { assignee: filters.assignee });
    }

    if (filters.overdue) {
      const now = new Date();
      query.andWhere('task.due_date < :now', { now })
           .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED });
    }

    return query.orderBy('task.updatedAt', 'DESC').getMany();
  }
}