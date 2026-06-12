import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({ data });
  }

  findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        service: { include: { category: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        reviews: true,
        dispute: true,
      },
    });
  }

  findByBuyer(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findBySeller(sellerId: string) {
    return this.prisma.order.findMany({
      where: { sellerId },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        seller: { select: { id: true, name: true, avatar: true } },
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: string, data: Prisma.OrderUpdateInput) {
    return this.prisma.order.update({ where: { id }, data });
  }
}
