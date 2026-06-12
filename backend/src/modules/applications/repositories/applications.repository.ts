import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ApplicationCreateInput) {
    return this.prisma.application.create({ data });
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true },
    });
  }

  findById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            buyer: { select: { id: true, name: true, avatar: true } },
          },
        },
        seller: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  findByJobAndSeller(jobId: string, sellerId: string) {
    return this.prisma.application.findUnique({
      where: { jobId_sellerId: { jobId, sellerId } },
    });
  }

  findBySeller(sellerId: string) {
    return this.prisma.application.findMany({
      where: { sellerId },
      include: { job: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByJob(jobId: string) {
    return this.prisma.application.findMany({
      where: { jobId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            ktpVerified: true,
            rating: true,
            reviewCount: true,
            completedOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: string, data: Prisma.ApplicationUpdateInput) {
    return this.prisma.application.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.application.delete({ where: { id } });
  }
}
