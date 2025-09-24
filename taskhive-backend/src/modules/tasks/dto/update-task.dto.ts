import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TaskPriority } from './create-task.dto';

export enum TaskStatus {
  Todo = 'Todo',
  InProgress = 'In Progress',
  Done = 'Done',
  OnHold = 'On Hold',
  RequestChanges = 'Request Changes',
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contents?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  due_date?: string | null;

  @IsOptional()
  @IsString()
  assignee?: string | null;
}
