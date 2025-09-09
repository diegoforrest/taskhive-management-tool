import { Controller, Post, Get, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto';

interface CreateProjectDto {
  user_id: number;
  name: string;
  description: string;
  priority?: string;
  due_date?: string;
}

interface UpdateProjectDto {
  name?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  status?: string;
}

interface CreateTaskDto {
  project_id: number;
  name: string;
  contents?: string;
  priority?: string;
  due_date?: string;
  assignee?: string;
}

interface UpdateTaskDto {
  name?: string;
  contents?: string;
  status?: string;
  priority?: string;
  due_date?: string;
  assignee?: string;
}

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

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
  @HttpCode(HttpStatus.CREATED)
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    const { user_id, name, description, due_date, priority } = createProjectDto;
    return this.authService.createProject(user_id, name, description, due_date, priority);
  }

  @Get('test03/get_projects')
  @HttpCode(HttpStatus.OK)
  async getProjects(@Query('user_id') user_id: string) {
    const numericUserId = parseInt(user_id, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user_id');
    }
    return this.authService.getProjectsByUserId(numericUserId);
  }

  @Post('test04/update_project/:id')
  @HttpCode(HttpStatus.OK)
  async updateProject(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid project id');
    }
    return this.authService.updateProject(numericId, updateProjectDto);
  }

  @Post('test05/create_task')
  @HttpCode(HttpStatus.CREATED)
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    const { project_id, name, contents, priority, due_date, assignee } = createTaskDto;
    return this.authService.createTask(project_id, {
      name,
      contents,
      priority,
      due_date,
      assignee
    });
  }

  @Get('test06/get_tasks')
  @HttpCode(HttpStatus.OK)
  async getTasks(@Query('project_id') project_id: string) {
    const numericProjectId = parseInt(project_id, 10);
    if (isNaN(numericProjectId)) {
      throw new Error('Invalid project_id');
    }
    return this.authService.getTasksByProjectId(numericProjectId);
  }

  @Post('test07/delete_task/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTask(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid task id');
    }
    return this.authService.deleteTask(numericId);
  }

  @Post('test08/update_task/:id')
  @HttpCode(HttpStatus.OK)
  async updateTask(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid task id');
    }
    return this.authService.updateTask(numericId, updateTaskDto);
  }

  @Post('test09/delete_project/:id')
  @HttpCode(HttpStatus.OK)
  async deleteProject(@Param('id') id: string) {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid project id');
    }
    return this.authService.deleteProject(numericId);
  }
}
