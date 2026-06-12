// backend/src/modules/chat/services/chat.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ChatRepository } from '../repositories/chat.repository';
import { CreateConversationDto, SendMessageDto } from '../dto/chat.dto';
import { parseJsonField } from '../../../common/utils/helpers';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly repo: ChatRepository,
    private readonly prisma: PrismaService,
  ) {}

  private toConvDto(c: any) {
    return { ...c, participants: parseJsonField<string[]>(c.participants, []) };
  }

  async listConversations(userId: string) {
    const all = await this.repo.findConversationsForUser(userId);
    const convs = all
      .map((c) => this.toConvDto(c))
      .filter((c: any) => c.participants.includes(userId));

    // Tambahkan data other participant untuk setiap conversation
    const enrichedConvs = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.participants.find((p) => p !== userId);
        let other = null;
        if (otherId) {
          const user = await this.prisma.user.findUnique({
            where: { id: otherId },
            select: {
              id: true,
              name: true,
              avatar: true,
              bio: true,
              verified: true,
            },
          });
          other = user;
        }
        // Hitung unread messages
        const unreadCount = await this.repo.countUnreadMessages(
          conv.id,
          userId,
        );
        return {
          id: conv.id,
          other,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
          unread: unreadCount,
        };
      }),
    );

    return enrichedConvs;
  }

  async getConversation(id: string, userId: string) {
    const c = await this.repo.findConversation(id);
    if (!c) throw new NotFoundException('Conversation not found');
    const dto = this.toConvDto(c);
    if (!dto.participants.includes(userId)) throw new ForbiddenException();

    const otherId = dto.participants.find((p) => p !== userId);
    let other = null;
    if (otherId) {
      const user = await this.prisma.user.findUnique({
        where: { id: otherId },
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
        },
      });
      other = user;
    }

    return {
      id: dto.id,
      participants: dto.participants,
      other,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  async getMessages(conversationId: string, userId: string) {
    await this.getConversation(conversationId, userId);
    const messages = await this.repo.findMessages(conversationId);
    await this.repo.markMessagesRead(conversationId, userId);
    return messages.map((m) => ({
      ...m,
      attachment: m.attachment ? JSON.parse(m.attachment) : null,
    }));
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    if (!dto.content && !dto.attachment)
      throw new BadRequestException('Content or attachment required');
    await this.getConversation(conversationId, userId);
    const message = await this.repo.createMessage({
      conversation: { connect: { id: conversationId } },
      sender: { connect: { id: userId } },
      content: dto.content || '',
      attachment: dto.attachment ? JSON.stringify(dto.attachment) : null,
    });
    const preview = dto.content || `📎 ${dto.attachment?.name || 'File'}`;
    await this.repo.updateConversation(conversationId, {
      lastMessage: preview,
      lastMessageAt: new Date(),
    });
    return {
      ...message,
      attachment: message.attachment ? JSON.parse(message.attachment) : null,
    };
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.getConversation(conversationId, userId);
    await this.repo.markMessagesRead(conversationId, userId);
    return { ok: true };
  }

  async deleteConversation(id: string, userId: string) {
    await this.getConversation(id, userId);
    await this.repo.deleteConversation(id);
    return { message: 'Conversation deleted' };
  }

  async startConversation(userId: string, dto: CreateConversationDto) {
    if (dto.recipientId === userId)
      throw new BadRequestException('Cannot chat with yourself');

    // Cek existing conversation
    const all = await this.repo.findConversationsForUser(userId);
    const existing = all.find((c) => {
      const parts = parseJsonField<string[]>(c.participants, []);
      return parts.includes(userId) && parts.includes(dto.recipientId);
    });

    if (existing) {
      const conv = this.toConvDto(existing);
      // Ambil data other participant
      const otherId = conv.participants.find((p) => p !== userId);
      let other = null;
      if (otherId) {
        const user = await this.prisma.user.findUnique({
          where: { id: otherId },
          select: {
            id: true,
            name: true,
            avatar: true,
            bio: true,
            verified: true,
          },
        });
        other = user;
      }
      return {
        id: conv.id,
        other,
        createdAt: conv.createdAt,
      };
    }

    // Buat baru
    const created = await this.repo.createConversation(
      [userId, dto.recipientId],
      dto.orderId,
    );
    const conv = this.toConvDto(created);

    // Ambil data other participant
    const otherId = conv.participants.find((p) => p !== userId);
    let other = null;
    if (otherId) {
      const user = await this.prisma.user.findUnique({
        where: { id: otherId },
        select: {
          id: true,
          name: true,
          avatar: true,
          bio: true,
          verified: true,
        },
      });
      other = user;
    }

    return {
      id: conv.id,
      other,
      createdAt: conv.createdAt,
    };
  }
}
