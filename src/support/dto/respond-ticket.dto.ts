import { IsString, IsNotEmpty } from 'class-validator';

export class RespondTicketDto {
  @IsString()
  @IsNotEmpty()
  response: string;
}
