import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [forwardRef(() => require('../auth/auth.module').AuthModule), TypeOrmModule.forFeature([Project, Task])],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
