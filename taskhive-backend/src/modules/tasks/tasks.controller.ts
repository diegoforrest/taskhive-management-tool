import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '../auth/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly authService: AuthService, private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() dto: CreateTaskDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    const { project_id, name, contents, priority, due_date, assignee } = dto;
    return this.authService.createTask(project_id, { name, contents, priority, due_date, assignee });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getTasks(@Request() req: any, @Query('project_id') project_id?: string) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    const numericProjectId = project_id ? parseInt(project_id, 10) : undefined;
  return this.authService.getTasksByProjectId(numericProjectId as any);
  }

  @Post('delete/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string, @Request() req: any) {
    const userId = Number(req.user?.user_id);
    if (!userId) throw new Error('Unauthorized');
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid task id');
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    return this.tasksService.deleteTask(numericId, userId, roles);
  }

  @Post(':id')
  @HttpCode(HttpStatus.OK)
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid task id');
  return this.authService.updateTask(numericId, dto);
  }
}
