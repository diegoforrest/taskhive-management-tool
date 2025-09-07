import { IsNotEmpty } from 'class-validator';

export class TestLoginDto {
  @IsNotEmpty()
  user_id: string;

  @IsNotEmpty()
  password: string;
}