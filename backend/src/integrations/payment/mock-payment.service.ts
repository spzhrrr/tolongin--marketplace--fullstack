import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  IPaymentService,
  PaymentCreateParams,
  PaymentCreateResult,
} from './payment.interface';

@Injectable()
export class MockPaymentService implements IPaymentService {
  private readonly logger = new Logger('MockPaymentService');

  async createPayment(p: PaymentCreateParams): Promise<PaymentCreateResult> {
    const transactionId = `MOCK-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const paymentUrl = `https://mock-payment.tolongin.local/pay/${transactionId}`;
    this.logger.log(
      `💳 [MOCK] payment created for order=${p.orderId} amount=${p.amount} txn=${transactionId}`,
    );
    return { transactionId, paymentUrl, expiresAt };
  }

  verifyWebhook(_payload: unknown): boolean {
    // In real life: HMAC verify with shared secret.
    return true;
  }

  async getStatus(transactionId: string) {
    this.logger.log(`💳 [MOCK] status check ${transactionId}`);
    return 'COMPLETED' as const;
  }
}
