// src/modules/withdrawals/withdrawals.module.ts
import { Module } from '@nestjs/common';
import { WithdrawalsController } from './controllers/withdrawals.controller';
import { WithdrawalsService } from './services/withdrawals.service';
import { WithdrawalsRepository } from './repositories/withdrawals.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, WithdrawalsRepository],
  exports: [WithdrawalsService, WithdrawalsRepository],
})
export class WithdrawalsModule {}
