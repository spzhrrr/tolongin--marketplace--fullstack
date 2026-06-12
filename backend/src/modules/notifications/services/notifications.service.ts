// backend/src/modules/notifications/services/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notifications.repository';
// import { NotificationsGateway } from '../notifications.gateway'; // HAPUS
import { NotificationType } from '../../../common/constants/enums';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    // private readonly gateway: NotificationsGateway, // HAPUS
  ) {}

  // backend/src/modules/notifications/services/notifications.service.ts

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: object,
    actionUrl?: string,
  ) {
    const notification = await this.repo.create({
      user: { connect: { id: userId } },
      type,
      title,
      body,
      data: data ? JSON.stringify(data) : undefined,
      actionUrl: actionUrl || null, // ✅ PASTIKAN TERSIMPAN
    });

    return notification;
  }

  list(userId: string, unreadOnly = false) {
    return this.repo.findByUser(userId, unreadOnly);
  }

  unread(userId: string) {
    return this.repo.unreadCount(userId);
  }

  async markRead(id: string, userId: string) {
    return this.repo.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    return this.repo.markAllRead(userId);
  }

  delete(id: string, userId: string) {
    return this.repo.delete(id, userId);
  }
}
