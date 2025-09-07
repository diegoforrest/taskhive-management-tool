import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    createTaskDto.user_id = req.user.id;
    return await this.tasksService.create(createTaskDto);
  }

  @Get()
  async findAll(@Request() req, @Query('grouped') grouped?: string) {
    const userId = req.user.id;
    
    if (grouped === 'true') {
      return await this.tasksService.getTasksByStatus(userId);
    }
    
    return await this.tasksService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.tasksService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return await this.tasksService.update(+id, updateTaskDto);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return await this.tasksService.updateStatus(+id, status);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tasksService.remove(+id);
    return { message: 'Task deleted successfully' };
  }
}
