import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from '@modules/projects/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() dto: CreateProjectDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    const { name, description, due_date, priority } = dto;
  return this.projectsService.createProject(userId, name, description ?? '', due_date, priority);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getProjects(@Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    return this.projectsService.getProjectsByUserId(userId);
  }

  @Post(':id')
  @HttpCode(HttpStatus.OK)
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid project id');
  return this.projectsService.updateProject(numericId, dto);
  }

  @Post('delete/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteProject(@Param('id') id: string, @Request() req: any) {
    const userId = Number(req.user?.user_id);
    if (!userId) throw new Error('Unauthorized');
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) throw new Error('Invalid project id');
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    return this.projectsService.deleteProject(numericId, userId, roles);
  }
}
