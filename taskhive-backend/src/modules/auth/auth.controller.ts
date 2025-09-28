import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { ChangelogsService } from '../changelogs/changelogs.service';
import {
	RegisterDto,
	LoginDto,
	CreateProjectDto,
	UpdateProjectDto,
	CreateTaskDto,
	UpdateTaskDto,
	CreateChangelogDto,
	UpdateUserDto,
	ChangePasswordDto,
	VerifyPasswordDto,
	ForgotPasswordDto,
	ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller()
export class AuthController {
	constructor(
		private authService: AuthService, 
		private projectsService: ProjectsService, 
		private tasksService: TasksService,
		private usersService: UsersService,
		private changelogsService: ChangelogsService
	) {}

	@Post('testlogin')
	@HttpCode(HttpStatus.OK)
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Post('test01/create_member')
	@HttpCode(HttpStatus.CREATED)
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Post('test02/create_project')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async createProject(@Request() req: any, @Body() createProjectDto: CreateProjectDto) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const { name, description, due_date, priority } = createProjectDto;
		// Delegate to ProjectsService for proper separation of concerns
		return this.projectsService.createProject(userId, name, description ?? '', due_date, priority);
	}

	@Get('test03/get_projects')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async getProjects(@Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		// Delegate to ProjectsService for proper separation of concerns
		return this.projectsService.getProjectsByUserId(userId);
	}

	@Post('test04/update_project/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateProject(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid project id');
		}
		// Delegate to ProjectsService for proper separation of concerns
		return this.projectsService.updateProject(numericId, updateProjectDto);
	}

	@Post('test05/create_task')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async createTask(@Request() req: any, @Body() createTaskDto: CreateTaskDto) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const { project_id, name, contents, priority, due_date, assignee } = createTaskDto;
		// Delegate to TasksService for proper separation of concerns
		return this.tasksService.createTask(project_id, {
			name,
			contents,
			priority,
			due_date,
			assignee,
		});
	}

	@Get('test06/get_tasks')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async getTasks(@Request() req: any, @Query('project_id') project_id: string) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericProjectId = parseInt(project_id, 10);
		if (isNaN(numericProjectId)) {
			throw new Error('Invalid project_id');
		}
		// Delegate to TasksService for proper separation of concerns
		return this.tasksService.getTasksByProjectId(numericProjectId);
	}

	@Post('test07/delete_task/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteTask(@Param('id') id: string, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid task id');
		}
		const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
		return this.tasksService.deleteTask(numericId, userId, roles);
	}

	@Post('test08/update_task/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid task id');
		}
		// Delegate to TasksService for proper separation of concerns
		return this.tasksService.updateTask(numericId, updateTaskDto);
	}

	@Post('test10/create_changelog')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.CREATED)
	async createChangelog(@Request() req: any, @Body() body: CreateChangelogDto) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const { task_id, project_id, old_status, new_status, remark } = body;
		// Delegate to ChangelogsService for proper separation of concerns
		return this.changelogsService.createChangelog(task_id ?? null, old_status ?? null, new_status ?? null, remark ?? '', userId ?? null, project_id ?? null);
	}

	@Get('test10/get_changelogs')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async getChangelogs(@Request() req: any, @Query('task_id') task_id?: string, @Query('project_id') project_id?: string) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const t = task_id ? parseInt(task_id, 10) : null;
		const p = project_id ? parseInt(project_id, 10) : null;
		// Delegate to ChangelogsService for proper separation of concerns
		return this.changelogsService.getChangelogs(t, p);
	}

	@Post('test09/delete_project/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async deleteProject(@Param('id') id: string, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid project id');
		}
		const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
		return this.projectsService.deleteProject(numericId, userId, roles);
	}

	// Update user profile (firstName, lastName, email)
	@Post('test11/update_user/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid user id');
		}
		// Delegate to UsersService for proper separation of concerns
		// Ignore client-supplied id and operate on authenticated user
		return this.usersService.updateUser(userId, body);
	}

	// Change password endpoint - verifies current password and updates to new password
	@Post('test12/change_password/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async changePassword(@Param('id') id: string, @Body() body: ChangePasswordDto, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid user id');
		}
		const { currentPassword, newPassword } = body;
		// Delegate to UsersService for proper separation of concerns
		return this.usersService.changePassword(userId, currentPassword, newPassword);
	}

	// Verify password without changing it
	@Post('test13/verify_password/:id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(HttpStatus.OK)
	async verifyPassword(@Param('id') id: string, @Body() body: VerifyPasswordDto, @Request() req: any) {
		const userId = Number(req.user?.user_id);
		if (!userId) throw new UnauthorizedException();
		const numericId = parseInt(id, 10);
		if (isNaN(numericId)) {
			throw new Error('Invalid user id');
		}
		// Delegate to UsersService for proper separation of concerns
		return this.usersService.verifyPassword(userId, body.password);
	}

	// Request password reset (sends an email with a reset link)
	@Post('test14/forgot_password')
	@HttpCode(HttpStatus.OK)
	async forgotPassword(@Body() body: ForgotPasswordDto) {
		const { email } = body;
		return this.authService.requestPasswordReset(email);
	}

	// Reset password using token from email
	@Post('test15/reset_password')
	@HttpCode(HttpStatus.OK)
	async resetPassword(@Body() body: ResetPasswordDto) {
		const { tid, token, newPassword } = body;
		// Use the clean AuthService method - only support tid+token flow for security
		if (!tid || !token) {
			throw new Error('Both tid and token are required for password reset');
		}
		return this.authService.resetPasswordWithId(tid, token, newPassword);
	}

	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	async refresh(@Body('refresh_token') refresh_token: string) {
		if (!refresh_token) throw new Error('Missing refresh token');
		return this.authService.refreshToken(refresh_token);
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	async logout(@Body('refresh_token') refresh_token: string) {
		if (!refresh_token) throw new Error('Missing refresh token');
		return this.authService.revokeRefreshToken(refresh_token);
	}

	// Validate token before showing reset form
	@Get('test16/validate_reset')
	@HttpCode(HttpStatus.OK)
	async validateReset(@Query('tid') tid: string, @Query('token') token: string) {
		const numericTid = parseInt(tid, 10);
		if (isNaN(numericTid)) throw new Error('Invalid token id');
		return this.authService.validateResetToken(numericTid, token);
	}

	// DEV-ONLY: remove all reset tokens for an email so a fresh one can be created.
	// Only enabled when not in production.
	@Post('dev/delete_reset_tokens')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles('admin')
	@HttpCode(HttpStatus.OK)
	async deleteResetTokensDev(@Body() body: ForgotPasswordDto) {
		if (process.env.NODE_ENV === 'production') {
			throw new Error('Not allowed in production');
		}
		const { email } = body;
		return (this.authService as any).deleteResetTokensForEmail?.(email) ?? { success: false, message: 'Not implemented' };
	}
}