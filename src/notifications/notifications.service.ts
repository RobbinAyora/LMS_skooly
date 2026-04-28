import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { GetNotificationsDto } from './dto/get-notifications.dto';

interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(data: NotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link,
        metadata: data.metadata,
      },
    });
  }

  async createBulkNotifications(
    userIds: string[],
    data: Omit<NotificationData, 'userId'>,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getUserNotifications(userId: string, query: GetNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async broadcast(data: BroadcastNotificationDto) {
    let userIds: string[];

    if (data.targetUserIds && data.targetUserIds.length > 0) {
      userIds = data.targetUserIds;
    } else if (data.targetRole) {
      const users = await this.prisma.user.findMany({
        where: { role: data.targetRole },
        select: { id: true },
      });
      userIds = users.map((user) => user.id);
    } else {
      const users = await this.prisma.user.findMany({
        select: { id: true },
      });
      userIds = users.map((user) => user.id);
    }

    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  async getNotificationById(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }
}
