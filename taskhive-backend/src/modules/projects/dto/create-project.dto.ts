import { IsNotEmpty, IsOptional, IsString, IsEnum, IsInt } from 'class-validator';

export enum ProjectPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export class CreateProjectDto {
  @IsInt()
  user_id: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @IsOptional()
  @IsString()
  due_date?: string;
}
