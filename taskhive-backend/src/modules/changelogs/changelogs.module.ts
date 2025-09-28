import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChangelogsService } from './changelogs.service';
import { ChangelogsController } from './changelogs.controller';
import { ChangeLog } from './entities/changelog.entity';
import { ChangelogService } from '../../application/services/changelog/changelog.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChangeLog])],
  controllers: [ChangelogsController],
  providers: [ChangelogsService, ChangelogService],
  exports: [ChangelogsService, ChangelogService],
})
export class ChangelogsModule {}
