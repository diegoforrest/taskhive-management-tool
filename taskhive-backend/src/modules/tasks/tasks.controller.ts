import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from '../auth/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() dto: CreateTaskDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    const { project_id, name, contents, priority, due_date, assignee } = dto;
    
    // Delegate to TasksService for proper separation of concerns
    return this.tasksService.createTask(project_id, { 
      name, 
      contents, 
      priority, 
      due_date, 
      assignee 
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getTasks(@Request() req: any, @Query('project_id') project_id?: string) {
    const userId = req.user?.user_id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    if (!project_id) {
      throw new Error('project_id query parameter is required');
    }
    
    const numericProjectId = parseInt(project_id, 10);
    if (isNaN(numericProjectId)) {
      throw new Error('Invalid project_id');
    }
    
    // Delegate to TasksService for proper separation of concerns
    return this.tasksService.getTasksByProjectId(numericProjectId);
  }

  @Post('delete/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string, @Request() req: any) {
    const userId = Number(req.user?.user_id);
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid task id');
    
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    
    // Delegate to TasksService for proper separation of concerns  
    return this.tasksService.deleteTask(numericId, userId, roles);
  }

  @Post(':id')
  @HttpCode(HttpStatus.OK)
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid task id');
    
    // Delegate to TasksService for proper separation of concerns
    return this.tasksService.updateTask(numericId, dto);
  }
}
