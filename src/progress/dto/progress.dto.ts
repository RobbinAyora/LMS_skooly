import { IsString, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CompleteLessonDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  lessonId: string;
}

export class SaveProgressTimeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsInt()
  @Min(0)
  lastWatchedSeconds: number;
}
