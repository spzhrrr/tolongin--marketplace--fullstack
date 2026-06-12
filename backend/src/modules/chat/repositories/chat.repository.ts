import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  createConversation(participants: string[], orderId?: string) {
    return this.prisma.conversation.create({
      data: { participants: JSON.stringify(participants), orderId },
    });
  }

  findConversation(id: string) {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  findConversationsForUser(userId: string) {
    // SQLite has no JSON contains operator, so we filter in code
    return this.prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  findBetween(userA: string, userB: string) {
    return this.prisma.conversation.findFirst({
      where: { participants: { contains: userA } },
    });
  }

  async countUnreadMessages(
    conversationId: string,
    userId: string,
  ): Promise<number> {
    const result = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
    });
    return result;
  }
  updateConversation(id: string, data: Prisma.ConversationUpdateInput) {
    return this.prisma.conversation.update({ where: { id }, data });
  }

  deleteConversation(id: string) {
    return this.prisma.conversation.delete({ where: { id } });
  }

  // Messages
  createMessage(data: Prisma.MessageCreateInput) {
    return this.prisma.message.create({
      data,
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }
  findMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });
  }
  markMessagesRead(conversationId: string, exceptSenderId: string) {
    return this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: exceptSenderId },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
