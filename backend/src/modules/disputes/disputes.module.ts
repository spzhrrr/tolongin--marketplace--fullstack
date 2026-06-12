import { Module } from '@nestjs/common';
import { DisputesController } from './controllers/disputes.controller';
import { DisputesService } from './services/disputes.service';
import { DisputesRepository } from './repositories/disputes.repository';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [DisputesController],
  providers: [DisputesService, DisputesRepository],
  exports: [DisputesService, DisputesRepository],
})
export class DisputesModule {}
