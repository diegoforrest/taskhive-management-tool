import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress', 
  DONE = 'Done'
}

export class TestTaskPostDto {
  @IsNumber()
  project_id: number;

  @IsNotEmpty()
  name: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsNotEmpty()
  contents: string;
}