import { IsNotEmpty, IsNumber } from 'class-validator';

export class TestProjectPatchDto {
  @IsNumber()
  id: number;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;
}