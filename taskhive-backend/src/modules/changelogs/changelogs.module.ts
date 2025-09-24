import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChangelogsService } from './changelogs.service';
// If a module-local controller exists, import it; otherwise the routings are handled by auth controller's changelog endpoints.
import { ChangelogsController } from './changelogs.controller';

@Module({
  imports: [AuthModule],
  controllers: [ChangelogsController],
  providers: [ChangelogsService],
  exports: [ChangelogsService],
})
export class ChangelogsModule {}
