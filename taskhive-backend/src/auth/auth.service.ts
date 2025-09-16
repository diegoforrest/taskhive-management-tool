import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Task } from '../entities/task.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import logger, { log } from '../logger';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(PasswordResetToken)
    private tokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    log.log(`🔄 Registration attempt: email=${registerDto.email}`);
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      log.warn(`❌ User already exists: email=${existingUser.email}`);
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
  log.log(`✅ User saved successfully: user_id=${savedUser.user_id} email=${savedUser.email}`);

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

      // Support toggling archive state from the frontend
      if ((updateData as any).archived !== undefined) {
        updatedData.archived = !!(updateData as any).archived;
        if ((updateData as any).archived) {
          updatedData.archived_at = new Date();
        } else {
          updatedData.archived_at = null;
        }
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
        log.warn('Failed to cleanup changelogs for project ' + String(projectId) + ' - ' + (e && e.message ? e.message : String(e)));
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
      log.error('Failed to create changelog: ' + (error && error.message ? error.message : String(error)));
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
      log.error('Failed to fetch changelogs: ' + (error && error.message ? error.message : String(error)));
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

  // Request a password reset: generate a short-lived JWT token and send an email (or log link)
  async requestPasswordReset(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });

      // If user does not exist, return a clear message as requested
      if (!user) {
        return { success: false, message: 'Email is not registered' };
      }

      // Rate-limit: do not allow creating a new token if one was created in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentTokens = await this.tokenRepository.createQueryBuilder('t')
        .where('t.user_id = :uid', { uid: user.user_id })
        .andWhere('t.used = false')
        .andWhere('t.createdAt > :since', { since: tenMinutesAgo.toISOString() })
        .getCount();

      if (recentTokens > 0) {
        return { success: false, message: 'A reset link was recently sent. Please check your email.' };
      }

      // Generate a random token and store its hash
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const saltRounds = 12;
      const tokenHash = await bcrypt.hash(rawToken, saltRounds);

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const tokenEntity = this.tokenRepository.create({
        user_id: user.user_id,
        user,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });
      const saved = await this.tokenRepository.save(tokenEntity);

      const resetUrlBase = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      // Use tid in link to avoid scanning all tokens server-side
      const resetLink = `${resetUrlBase}/auth/reset-password?tid=${saved.id}&token=${encodeURIComponent(rawToken)}`;

      // Try provider: prefer SendGrid, then SMTP, else log
      const sendgridKey = this.configService.get<string>('SENDGRID_API_KEY');
      const smtpHost = this.configService.get<string>('SMTP_HOST');
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS');
      const fromAddress = this.configService.get<string>('SMTP_FROM', 'no-reply@taskhive.local');

      // HTML template (simple) — can be extended
      const html = `<p>Hello ${user.firstName || ''},</p>
<p>You requested a password reset. Click the button below to reset your password:</p>
<p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#1f2937;color:white;border-radius:6px;text-decoration:none">Reset password</a></p>
<p>If you did not request this, you can ignore this message.</p>
`;

  let exposedLink: string | null = null;

  if (sendgridKey) {
        // send via SendGrid REST API using built-in https request to avoid extra deps
        try {
          const https = await import('https');
          const payload = JSON.stringify({
            personalizations: [{ to: [{ email: user.email }] }],
            from: { email: fromAddress },
            subject: 'TaskHive password reset',
            content: [{ type: 'text/html', value: html }],
          });

          const options = {
            hostname: 'api.sendgrid.com',
            port: 443,
            path: '/v3/mail/send',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sendgridKey}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          } as any;

          await new Promise<void>((resolve, reject) => {
            const req = (https as any).request(options, (res: any) => {
              const chunks: any[] = [];
              res.on('data', (c: any) => chunks.push(c));
              res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) return resolve();
                const text = Buffer.concat(chunks).toString('utf8');
                log.warn('SendGrid send failed ' + String(res.statusCode) + ' - ' + text);
                return resolve();
              });
            });
            req.on('error', (err: any) => {
              log.warn('SendGrid send failed: ' + (err && err.message ? err.message : String(err)));
              resolve();
            });
            req.write(payload);
            req.end();
          });
        } catch (e) {
          log.warn('SendGrid send failed: ' + (e && e.message ? e.message : String(e)));
        }
  } else if (smtpHost && smtpUser && smtpPass) {
        let nodemailer: any;
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          nodemailer = require('nodemailer');
        } catch (e) {
          log.warn('nodemailer not available, cannot send email. Reset link: ' + resetLink);
          return { success: true, message: 'Reset link generated and logged' };
        }

        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(this.configService.get<string>('SMTP_PORT', '587')),
          secure: this.configService.get<string>('SMTP_SECURE', 'false') === 'true',
          auth: { user: smtpUser, pass: smtpPass },
        });

        const mail = {
          from: fromAddress,
          to: user.email,
          subject: 'TaskHive password reset',
          text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
          html,
        };

        await transporter.sendMail(mail);
      } else {
  log.warn('Password reset link (no provider configured): ' + resetLink);
        // In development, it's handy to return the link in the response for testing.
        const expose = this.configService.get<string>('DEV_EXPOSE_RESET_LINK', 'true');
        if (expose === 'true' || process.env.NODE_ENV !== 'production') {
          exposedLink = resetLink;
        }
      }

      const response: any = { success: true, message: 'Reset link sent', tid: saved.id };
      if (exposedLink) response.resetLink = exposedLink;
      return response;
    } catch (error) {
      log.error('Failed to request password reset: ' + (error && error.message ? error.message : String(error)));
      throw new Error(`Failed to request password reset: ${error.message}`);
    }
  }

  // Validate a tid+token pair (used by frontend to pre-check token validity)
  async validateResetToken(tid: number, token: string) {
    try {
      const rec = await this.tokenRepository.findOne({ where: { id: tid } });
      if (!rec) return { success: false, message: 'Invalid token' };
      if (rec.used) return { success: false, message: 'Token already used' };
      if (rec.expires_at && rec.expires_at.getTime() < Date.now()) return { success: false, message: 'Token expired' };
      const matches = await bcrypt.compare(token, rec.token_hash);
      if (!matches) return { success: false, message: 'Token invalid' };
      return { success: true, message: 'Token valid' };
    } catch (e) {
      log.error('validateResetToken error: ' + (e && e.message ? e.message : String(e)));
      return { success: false, message: 'Validation failed' };
    }
  }

  // Reset using tid + raw token — more efficient than scanning all tokens
  async resetPasswordWithId(tid: number, token: string, newPassword: string) {
    try {
      if (!token) throw new BadRequestException('Missing token');
      if (!newPassword || newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

      const rec = await this.tokenRepository.findOne({ where: { id: tid } });
      if (!rec) throw new BadRequestException('Invalid or expired token');
      if (rec.used) throw new BadRequestException('Token already used');
      if (rec.expires_at && rec.expires_at.getTime() < Date.now()) throw new BadRequestException('Token expired');

      const matches = await bcrypt.compare(token, rec.token_hash);
      if (!matches) throw new BadRequestException('Invalid token');

      const user = await this.userRepository.findOne({ where: { user_id: rec.user_id } });
      if (!user) throw new Error('User not found');

      const saltRounds = 12;
      const hashed = await bcrypt.hash(newPassword, saltRounds);
      await this.userRepository.update(user.user_id, { password: hashed });

      rec.used = true;
      await this.tokenRepository.save(rec);

      return { success: true, message: 'Password has been reset' };
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  }

  // Reset the password using the token generated above
  async resetPassword(token: string, newPassword: string) {
    try {
      if (!token) throw new BadRequestException('Missing token');
      if (!newPassword || newPassword.length < 8) throw new BadRequestException('New password must be at least 8 characters');

      // Find a matching, un-used token by comparing hashes
      const tokens = await this.tokenRepository.find({ where: { used: false } });
      let matched: PasswordResetToken | null = null;
      for (const t of tokens) {
        // Check expiry
        if (t.expires_at && t.expires_at.getTime() < Date.now()) continue;
        const matches = await bcrypt.compare(token, t.token_hash);
        if (matches) {
          matched = t;
          break;
        }
      }

      if (!matched) throw new BadRequestException('Invalid or expired token');

      const user = await this.userRepository.findOne({ where: { user_id: matched.user_id } });
      if (!user) throw new Error('User not found');

      const saltRounds = 12;
      const hashed = await bcrypt.hash(newPassword, saltRounds);
      await this.userRepository.update(user.user_id, { password: hashed });

      // mark token used
      matched.used = true;
      await this.tokenRepository.save(matched);

      return { success: true, message: 'Password has been reset' };
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  }

  // DEV utility: delete all reset tokens for an email
  async deleteResetTokensForEmail(email: string) {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) return { success: false, message: 'User not found' };
      const res = await this.tokenRepository.createQueryBuilder().delete().from('password_reset_tokens').where('user_id = :uid', { uid: user.user_id }).execute();
      return { success: true, deleted: res.affected };
    } catch (e) {
      log.error('deleteResetTokensForEmail error: ' + (e && e.message ? e.message : String(e)));
      return { success: false, message: e.message || 'Failed' };
    }
  }
}
