import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { NotificationType } from '@prisma/client';
import { Role } from '@prisma/client';

export class BroadcastNotificationDto {
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(Role)
  targetRole?: Role;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetUserIds?: string[];
}
