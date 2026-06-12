import { Global, Module } from '@nestjs/common';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { AuditLogService } from './services/audit-log.service';

@Global()
@Module({
  providers: [TokenBlacklistService, AuditLogService],
  exports: [TokenBlacklistService, AuditLogService],
})
export class CommonModule {}
