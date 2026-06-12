import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [
      users,
      services,
      jobs,
      orders,
      pendingKyc,
      disputes,
      completedOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.service.count(),
      this.prisma.job.count(),
      this.prisma.order.count(),
      this.prisma.user.count({
        where: {
          ktpSubmittedAt: { not: null },
          ktpVerified: false,
          ktpRejectedReason: null,
        },
      }),
      this.prisma.dispute.count({ where: { status: 'PENDING' } }),
      this.prisma.order.findMany({
        where: { status: 'COMPLETED' },
        select: { totalAmount: true },
      }),
    ]);
    const revenue = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
    return {
      users,
      services,
      jobs,
      orders,
      pendingSellers: pendingKyc,
      pendingKyc,
      disputes,
      revenue,
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        isBanned: true,
        bannedReason: true,
        emailVerified: true,
        phoneVerified: true,
        ktpVerified: true,
        // bankVerified tidak ada di User model, hapus dari select
        balance: true,
        rating: true,
        completedOrders: true,
        createdAt: true,
      },
    });
  }

  findUser(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  updateUser(id: string, data: any) {
    return this.prisma.user.update({ where: { id }, data });
  }

  pendingKyc() {
    return this.prisma.user.findMany({
      where: {
        ktpSubmittedAt: { not: null },
        ktpVerified: false,
        ktpRejectedReason: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        ktpNumber: true,
        ktpPhoto: true,
        ktpSelfie: true,
        ktpSubmittedAt: true,
      },
      orderBy: { ktpSubmittedAt: 'asc' },
    });
  }

  approveKyc(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ktpVerified: true,
        ktpVerifiedAt: new Date(),
        ktpRejectedReason: null,
      },
    });
  }

  rejectKyc(userId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ktpVerified: false,
        ktpRejectedReason: reason,
      },
    });
  }

  listServices() {
    return this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { id: true, name: true } } },
    });
  }

  deleteService(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }

  listJobs() {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      include: { buyer: { select: { id: true, name: true } } },
    });
  }

  deleteJob(id: string) {
    return this.prisma.job.delete({ where: { id } });
  }

  listOrders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });
  }

  listDisputes() {
    return this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }

  listActivity() {
    return this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  getSettings() {
    return this.prisma.platformSetting.findMany();
  }

  upsertSetting(key: string, value: string) {
    return this.prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  logActivity(
    userId: string | null,
    action: string,
    entity?: string,
    entityId?: string,
    metadata?: object,
  ) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}
