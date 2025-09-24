import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contents?: string;

  @IsOptional()
  @IsIn(['Todo', 'In Progress', 'Done', 'On Hold', 'Request Changes'])
  status?: string;

  @IsOptional()
  @IsIn(['Low', 'Medium', 'High', 'Critical'])
  priority?: string;

  @IsOptional()
  @IsString()
  due_date?: string | null;

  @IsOptional()
  @IsString()
  assignee?: string | null;
}
