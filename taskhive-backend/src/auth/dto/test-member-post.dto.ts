import { IsEmail, IsNotEmpty } from 'class-validator';

export class TestMemberPostDto {
  @IsNotEmpty()
  user_id: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}