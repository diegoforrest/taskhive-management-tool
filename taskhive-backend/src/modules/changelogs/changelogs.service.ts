import { Injectable } from '@nestjs/common';
import { ChangelogService } from '../../application/services/changelog/changelog.service';

@Injectable()
export class ChangelogsService {
  constructor(private readonly changelogService: ChangelogService) {}

  createChangelog(taskId: number | null, oldStatus: string | null, newStatus: string | null, remark: string | null, userId: number | null, projectId: number | null) {
    if (!userId) {
      throw new Error('User ID is required for changelog creation');
    }
    
    return this.changelogService.createChangelog({
      taskId: taskId || undefined,
      oldStatus: oldStatus || undefined,
      newStatus: newStatus || undefined,
      remark: remark || undefined,
      userId,
      projectId: projectId || undefined,
    });
  }

  getChangelogs(taskId?: number | null, projectId?: number | null) {
    return this.changelogService.getAllChangelogs({
      taskId: taskId || undefined,
      projectId: projectId || undefined,
    });
  }
}
