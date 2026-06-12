import { Module } from '@nestjs/common';
import { ServicesController } from './controllers/services.controller';
import { ServicesService } from './services/services.service';
import { ServicesRepository } from './repositories/services.repository';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
