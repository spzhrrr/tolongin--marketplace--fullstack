import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Scheduled task untuk siklus hidup order:
 * - Auto-complete order yang sudah lewat 7 hari di status IN_REVIEW
 * - Auto-cancel order IN_PROGRESS lebih dari 14 hari tanpa pengumpulan kerja
 * - Auto-resolve sengketa yang lewat batas (demo: 3 hari)
 *
 * Berjalan setiap jam. Aman dipanggil berulang (idempotent terhadap status).
 */
@Injectable()
export class OrdersTasksService {
  private readonly logger = new Logger(OrdersTasksService.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOrderLifecycle() {
    try {
      const completed = await this.ordersService.runAutoComplete();
      const cancelled = await this.ordersService.runAutoCancel();
      const resolved = await this.ordersService.runAutoResolveDisputes();
      if (completed || cancelled || resolved) {
        this.logger.log(
          `Scheduled order lifecycle: auto-complete=${completed}, auto-cancel=${cancelled}, auto-resolve-dispute=${resolved}`,
        );
      }
    } catch (e) {
      this.logger.error(
        `Gagal menjalankan order lifecycle task: ${(e as Error).message}`,
      );
    }
  }
}
