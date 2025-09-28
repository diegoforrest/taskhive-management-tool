import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { ProjectManagementService, ProjectQueryService, ProjectValidationService } from '../../application/services/project';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Task, User])
  ],
  controllers: [ProjectsController],
  providers: [
    ProjectsService, 
    ProjectManagementService, 
    ProjectQueryService, 
    ProjectValidationService
  ],
  exports: [
    ProjectsService, 
    ProjectManagementService, 
    ProjectQueryService, 
    ProjectValidationService
  ],
})
export class ProjectsModule {}
