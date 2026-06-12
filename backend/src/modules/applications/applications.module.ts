// backend/src/modules/applications/applications.module.ts
import { Module } from '@nestjs/common';
import { ApplicationsController } from './controllers/applications.controller';
import { ApplicationsService } from './services/applications.service';
import { ApplicationsRepository } from './repositories/applications.repository';
import { JobsModule } from '../jobs/jobs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JobsModule, NotificationsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
