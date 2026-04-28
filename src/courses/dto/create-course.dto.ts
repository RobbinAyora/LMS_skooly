import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsString()
  instructorId: string;
}
