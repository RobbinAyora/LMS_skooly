import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  message?: string;
}
