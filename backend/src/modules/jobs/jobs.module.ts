import { Module } from '@nestjs/common';
import { JobsController } from './controllers/jobs.controller';
import { JobsService } from './services/jobs.service';
import { JobsRepository } from './repositories/jobs.repository';

@Module({
  controllers: [JobsController],
  providers: [JobsService, JobsRepository],
  exports: [JobsService, JobsRepository],
})
export class JobsModule {}
