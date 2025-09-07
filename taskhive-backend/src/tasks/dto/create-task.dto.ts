import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';

export enum TaskType {
  TASK = 'task',
  PROJECT = 'project'
}

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium', 
  HIGH = 'High'
}

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus = TaskStatus.TODO;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  assignee?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number = 0;

  @IsNumber()
  @IsOptional()
  user_id?: number;
}
