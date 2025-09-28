import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../../modules/projects/entities/project.entity';
import { Task } from '../../../modules/tasks/entities/task.entity';
import { User } from '../../../modules/users/entities/user.entity';

@Injectable()
export class ProjectManagementService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createProject(
    userId: number,
    data: {
      name: string;
      description?: string;
      due_date?: string | null;
      priority?: 'Low' | 'Medium' | 'High';
    }
  ): Promise<Project> {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const projectData: Partial<Project> = {
      name: data.name,
      description: data.description || '',
      user_id: userId,
      user,
    };

    if (data.due_date) {
      projectData.due_date = new Date(data.due_date);
    }

    if (data.priority && ['Low', 'Medium', 'High'].includes(data.priority)) {
      projectData.priority = data.priority as any;
    }

    const project = this.projectRepository.create(projectData);
    return this.projectRepository.save(project);
  }

  async updateProject(
    projectId: number,
    updateData: Partial<{
      name: string;
      description: string;
      priority: 'Low' | 'Medium' | 'High';
      due_date: string | null;
      status: 'In Progress' | 'To Review' | 'Completed' | 'On Hold' | 'Request Changes';
      archived: boolean;
    }>
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updatedFields: Partial<Project> = {};

    if (updateData.name !== undefined) updatedFields.name = updateData.name;
    if (updateData.description !== undefined) updatedFields.description = updateData.description;
    if (updateData.priority !== undefined) updatedFields.priority = updateData.priority as any;
    if (updateData.status !== undefined) updatedFields.status = updateData.status as any;

    if (updateData.due_date !== undefined) {
      updatedFields.due_date = updateData.due_date ? new Date(updateData.due_date) : undefined;
    }

    if (updateData.archived !== undefined) {
      updatedFields.archived = updateData.archived;
      updatedFields.archived_at = updateData.archived ? new Date() : undefined;
    }

    await this.projectRepository.update(projectId, updatedFields);
    const updatedProject = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!updatedProject) {
      throw new NotFoundException('Project not found after update');
    }
    return updatedProject;
  }

  async deleteProject(
    projectId: number,
    requestingUserId: number,
    requestingUserRoles: string[] = []
  ): Promise<{ success: boolean; message: string }> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check authorization
    const isAdmin = requestingUserRoles.includes('admin');
    const isOwner = project.user_id === requestingUserId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Not authorized to delete this project');
    }

    // Use transaction for data consistency
    const queryRunner = this.projectRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete related changelogs
      await queryRunner.query(
        'DELETE FROM change_logs WHERE project_id = ? OR task_id IN (SELECT id FROM tasks WHERE project_id = ?)',
        [projectId, projectId]
      );

      // Delete tasks
      await queryRunner.manager.delete(Task, { project_id: projectId } as any);

      // Delete project
      await queryRunner.manager.delete(Project, { id: projectId });

      await queryRunner.commitTransaction();

      return { success: true, message: 'Project and associated tasks deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete project: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async archiveProject(projectId: number, requestingUserId: number): Promise<Project> {
    return this.updateProject(projectId, { archived: true });
  }

  async unarchiveProject(projectId: number, requestingUserId: number): Promise<Project> {
    return this.updateProject(projectId, { archived: false });
  }

  async updateProjectProgress(projectId: number, progress: number): Promise<Project> {
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    await this.projectRepository.update(projectId, { progress });
    const updatedProject = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!updatedProject) {
      throw new NotFoundException('Project not found after update');
    }
    return updatedProject;
  }
}