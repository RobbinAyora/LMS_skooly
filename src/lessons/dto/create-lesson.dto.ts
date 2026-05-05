import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsOptional()
  @IsString()
  videoUrl?: string; // Optional: for external video URLs
}
