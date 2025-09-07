import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class TestTaskPatchDto {
  @IsNumber()
  task_id: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  status: string;

  @IsNotEmpty()
  contents: string;
}