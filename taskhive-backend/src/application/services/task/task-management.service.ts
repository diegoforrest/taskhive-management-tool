import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../../../modules/tasks/entities/task.entity';
import { Project } from '../../../modules/projects/entities/project.entity';

@Injectable()
export class TaskManagementService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async createTask(
    projectId: number,
    taskData: {
      name: string;
      contents?: string;
      priority?: TaskPriority;
      due_date?: string | null;
      assignee?: string | null;
    }
  ): Promise<{ success: boolean; message: string; data: Task }> {
    // Verify project exists
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const newTaskData: Partial<Task> = {
      name: taskData.name,
      project_id: projectId,
      project,
    };

    // Add optional fields if provided
    if (taskData.contents) newTaskData.contents = taskData.contents;
    if (taskData.priority && Object.values(TaskPriority).includes(taskData.priority)) {
      newTaskData.priority = taskData.priority;
    }
    if (taskData.due_date) {
      newTaskData.due_date = new Date(taskData.due_date);
    }
    if (taskData.assignee) newTaskData.assignee = taskData.assignee;

    const task = this.taskRepository.create(newTaskData);
    const savedTask = await this.taskRepository.save(task);

    return {
      success: true,
      message: 'Task created successfully',
      data: savedTask,
    };
  }

  async updateTask(
    taskId: number,
    updateData: {
      name?: string;
      contents?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      due_date?: string | null;
      assignee?: string | null;
    }
  ): Promise<{ success: boolean; message: string; data: Task }> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Build update object with only provided fields
    const updateFields: Partial<Task> = {};

    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.contents !== undefined) updateFields.contents = updateData.contents;
    if (updateData.status && Object.values(TaskStatus).includes(updateData.status)) {
      updateFields.status = updateData.status;
    }
    if (updateData.priority && Object.values(TaskPriority).includes(updateData.priority)) {
      updateFields.priority = updateData.priority;
    }
    if (updateData.due_date !== undefined) {
      updateFields.due_date = updateData.due_date ? new Date(updateData.due_date) : undefined;
    }
    if (updateData.assignee !== undefined) updateFields.assignee = updateData.assignee || undefined;

    // Update the task
    await this.taskRepository.update(taskId, updateFields);

    // Fetch and return the updated task
    const updatedTask = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    return {
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    };
  }

  async deleteTask(
    taskId: number,
    requestingUserId: number,
    requestingUserRoles: string[] = []
  ): Promise<{ success: boolean; message: string }> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check authorization - admin or owner of project
    const project = await this.projectRepository.findOne({ where: { id: task.project_id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAdmin = requestingUserRoles.includes('admin');
    const isOwner = project.user_id === requestingUserId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('Not authorized to delete this task');
    }

    // Use transaction for data consistency
    const queryRunner = this.taskRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete related changelogs
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from('change_logs')
        .where('task_id = :tid', { tid: taskId })
        .execute();

      // Delete task
      await queryRunner.manager.delete(Task, { id: taskId });

      await queryRunner.commitTransaction();

      return { success: true, message: 'Task deleted successfully' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new Error(`Failed to delete task: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  async assignTask(taskId: number, assignee: string): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskRepository.update(taskId, { assignee });

    const updatedTask = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    return updatedTask;
  }

  async unassignTask(taskId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    await this.taskRepository.update(taskId, { assignee: undefined });

    const updatedTask = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    return updatedTask;
  }

  async moveTaskToProject(taskId: number, targetProjectId: number, requestingUserId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Verify both source and target projects exist and user has access
    const [sourceProject, targetProject] = await Promise.all([
      this.projectRepository.findOne({ where: { id: task.project_id } }),
      this.projectRepository.findOne({ where: { id: targetProjectId } }),
    ]);

    if (!sourceProject) throw new NotFoundException('Source project not found');
    if (!targetProject) throw new NotFoundException('Target project not found');

    // Check authorization - user must own both projects (or be admin)
    if (sourceProject.user_id !== requestingUserId || targetProject.user_id !== requestingUserId) {
      throw new ForbiddenException('Not authorized to move task between these projects');
    }

    await this.taskRepository.update(taskId, { project_id: targetProjectId, project: targetProject });

    const updatedTask = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!updatedTask) {
      throw new NotFoundException('Task not found after update');
    }

    return updatedTask;
  }
}