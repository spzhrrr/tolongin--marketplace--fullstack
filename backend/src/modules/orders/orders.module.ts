// backend/src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { OrdersTasksService } from './services/orders-tasks.service';
import { OrdersRepository } from './repositories/orders.repository';
import { ServicesModule } from '../services/services.module';
import { ApplicationsModule } from '../applications/applications.module';
import { NotificationsModule } from '../notifications/notifications.module'; // ✅ TAMBAHKAN

@Module({
  imports: [
    ServicesModule,
    ApplicationsModule,
    NotificationsModule, // ✅ TAMBAHKAN
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersTasksService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
