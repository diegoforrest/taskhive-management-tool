import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['Low', 'Medium', 'High'])
  priority?: string;

  @IsOptional()
  @IsString()
  due_date?: string | null;

  @IsOptional()
  @IsIn(['In Progress', 'To Review', 'Completed', 'On Hold', 'Request Changes'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
