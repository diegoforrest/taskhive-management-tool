import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChangelogsService } from './changelogs.service';
import { CreateChangelogDto } from './dto/create-changelog.dto';

@Controller('changelogs')
@UseGuards(JwtAuthGuard)
export class ChangelogsController {
  constructor(private readonly changelogsService: ChangelogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Request() req: any, @Body() dto: CreateChangelogDto) {
    const userId = req.user?.user_id;
    return this.changelogsService.createChangelog(dto.task_id ?? null, dto.old_status ?? null, dto.new_status ?? null, dto.remark ?? null, userId ?? null, dto.project_id ?? null);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  get(@Query('task_id') taskId?: string, @Query('project_id') projectId?: string) {
    const t = taskId ? parseInt(taskId, 10) : undefined;
    const p = projectId ? parseInt(projectId, 10) : undefined;
    return this.changelogsService.getChangelogs(t as any, p as any);
  }
}
