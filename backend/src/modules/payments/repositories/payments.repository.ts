import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.PaymentCreateInput) {
    return this.prisma.payment.create({ data });
  }
  findById(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }
  findByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { order: { select: { id: true, title: true } } },
    });
  }
  update(id: string, data: Prisma.PaymentUpdateInput) {
    return this.prisma.payment.update({ where: { id }, data });
  }
  findByTransactionId(txId: string) {
    return this.prisma.payment.findFirst({ where: { transactionId: txId } });
  }
}
