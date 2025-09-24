import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ChangelogsService {
  constructor(private readonly authService: AuthService) {}

  createChangelog(taskId: number | null, oldStatus: string | null, newStatus: string | null, remark: string | null, userId: number | null, projectId: number | null) {
    return this.authService.createChangelog(taskId, oldStatus, newStatus, remark, userId, projectId);
  }

  getChangelogs(taskId?: number | null, projectId?: number | null) {
    return this.authService.getChangelogs(taskId, projectId);
  }
}
