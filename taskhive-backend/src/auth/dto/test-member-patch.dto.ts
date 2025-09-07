import { IsEmail, IsNotEmpty } from 'class-validator';

export class TestMemberPatchDto {
  @IsNotEmpty()
  user_id: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  old_password: string;

  @IsNotEmpty()
  new_password: string;
}