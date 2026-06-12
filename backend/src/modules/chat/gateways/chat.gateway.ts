import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../services/chat.service';
import { JwtPayload } from '../../auth/interfaces/auth.interface';
import { getCorsOrigins } from '../../../common/utils/cors';

@WebSocketGateway({
  // Pakai daftar origin terpusat (tidak lagi wildcard '*' bersama credentials)
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: '/chat',
  path: '/api/socket.io',
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);
  // userId -> set of socket ids
  private userSockets = new Map<string, Set<string>>();
  private socketUsers = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);
      if (!token) throw new Error('No token');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('app.jwt.secret') || 'change-me',
      });
      const uid = payload.sub;
      if (!this.userSockets.has(uid)) this.userSockets.set(uid, new Set());
      this.userSockets.get(uid)!.add(client.id);
      this.socketUsers.set(client.id, uid);
      client.data.userId = uid;
      this.logger.log(`WS connect uid=${uid} sid=${client.id}`);
      client.emit('connected', { ok: true });
    } catch (e) {
      this.logger.warn(`WS auth failed: ${(e as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const uid = this.socketUsers.get(client.id);
    if (uid) {
      this.userSockets.get(uid)?.delete(client.id);
      if (this.userSockets.get(uid)?.size === 0) this.userSockets.delete(uid);
      this.socketUsers.delete(client.id);
      this.logger.log(`WS disconnect uid=${uid} sid=${client.id}`);
    }
  }

  private sendToUser(userId: string, event: string, data: unknown) {
    const sids = this.userSockets.get(userId);
    if (!sids) return;
    for (const sid of sids) this.server.to(sid).emit(event, data);
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.conversationId) return { ok: false };
    try {
      await this.chatService.getConversation(body.conversationId, userId);
      client.join(`conv:${body.conversationId}`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = client.data.userId;
    if (!userId || !body?.conversationId) return;
    try {
      await this.chatService.getConversation(body.conversationId, userId);
    } catch {
      return;
    }
    client.to(`conv:${body.conversationId}`).emit('typing', {
      conversationId: body.conversationId,
      userId,
    });
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { conversationId: string; content: string; attachment?: any },
  ) {
    const userId = client.data.userId;
    if (!userId) return { ok: false };
    try {
      const msg = await this.chatService.sendMessage(
        body.conversationId,
        userId,
        body,
      );
      this.server.to(`conv:${body.conversationId}`).emit('new-message', msg);
      const conv = await this.chatService.getConversation(
        body.conversationId,
        userId,
      );
      conv.participants
        .filter((p: string) => p !== userId)
        .forEach((p: string) => this.sendToUser(p, 'new-message-notify', msg));
      return { ok: true, message: msg };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { type: 'pong', at: new Date().toISOString() };
  }
}
