import { IsNotEmpty, IsNumber, IsEnum } from 'class-validator';

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export class TestChangeLogPostDto {
  @IsNumber()
  task_id: number;

  @IsEnum(TaskStatus)
  old_status: TaskStatus;

  @IsEnum(TaskStatus)
  new_status: TaskStatus;

  @IsNotEmpty()
  remark: string;
}