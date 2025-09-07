import { IsEnum, IsOptional, IsNumber } from 'class-validator';

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsNumber()
  position?: number;
}