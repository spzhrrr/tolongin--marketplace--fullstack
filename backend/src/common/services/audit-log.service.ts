import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Centralized audit-log writer. Persists to ActivityLog table.
 * Safe to call from anywhere — failures are swallowed but logged.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entity?: string,
    entityId?: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: userId || undefined,
          action,
          entity,
          entityId,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
      });
    } catch (e) {
      this.logger.warn(`Audit log failed: ${(e as Error).message}`);
    }
  }
}
