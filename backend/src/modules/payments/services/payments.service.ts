import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsRepository } from '../repositories/payments.repository';
import { OrdersRepository } from '../../orders/repositories/orders.repository';
import { CreatePaymentDto } from '../dto/payment.dto';
import {
  PAYMENT_STATUS,
  ORDER_STATUS,
  PAYMENT_METHOD_VALUES,
} from '../../../common/constants/enums';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.ordersRepo.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId) throw new ForbiddenException();
    if (order.status !== ORDER_STATUS.WAITING_CONFIRMATION) {
      throw new BadRequestException('Order is not awaiting payment');
    }
    const payment = await this.repo.create({
      order: { connect: { id: order.id } },
      user: { connect: { id: userId } },
      amount: order.amount,
      fee: order.fee,
      totalAmount: order.totalAmount,
      method: dto.method,
      status: PAYMENT_STATUS.PENDING,
      transactionId: 'DEMO-' + Date.now(),
      paymentUrl: `https://demo-pay.tolongin.com/${order.id}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return payment;
  }

  async checkStatus(id: string, userId: string) {
    const p = await this.repo.findById(id);
    if (!p) throw new NotFoundException();
    if (p.userId !== userId) throw new ForbiddenException();
    return { id: p.id, status: p.status, paidAt: p.paidAt };
  }

  history(userId: string) {
    return this.repo.findByUser(userId);
  }

  getMethods() {
    return PAYMENT_METHOD_VALUES.map((m) => ({
      code: m,
      name: m.replace('_', ' '),
    }));
  }

  // Webhook (demo): mark payment as completed and accept the order
  async webhook(provider: string, body: any) {
    const txId = body?.transactionId || body?.order_id;
    if (!txId) return { ok: false };
    const payment = await this.repo.findByTransactionId(txId);
    if (!payment) return { ok: false };
    if (
      body?.status === 'success' ||
      body?.transaction_status === 'settlement'
    ) {
      await this.repo.update(payment.id, {
        status: PAYMENT_STATUS.COMPLETED,
        paidAt: new Date(),
      });
      await this.ordersRepo.update(payment.orderId, {
        status: ORDER_STATUS.ACCEPTED,
      });
    }
    return { ok: true, provider };
  }
}
