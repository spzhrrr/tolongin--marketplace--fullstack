import { Module } from '@nestjs/common';
import { CompatController } from './compat.controller';
import { AuthModule } from '../modules/auth/auth.module';
import { ChatModule } from '../modules/chat/chat.module';
import { AdminModule } from '../modules/admin/admin.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { ReviewsModule } from '../modules/reviews/reviews.module';
import { ApplicationsModule } from '../modules/applications/applications.module';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    AdminModule,
    OrdersModule,
    ReviewsModule,
    ApplicationsModule,
  ],
  controllers: [CompatController],
})
export class CompatModule {}
