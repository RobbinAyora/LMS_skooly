import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;
}
