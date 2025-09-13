import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  user_id: string;

  @IsString()
  password: string;
}
