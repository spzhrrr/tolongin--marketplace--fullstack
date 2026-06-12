import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }
  findByUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      // Jika unreadOnly true, hanya ambil notifikasi yang belum dibaca
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }
  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
  delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({ where: { id, userId } });
  }
}
