import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt } from 'class-validator';

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export class CreateTaskDto {
  @IsInt()
  project_id: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contents?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsOptional()
  @IsString()
  assignee?: string;
}
