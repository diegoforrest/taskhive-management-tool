import { IsOptional, IsInt, IsString } from 'class-validator';

export class CreateChangelogDto {
  @IsOptional()
  @IsInt()
  task_id?: number;

  @IsOptional()
  @IsInt()
  project_id?: number;

  @IsOptional()
  @IsInt()
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
