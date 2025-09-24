import { IsNumber, IsString, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @Type(() => Number)
  @IsNumber()
  project_id: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contents?: string;

  @IsOptional()
  @IsIn(['Low', 'Medium', 'High', 'Critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  due_date?: string;

  @IsOptional()
  @IsString()
  assignee?: string;
}
