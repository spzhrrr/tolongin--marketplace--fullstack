// // backend/src/modules/notifications/notifications.gateway.ts
// import {
//   WebSocketGateway,
//   WebSocketServer,
//   OnGatewayConnection,
//   OnGatewayDisconnect,
//   SubscribeMessage,
// } from '@nestjs/websockets';
// import { Server, Socket } from 'socket.io';
// import { Injectable, Logger } from '@nestjs/common';
// import { NotificationsService } from './services/notifications.service';

// @WebSocketGateway({
//   cors: {
//     origin: [
//       'http://localhost:5173',
//       'http://localhost:3000',
//       /\.vercel\.app$/,
//     ],
//     credentials: true,
//   },
//   namespace: 'notifications',
// })
// @Injectable()
// export class NotificationsGateway
//   implements OnGatewayConnection, OnGatewayDisconnect
// {
//   @WebSocketServer()
//   server: Server;

//   private readonly logger = new Logger(NotificationsGateway.name);
//   private userSockets = new Map<string, string[]>(); // userId -> socketIds[]

//   constructor(private readonly notificationsService: NotificationsService) {}

//   handleConnection(client: Socket) {
//     const userId =
//       client.handshake.auth?.userId || client.handshake.query?.userId;
//     if (userId) {
//       const existing = this.userSockets.get(userId) || [];
//       existing.push(client.id);
//       this.userSockets.set(userId, existing);
//       this.logger.log(`User ${userId} connected with socket ${client.id}`);
//     }
//   }

//   handleDisconnect(client: Socket) {
//     for (const [userId, sockets] of this.userSockets.entries()) {
//       const index = sockets.indexOf(client.id);
//       if (index !== -1) {
//         sockets.splice(index, 1);
//         if (sockets.length === 0) {
//           this.userSockets.delete(userId);
//         } else {
//           this.userSockets.set(userId, sockets);
//         }
//         this.logger.log(`User ${userId} disconnected socket ${client.id}`);
//         break;
//       }
//     }
//   }

//   async sendNotificationToUser(userId: string, notification: any) {
//     const sockets = this.userSockets.get(userId);
//     if (sockets && sockets.length > 0) {
//       sockets.forEach((socketId) => {
//         this.server.to(socketId).emit('new_notification', notification);
//       });
//     }
//   }

//   async sendUnreadCount(userId: string, count: number) {
//     const sockets = this.userSockets.get(userId);
//     if (sockets && sockets.length > 0) {
//       sockets.forEach((socketId) => {
//         this.server.to(socketId).emit('unread_count', { count });
//       });
//     }
//   }
// }
