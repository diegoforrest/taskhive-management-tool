import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    console.log('🔄 Registration attempt:', registerDto);
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      console.log('❌ User already exists:', existingUser);
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user (user_id will be auto-generated)
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    const savedUser = await this.userRepository.save(user);
    console.log('✅ User saved successfully:', { user_id: savedUser.user_id, email: savedUser.email });

    return {
      success: true,
      message: 'Member created successfully',
      user_id: user.user_id,
      email: user.email,
    };
  }

  async login(loginDto: LoginDto) {
    const { user_id, password } = loginDto;

    // Find user by user_id (number) or email (string)
    let user;
    if (!isNaN(Number(user_id))) {
      // If user_id is numeric, search by user_id as number
      user = await this.userRepository.findOne({
        where: { user_id: Number(user_id) },
      });
    } else {
      // If user_id is not numeric, search by email
      user = await this.userRepository.findOne({
        where: { email: user_id },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.user_id,
      user_id: user.user_id,
      email: user.email,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      success: true,
      user: {
        user_id: user.user_id, // Return user_id (primary key)
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token: access_token,
    };
  }

  async findById(user_id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { user_id } });
  }

  async findByUserId(user_id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { user_id } });
  }

  async createProject(user_id: number, name: string, description: string, due_date?: string, priority?: string) {
    try {
      const user = await this.userRepository.findOne({ where: { user_id } });
      if (!user) {
        throw new Error('User not found');
      }

      const projectData: any = {
        name,
        description,
        user_id,
        user,
      };

      // Add due_date if provided
      if (due_date) {
        projectData.due_date = new Date(due_date);
      }

      // Add priority if provided (default is handled by entity)
      if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
        projectData.priority = priority;
      }

      const project = this.projectRepository.create(projectData);

      return await this.projectRepository.save(project);
    } catch (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  async getProjectsByUserId(user_id: number) {
    try {
      const projects = await this.projectRepository.find({
        where: { user_id },
        order: { createdAt: 'DESC' },
      });

      return {
        success: true,
        data: projects,
        count: projects.length
      };
    } catch (error) {
      throw new Error(`Failed to get projects: ${error.message}`);
    }
  }

  async updateProject(projectId: number, updateData: Partial<{ name: string; description: string; priority: string; due_date: string; status: string }>) {
    try {
      const project = await this.projectRepository.findOne({ where: { id: projectId } });
      if (!project) {
        throw new Error('Project not found');
      }

      // Update the project data
      const updatedData: any = {};
      
      if (updateData.name !== undefined) updatedData.name = updateData.name;
      if (updateData.description !== undefined) updatedData.description = updateData.description;
      if (updateData.priority !== undefined && ['Low', 'Medium', 'High'].includes(updateData.priority)) {
        updatedData.priority = updateData.priority;
      }
      if (updateData.due_date !== undefined) {
        updatedData.due_date = updateData.due_date ? new Date(updateData.due_date) : null;
      }
  if (updateData.status !== undefined && ['In Progress', 'To Review', 'Completed', 'On Hold', 'Request Changes'].includes(updateData.status)) {
        updatedData.status = updateData.status;
      }

      // Update the project
      await this.projectRepository.update(projectId, updatedData);
      
      // Return the updated project
      const updatedProject = await this.projectRepository.findOne({ where: { id: projectId } });
      
      return {
        success: true,
        message: 'Project updated successfully',
        data: updatedProject
      };
    } catch (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }
  }

  async deleteProject(projectId: number) {
    try {
      // Check if project exists
      const project = await this.projectRepository.findOne({ where: { id: projectId } });
      if (!project) {
        throw new Error('Project not found');
      }

      // Delete related changelogs for this project and its tasks first to avoid FK violations
      try {
        // Delete changelogs that reference this project or any task belonging to this project in one statement
        await this.taskRepository.manager.query(
          'DELETE FROM `change_logs` WHERE `project_id` = ? OR `task_id` IN (SELECT `id` FROM `tasks` WHERE `project_id` = ?)',
          [projectId, projectId]
        );
      } catch (e) {
        // If changelog cleanup fails, log and continue so the error is clearer
        console.warn('Failed to cleanup changelogs for project', projectId, e);
      }

      // Delete all tasks associated with this project first
      await this.taskRepository.delete({ project_id: projectId });

      // Then delete the project
      await this.projectRepository.delete(projectId);
      
      return {
        success: true,
        message: 'Project and associated tasks deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  async createTask(projectId: number, taskData: {
    name: string;
    contents?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }) {
    try {
      // Verify project exists
      const project = await this.projectRepository.findOne({ where: { id: projectId } });
      if (!project) {
        throw new Error('Project not found');
      }

      const newTaskData: any = {
        name: taskData.name,
        project_id: projectId,
        project,
      };

      // Add optional fields if provided
      if (taskData.contents) newTaskData.contents = taskData.contents;
      if (taskData.priority && ['Low', 'Medium', 'High'].includes(taskData.priority)) {
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
        data: savedTask
      };
    } catch (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }
  }

  async getTasksByProjectId(projectId: number) {
    try {
      const tasks = await this.taskRepository.find({
        where: { project_id: projectId },
        order: { createdAt: 'DESC' },
      });

      return {
        success: true,
        data: tasks,
        count: tasks.length
      };
    } catch (error) {
      throw new Error(`Failed to get tasks: ${error.message}`);
    }
  }

  async deleteTask(taskId: number) {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId } });
      if (!task) {
        throw new Error('Task not found');
      }

      await this.taskRepository.delete(taskId);
      
      return {
        success: true,
        message: 'Task deleted successfully'
      };
    } catch (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  async updateTask(taskId: number, updateData: {
    name?: string;
    contents?: string;
    status?: string;
    priority?: string;
    due_date?: string;
    assignee?: string;
  }) {
    try {
      const task = await this.taskRepository.findOne({ where: { id: taskId } });
      if (!task) {
        throw new Error('Task not found');
      }

      // Build update object with only provided fields
      const updateFields: any = {};
      
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.contents !== undefined) updateFields.contents = updateData.contents;
  if (updateData.status && ['Todo', 'In Progress', 'Done', 'On Hold', 'Request Changes'].includes(updateData.status)) {
        updateFields.status = updateData.status;
      }
      if (updateData.priority && ['Low', 'Medium', 'High', 'Critical'].includes(updateData.priority)) {
        updateFields.priority = updateData.priority;
      }
      if (updateData.due_date !== undefined) {
        updateFields.due_date = updateData.due_date ? new Date(updateData.due_date) : null;
      }
      if (updateData.assignee !== undefined) updateFields.assignee = updateData.assignee;

      // Update the task
      await this.taskRepository.update(taskId, updateFields);
      
      // Fetch and return the updated task
      const updatedTask = await this.taskRepository.findOne({ where: { id: taskId } });
      
      return {
        success: true,
        message: 'Task updated successfully',
        data: updatedTask
      };
    } catch (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }
  }

  async createChangelog(taskId: number | null, oldStatus: string | null, newStatus: string | null, remark: string | null, userId: number | null, projectId: number | null) {
    try {
      const changelogRepo = this.taskRepository.manager.getRepository('ChangeLog');

      const payload: any = {
        description: remark || '',
        old_status: oldStatus || null,
        new_status: newStatus || null,
        remark: remark || null,
        user_id: userId || 1,
        project_id: projectId || null,
        task_id: taskId || null,
      };

      // Using query builder to insert into change_logs table
      await changelogRepo.insert(payload);

      return { success: true, message: 'Changelog recorded' };
    } catch (error) {
      console.error('Failed to create changelog:', error);
      throw new Error(`Failed to create changelog: ${error.message}`);
    }
  }

  async getChangelogs(taskId?: number | null, projectId?: number | null) {
    try {
      const changelogRepo = this.taskRepository.manager.getRepository('ChangeLog');
      const qb = changelogRepo.createQueryBuilder('cl').select();
      if (taskId) qb.where('cl.task_id = :taskId', { taskId });
      if (projectId) qb.andWhere('cl.project_id = :projectId', { projectId });
      qb.orderBy('cl.createdAt', 'DESC');
      const rows = await qb.getMany();
      return { success: true, data: rows };
    } catch (error) {
      console.error('Failed to fetch changelogs:', error);
      throw new Error(`Failed to fetch changelogs: ${error.message}`);
    }
  }

  // Update user profile fields
  async updateUser(userId: number, updateData: Partial<{ email: string; firstName: string; lastName: string }>) {
    try {
      const user = await this.userRepository.findOne({ where: { user_id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const fields: any = {};
      if (updateData.email !== undefined) fields.email = updateData.email;
      if (updateData.firstName !== undefined) fields.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) fields.lastName = updateData.lastName;

      await this.userRepository.update(userId, fields);

      const updated = await this.userRepository.findOne({ where: { user_id: userId } });
      return { success: true, message: 'User updated', user: updated };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Change password - verifies current password then writes new hashed password
  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    try {
      const user = await this.userRepository.findOne({ where: { user_id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const passwordMatches = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatches) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      if (!newPassword || newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
      }

      const saltRounds = 12;
      const hashed = await bcrypt.hash(newPassword, saltRounds);
      await this.userRepository.update(userId, { password: hashed });

      return { success: true, message: 'Password changed' };
    } catch (error) {
      throw new Error(`Failed to change password: ${error.message}`);
    }
  }

  // Verify current password for a user (returns success true/false)
  async verifyPassword(userId: number, password: string) {
    try {
      const user = await this.userRepository.findOne({ where: { user_id: userId } });
      if (!user) {
        throw new Error('User not found');
      }
      const matches = await bcrypt.compare(password, user.password);
      return { success: true, valid: matches };
    } catch (error) {
      throw new Error(`Failed to verify password: ${error.message}`);
    }
  }
}
