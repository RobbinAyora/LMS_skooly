import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query() query: GetNotificationsDto,
  ) {
    return this.notificationsService.getUserNotifications(user.userId, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.userId);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Post('admin/broadcast')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(dto);
  }
}
