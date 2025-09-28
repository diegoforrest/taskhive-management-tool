import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { TaskManagementService, TaskQueryService, TaskValidationService } from '../../application/services/task';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project])
  ],
  controllers: [TasksController],
  providers: [
    TasksService, 
    TaskManagementService, 
    TaskQueryService, 
    TaskValidationService
  ],
  exports: [
    TasksService, 
    TaskManagementService, 
    TaskQueryService, 
    TaskValidationService
  ],
})
export class TasksModule {}
