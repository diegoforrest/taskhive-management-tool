import { IsNotEmpty } from 'class-validator';

export class TestProjectPostDto {
  @IsNotEmpty()
  user_id: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;
}
