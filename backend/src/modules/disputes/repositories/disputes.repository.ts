import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DisputesRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.DisputeCreateInput) {
    return this.prisma.dispute.create({ data });
  }
  findById(id: string) {
    return this.prisma.dispute.findUnique({
      where: { id },
      include: { order: true },
    });
  }
  findByOrder(orderId: string) {
    return this.prisma.dispute.findUnique({ where: { orderId } });
  }
  findAll() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }
  // Ambil sengketa milik user (sebagai pembuat, pembeli, atau penjual pada order)
  findByUser(userId: string) {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          { raisedBy: userId },
          { order: { buyerId: userId } },
          { order: { sellerId: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }
  update(id: string, data: Prisma.DisputeUpdateInput) {
    return this.prisma.dispute.update({ where: { id }, data });
  }
}
