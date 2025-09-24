import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChangelogDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  task_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  project_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @IsOptional()
  @IsString()
  old_status?: string;

  @IsOptional()
  @IsString()
  new_status?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
