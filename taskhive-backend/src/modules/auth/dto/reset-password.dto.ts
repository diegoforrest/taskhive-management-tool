import { IsString, IsOptional, MinLength, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ResetPasswordDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tid?: number;

  @IsOptional()
  @IsString()
  token?: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
