// backend/src/modules/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { ReviewsController } from './controllers/reviews.controller';
import { ReviewsService } from './services/reviews.service';
import { ReviewsRepository } from './repositories/reviews.repository';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module'; // ✅ TAMBAHKAN

@Module({
  imports: [OrdersModule, NotificationsModule], // ✅ TAMBAHKAN
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsService],
})
export class ReviewsModule {}
