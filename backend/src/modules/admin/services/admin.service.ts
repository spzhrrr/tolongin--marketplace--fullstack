import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminRepository } from '../repositories/admin.repository';
import { DisputesService } from '../../disputes/services/disputes.service';
import { RejectSellerDto, UpdateSettingsDto } from '../dto/admin.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly disputesService: DisputesService,
    private readonly prisma: PrismaService,
  ) {}

  stats() {
    return this.repo.stats();
  }

  async users() {
    const items = await this.repo.listUsers();
    return items;
  }

  async userDetail(id: string) {
    const u = await this.repo.findUser(id);
    if (!u) throw new NotFoundException();
    const { password, emailOtpHash, phoneOtpHash, ...rest } = u as any;
    return rest;
  }

  async suspendUser(id: string, adminId: string) {
    await this.repo.updateUser(id, { isActive: false });
    await this.repo.logActivity(adminId, 'SUSPEND_USER', 'User', id);
    return { message: 'User suspended' };
  }

  async activateUser(id: string, adminId: string) {
    await this.repo.updateUser(id, { isActive: true });
    await this.repo.logActivity(adminId, 'ACTIVATE_USER', 'User', id);
    return { message: 'User activated' };
  }

  pendingSellers() {
    return this.repo.pendingKyc();
  }

  async approveSeller(userId: string, adminId: string) {
    await this.repo.approveKyc(userId);
    await this.repo.logActivity(adminId, 'APPROVE_KYC', 'User', userId);
    return { message: 'KYC approved' };
  }

  async rejectSeller(userId: string, adminId: string, dto: RejectSellerDto) {
    await this.repo.rejectKyc(userId, dto.reason);
    await this.repo.logActivity(adminId, 'REJECT_KYC', 'User', userId, {
      reason: dto.reason,
    });
    return { message: 'KYC rejected' };
  }

  services() {
    return this.repo.listServices();
  }

  async deleteService(id: string, adminId: string) {
    await this.repo.deleteService(id);
    await this.repo.logActivity(adminId, 'DELETE_SERVICE', 'Service', id);
    return { message: 'Service deleted' };
  }

  jobs() {
    return this.repo.listJobs();
  }

  async deleteJob(id: string, adminId: string) {
    await this.repo.deleteJob(id);
    await this.repo.logActivity(adminId, 'DELETE_JOB', 'Job', id);
    return { message: 'Job deleted' };
  }

  orders() {
    return this.repo.listOrders();
  }

  disputes() {
    return this.repo.listDisputes();
  }

  async resolveDispute(id: string, adminId: string, resolution: string) {
    return this.disputesService.resolve(id, adminId, { resolution });
  }

  activity() {
    return this.repo.listActivity();
  }

  async settings() {
    const all = await this.repo.getSettings();
    return all.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>,
    );
  }

  async updateSettings(dto: UpdateSettingsDto, adminId: string) {
    const updates: { key: string; value: string }[] = [];
    Object.entries(dto).forEach(
      ([k, v]) => v !== undefined && updates.push({ key: k, value: String(v) }),
    );
    await Promise.all(
      updates.map((u) => this.repo.upsertSetting(u.key, u.value)),
    );
    await this.repo.logActivity(
      adminId,
      'UPDATE_SETTINGS',
      'PlatformSettings',
      undefined,
      dto,
    );
    return this.settings();
  }

  //       ====== KYC MANAGEMENT METHODS       ======

  async getKycSubmissions(status: string) {
    const where: any = {};

    if (status === 'pending') {
      where.ktpSubmittedAt = { not: null };
      where.ktpVerified = false;
      where.ktpRejectedReason = null;
    } else if (status === 'approved') {
      where.ktpVerified = true;
    } else if (status === 'rejected') {
      where.ktpRejectedReason = { not: null };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        bankAccounts: {
          where: { isDefault: true },
          take: 1,
        },
      },
      orderBy: { ktpSubmittedAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      kyc: {
        fullName: user.name,
        ktpNumber: user.ktpNumber,
        ktpPhoto: user.ktpPhoto,
        ktpSelfie: user.ktpSelfie,
        bankName: user.bankAccounts[0]?.bankName,
        bankAccountNumber: user.bankAccounts[0]?.accountNumber,
        bankAccountName: user.bankAccounts[0]?.accountName,
        bankProof: user.bankAccounts[0]?.bankProof,
        submittedAt: user.ktpSubmittedAt,
        rejectReason: user.ktpRejectedReason,
      },
    }));
  }

  async approveKyc(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bankAccounts: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user KTP status
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ktpVerified: true,
        ktpRejectedReason: null,
        verified: true,
      },
    });

    // Update bank account status if exists
    if (user.bankAccounts.length > 0) {
      await this.prisma.bankAccount.updateMany({
        where: { userId: userId },
        data: { isVerified: true },
      });
    }

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'KYC_APPROVED',
        entity: 'User',
        entityId: userId,
        metadata: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
        }),
      },
    });

    return { ok: true };
  }

  async rejectKyc(userId: string, adminId: string, reason: string) {
    if (!reason) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ktpVerified: false,
        ktpRejectedReason: reason,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'KYC_REJECTED',
        entity: 'User',
        entityId: userId,
        metadata: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          reason,
        }),
      },
    });

    return { ok: true };
  }
}
