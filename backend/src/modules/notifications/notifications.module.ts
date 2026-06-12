// backend/src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './services/notifications.service';
import { NotificationsRepository } from './repositories/notifications.repository';
import { PrismaModule } from '../../prisma/prisma.module';

// SEMENTARA, GATEWAY DIHAPUS
@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    // NotificationsGateway, // DIHAPUS SEMENTARA
  ],
  exports: [NotificationsService], // ✅ PASTIKAN DIEXPORT
})
export class NotificationsModule {}
