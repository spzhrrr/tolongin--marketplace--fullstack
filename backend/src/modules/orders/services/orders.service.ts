import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { OrdersRepository } from '../repositories/orders.repository';
import { ServicesRepository } from '../../services/repositories/services.repository';
import { ApplicationsService } from '../../applications/services/applications.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateOrderFromServiceDto,
  CancelOrderDto,
  RevisionRequestDto,
  SubmitWorkDto,
  OpenDisputeDto,
} from '../dto/order.dto';
import {
  parseJsonField,
  stringifyJsonField,
} from '../../../common/utils/helpers';
import {
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  OrderStatus,
  ROLE,
  APPLICATION_STATUS,
  DISPUTE_STATUS,
} from '../../../common/constants/enums';

const PLATFORM_FEE_RATE = 0.05; // 5%
const AUTO_COMPLETE_DAYS = 7;
const AUTO_CANCEL_DAYS = 14;
const DISPUTE_AUTO_RESOLVE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

interface TimelineEntry {
  status: OrderStatus;
  at: string;
  by: string;
  note?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly servicesRepo: ServicesRepository,
    private readonly applicationsService: ApplicationsService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  private toDto(o: any) {
    const parsedSubmission = parseJsonField(o.workSubmission, null);
    const proofAttachments = parseJsonField<string[]>(o.workProof, []);
    const submissionFiles = parseJsonField<string[]>(o.workSubmissionFiles, []);
    return {
      ...o,
      timeline: parseJsonField<TimelineEntry[]>(o.timeline, []),
      workSubmissionFiles: submissionFiles,
      workSubmission:
        parsedSubmission ||
        (o.workNote || proofAttachments.length || o.workSubmissionNote
          ? {
              note: o.workNote || o.workSubmissionNote,
              attachments: proofAttachments.length
                ? proofAttachments
                : submissionFiles,
              submittedAt: o.workSubmittedAt || o.workSubmissionDate,
              status: o.workSubmissionStatus || null,
            }
          : null),
    };
  }

  private roleFor(
    userId: string,
    order: { buyerId: string; sellerId: string },
    userRole: string,
  ): 'buyer' | 'seller' | 'admin' | null {
    if (userRole === ROLE.ADMIN) return 'admin';
    if (userId === order.buyerId) return 'buyer';
    if (userId === order.sellerId) return 'seller';
    return null;
  }

  private async transition(
    orderId: string,
    userId: string,
    userRole: string,
    nextStatus: OrderStatus,
    note?: string,
  ) {
    const o = await this.repo.findById(orderId);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);
    if (!role) throw new ForbiddenException();

    const current = o.status as OrderStatus;
    const allowed = ORDER_TRANSITIONS[current]?.[role] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Transition not allowed: ${current} -> ${nextStatus} (role: ${role})`,
      );
    }

    return this.applyStatus(o, nextStatus, userId, note);
  }

  private async applyStatus(
    o: any,
    nextStatus: OrderStatus,
    byUserId: string,
    note?: string,
  ) {
    const timeline = parseJsonField<TimelineEntry[]>(o.timeline, []);
    timeline.push({
      status: nextStatus,
      at: new Date().toISOString(),
      by: byUserId,
      note,
    });

    const data: any = {
      status: nextStatus,
      timeline: stringifyJsonField(timeline),
    };

    if (nextStatus === ORDER_STATUS.COMPLETED) {
      data.completedAt = new Date();
      data.workApprovedAt = new Date();
      data.workSubmissionStatus = 'APPROVED';
      data.escrowStatus = 'RELEASED';
      if (!o.fundsReleasedAt) {
        data.fundsReleasedAt = new Date();
        await this.prisma.user.update({
          where: { id: o.sellerId },
          data: { balance: { increment: o.amount } },
        });
      }
    }

    if (nextStatus === ORDER_STATUS.CANCELLED) {
      data.cancelledAt = new Date();
      if (note) data.cancellationReason = note;
    }

    const updated = await this.repo.update(o.id, data);
    await this.notifyStatusChange(o, nextStatus, byUserId, note);
    return this.toDto(updated);
  }

  private async notifyStatusChange(
    o: any,
    nextStatus: OrderStatus,
    byUserId: string,
    note?: string,
  ) {
    const url = `/orders/${o.id}`;
    try {
      if (nextStatus === ORDER_STATUS.COMPLETED) {
        await this.notifications.notify(
          o.sellerId,
          'ORDER',
          '💰 Dana Dirilis',
          `Pesanan "${o.title}" telah selesai. Dana sebesar ${this.formatCurrency(o.amount)} telah masuk ke saldo Anda.`,
          { orderId: o.id, event: 'WORK_APPROVED' },
          url,
        );
        await this.notifications.notify(
          o.buyerId,
          'ORDER',
          '✅ Pesanan Selesai',
          `Pesanan "${o.title}" telah selesai. Terima kasih telah menggunakan layanan Tolongin.`,
          { orderId: o.id, event: 'ORDER_COMPLETED' },
          url,
        );
      } else if (nextStatus === ORDER_STATUS.REVISION_REQUESTED) {
        await this.notifications.notify(
          o.sellerId,
          'ORDER',
          '🔄 Permintaan Revisi',
          `Pembeli meminta revisi untuk pesanan "${o.title}".${note ? ' Alasan: ' + note : ''}`,
          { orderId: o.id, event: 'REVISION_REQUESTED', reason: note },
          url,
        );
      } else if (nextStatus === ORDER_STATUS.ACCEPTED) {
        await this.notifications.notify(
          o.buyerId,
          'ORDER',
          '✅ Pesanan Diterima',
          `Penjual menerima pesanan "${o.title}". Pengerjaan akan segera dimulai.`,
          { orderId: o.id, event: 'ORDER_ACCEPTED' },
          url,
        );
      } else if (nextStatus === ORDER_STATUS.IN_REVIEW) {
        await this.notifications.notify(
          o.buyerId,
          'ORDER',
          '📦 Hasil Kerja Dikirim',
          `Penjual telah mengirimkan hasil kerja untuk "${o.title}". Silakan review dan approve.`,
          { orderId: o.id, event: 'WORK_SUBMITTED' },
          url,
        );
      } else if (nextStatus === ORDER_STATUS.CANCELLED) {
        const target = byUserId === o.buyerId ? o.sellerId : o.buyerId;
        await this.notifications.notify(
          target,
          'ORDER',
          '❌ Pesanan Dibatalkan',
          `Pesanan "${o.title}" telah dibatalkan.${note ? ' Alasan: ' + note : ''}`,
          { orderId: o.id, event: 'ORDER_CANCELLED', reason: note },
          url,
        );
      }
    } catch {
      // Notifikasi tidak boleh menggagalkan transaksi utama
    }
  }

  private formatCurrency(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  async createFromService(
    buyerId: string,
    serviceId: string,
    dto: CreateOrderFromServiceDto,
  ) {
    const s = await this.servicesRepo.findById(serviceId);
    if (!s) throw new NotFoundException('Service not found');
    if (!s.isActive) throw new BadRequestException('Service is not active');
    if (s.sellerId === buyerId)
      throw new BadRequestException('Cannot order your own service');

    const fee = +(s.price * PLATFORM_FEE_RATE).toFixed(2);
    const totalAmount = +(s.price + fee).toFixed(2);
    const timeline: TimelineEntry[] = [
      {
        status: ORDER_STATUS.WAITING_CONFIRMATION,
        at: new Date().toISOString(),
        by: buyerId,
      },
    ];

    const created = await this.repo.create({
      buyer: { connect: { id: buyerId } },
      seller: { connect: { id: s.sellerId } },
      service: { connect: { id: s.id } },
      title: s.title,
      amount: s.price,
      fee,
      totalAmount,
      status: ORDER_STATUS.WAITING_CONFIRMATION,
      notes: dto.notes,
      deliveryType: dto.deliveryType || 'DIGITAL',
      deliveryAddress: dto.deliveryAddress,
      timeline: stringifyJsonField(timeline),
    });

    await this.notifications
      .notify(
        s.sellerId,
        'ORDER',
        '📦 Pesanan Baru',
        `Anda menerima pesanan baru: "${s.title}" seharga ${this.formatCurrency(s.price)}.`,
        { orderId: created.id, event: 'ORDER_CREATED' },
        `/orders/${created.id}`,
      )
      .catch(() => undefined);

    return this.toDto(created);
  }

  async createFromApplication(buyerId: string, applicationId: string) {
    const app = await this.applicationsService.findById(applicationId);
    if (!app) throw new NotFoundException('Application not found');
    if (app.job.buyerId !== buyerId) throw new ForbiddenException();
    if (app.status !== APPLICATION_STATUS.ACCEPTED)
      throw new BadRequestException('Application not accepted');

    const fee = +(app.proposedPrice * PLATFORM_FEE_RATE).toFixed(2);
    const totalAmount = +(app.proposedPrice + fee).toFixed(2);
    const timeline: TimelineEntry[] = [
      {
        status: ORDER_STATUS.WAITING_CONFIRMATION,
        at: new Date().toISOString(),
        by: buyerId,
      },
    ];

    const created = await this.repo.create({
      buyer: { connect: { id: buyerId } },
      seller: { connect: { id: app.sellerId } },
      application: { connect: { id: app.id } },
      title: app.job.title,
      amount: app.proposedPrice,
      fee,
      totalAmount,
      status: ORDER_STATUS.WAITING_CONFIRMATION,
      timeline: stringifyJsonField(timeline),
    });

    await this.notifications
      .notify(
        app.sellerId,
        'ORDER',
        '📦 Pesanan Baru',
        `Pekerjaan "${app.job.title}" telah dijadikan pesanan. Silakan tunggu pembayaran dari pembeli.`,
        { orderId: created.id, event: 'ORDER_CREATED' },
        `/orders/${created.id}`,
      )
      .catch(() => undefined);

    return this.toDto(created);
  }

  async getById(id: string, userId: string, userRole: string) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    if (
      userRole !== ROLE.ADMIN &&
      o.buyerId !== userId &&
      o.sellerId !== userId
    ) {
      throw new ForbiddenException();
    }
    return this.toDto(o);
  }

  async listByBuyer(buyerId: string) {
    const items = await this.repo.findByBuyer(buyerId);
    return items.map((i) => this.toDto(i));
  }

  async listBySeller(sellerId: string) {
    const items = await this.repo.findBySeller(sellerId);
    return items.map((i) => this.toDto(i));
  }

  accept(id: string, userId: string, userRole: string) {
    return this.transition(id, userId, userRole, ORDER_STATUS.ACCEPTED);
  }

  start(id: string, userId: string, userRole: string) {
    return this.transition(id, userId, userRole, ORDER_STATUS.IN_PROGRESS);
  }

  submitReview(id: string, userId: string, userRole: string) {
    return this.transition(id, userId, userRole, ORDER_STATUS.IN_REVIEW);
  }

  async submitWork(
    id: string,
    userId: string,
    userRole: string,
    dto: SubmitWorkDto,
  ) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);
    if (role !== 'seller') throw new ForbiddenException();
    if (
      o.status !== ORDER_STATUS.IN_PROGRESS &&
      o.status !== ORDER_STATUS.REVISION_REQUESTED
    ) {
      throw new BadRequestException(
        'Hasil kerja hanya bisa dikumpulkan setelah order dikerjakan',
      );
    }

    const attachments = dto.attachments || [];
    const now = new Date();
    const timeline = parseJsonField<TimelineEntry[]>(o.timeline, []);
    timeline.push({
      status: ORDER_STATUS.IN_REVIEW,
      at: now.toISOString(),
      by: userId,
      note: dto.note,
    });

    const updated = await this.repo.update(id, {
      status: ORDER_STATUS.IN_REVIEW,
      workSubmission: stringifyJsonField({
        note: dto.note,
        attachments,
        submittedBy: userId,
        submittedAt: now.toISOString(),
      }),
      workProof: stringifyJsonField(attachments),
      workNote: dto.note,
      workSubmittedAt: now,
      workSubmissionNote: dto.note,
      workSubmissionFiles: stringifyJsonField(attachments),
      workSubmissionDate: now,
      workSubmissionStatus: 'PENDING',
      autoReleaseAt: new Date(now.getTime() + AUTO_COMPLETE_DAYS * DAY_MS),
      workRejectedAt: null,
      workRejectionReason: null,
      escrowStatus: 'AWAITING_APPROVAL',
      timeline: stringifyJsonField(timeline),
    } as any);

    await this.notifications
      .notify(
        o.buyerId,
        'ORDER',
        '📦 Hasil Kerja Dikirim',
        `Penjual telah mengirimkan hasil kerja untuk "${o.title}". Silakan review dan approve.`,
        { orderId: o.id, event: 'WORK_SUBMITTED' },
        `/orders/${o.id}`,
      )
      .catch(() => undefined);

    return this.toDto(updated);
  }

  async approveWork(id: string, userId: string, userRole: string) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);
    if (role !== 'buyer' && role !== 'admin')
      throw new ForbiddenException('Hanya pembeli yang dapat menyetujui');

    if (o.status === ORDER_STATUS.COMPLETED) {
      return this.toDto(o);
    }

    if (o.status !== ORDER_STATUS.IN_REVIEW) {
      throw new BadRequestException(
        'Order tidak sedang menunggu persetujuan hasil kerja',
      );
    }

    return this.applyStatus(o, ORDER_STATUS.COMPLETED, userId);
  }

  async complete(id: string, userId: string, userRole: string) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);

    if (o.status === ORDER_STATUS.COMPLETED) {
      return this.toDto(o);
    }

    if (role !== 'buyer' && role !== 'admin')
      throw new ForbiddenException('Hanya pembeli yang dapat menyelesaikan');

    if (o.status !== ORDER_STATUS.IN_REVIEW) {
      throw new BadRequestException('Order harus dalam status review');
    }

    return this.applyStatus(o, ORDER_STATUS.COMPLETED, userId);
  }

  async rejectWork(
    id: string,
    userId: string,
    userRole: string,
    dto: RevisionRequestDto,
  ) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);
    if (role !== 'buyer') throw new ForbiddenException();
    if (o.status !== ORDER_STATUS.IN_REVIEW) {
      throw new BadRequestException('Order is not waiting for review');
    }

    const timeline = parseJsonField<TimelineEntry[]>(o.timeline, []);
    timeline.push({
      status: ORDER_STATUS.REVISION_REQUESTED,
      at: new Date().toISOString(),
      by: userId,
      note: dto.reason,
    });

    const updated = await this.repo.update(id, {
      status: ORDER_STATUS.REVISION_REQUESTED,
      workRejectedAt: new Date(),
      workRejectionReason: dto.reason,
      workSubmissionStatus: 'REVISION_REQUESTED',
      escrowStatus: 'REVISION_REQUESTED',
      timeline: stringifyJsonField(timeline),
    } as any);

    await this.notifications
      .notify(
        o.sellerId,
        'ORDER',
        '🔄 Permintaan Revisi',
        `Pembeli meminta revisi untuk "${o.title}". Alasan: ${dto.reason}`,
        { orderId: o.id, event: 'REVISION_REQUESTED', reason: dto.reason },
        `/orders/${o.id}`,
      )
      .catch(() => undefined);

    return this.toDto(updated);
  }

  requestRevision(
    id: string,
    userId: string,
    userRole: string,
    dto: RevisionRequestDto,
  ) {
    return this.transition(
      id,
      userId,
      userRole,
      ORDER_STATUS.REVISION_REQUESTED,
      dto.reason,
    );
  }

  cancel(id: string, userId: string, userRole: string, dto: CancelOrderDto) {
    return this.transition(
      id,
      userId,
      userRole,
      ORDER_STATUS.CANCELLED,
      dto.reason,
    );
  }

  async openDispute(
    id: string,
    userId: string,
    userRole: string,
    dto: OpenDisputeDto,
  ) {
    const o = await this.repo.findById(id);
    if (!o) throw new NotFoundException('Order not found');
    const role = this.roleFor(userId, o, userRole);
    if (role !== 'buyer' && role !== 'seller')
      throw new ForbiddenException(
        'Hanya pihak terkait yang dapat membuka sengketa',
      );

    const existing = await this.prisma.dispute.findUnique({
      where: { orderId: id },
    });
    if (existing)
      throw new BadRequestException('Sengketa untuk order ini sudah ada');

    const now = new Date();
    const dispute = await this.prisma.dispute.create({
      data: {
        order: { connect: { id } },
        raiser: { connect: { id: userId } },
        reason: dto.reason,
        description: dto.description,
        evidence: stringifyJsonField(dto.evidence || []),
        status: DISPUTE_STATUS.PENDING,
        autoResolveAt: new Date(
          now.getTime() + DISPUTE_AUTO_RESOLVE_DAYS * DAY_MS,
        ),
      },
    });

    const timeline = parseJsonField<TimelineEntry[]>(o.timeline, []);
    timeline.push({
      status: ORDER_STATUS.DISPUTED,
      at: now.toISOString(),
      by: userId,
      note: dto.reason,
    });

    await this.repo.update(id, {
      status: ORDER_STATUS.DISPUTED,
      workSubmissionStatus: 'DISPUTED',
      timeline: stringifyJsonField(timeline),
    } as any);

    const target = userId === o.buyerId ? o.sellerId : o.buyerId;
    await this.notifications
      .notify(
        target,
        'DISPUTE',
        '⚠️ Sengketa Dibuka',
        `Sengketa dibuka untuk pesanan "${o.title}". Alasan: ${dto.reason}`,
        { orderId: o.id, disputeId: dispute.id, event: 'DISPUTE_OPENED' },
        `/orders/${o.id}`,
      )
      .catch(() => undefined);

    return {
      ...dispute,
      evidence: parseJsonField<string[]>(dispute.evidence, []),
    };
  }

  async getTimeline(id: string, userId: string, userRole: string) {
    const o = await this.getById(id, userId, userRole);
    return o.timeline;
  }

  async getInvoice(id: string, userId: string, userRole: string) {
    const o = await this.getById(id, userId, userRole);
    return {
      orderId: o.id,
      title: o.title,
      buyer: o.buyer,
      seller: o.seller,
      amount: o.amount,
      fee: o.fee,
      total: o.totalAmount,
      status: o.status,
      issuedAt: o.createdAt,
      paidAt: o.completedAt,
    };
  }

  async runAutoComplete(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.order.findMany({
      where: {
        status: ORDER_STATUS.IN_REVIEW,
        autoReleaseAt: { not: null, lte: now },
      },
    });
    let count = 0;
    for (const o of candidates) {
      await this.applyStatus(
        o,
        ORDER_STATUS.COMPLETED,
        'SYSTEM',
        `Auto-complete setelah ${AUTO_COMPLETE_DAYS} hari tanpa persetujuan`,
      );
      count++;
    }
    return count;
  }

  async runAutoCancel(): Promise<number> {
    const threshold = new Date(Date.now() - AUTO_CANCEL_DAYS * DAY_MS);
    const candidates = await this.prisma.order.findMany({
      where: {
        status: ORDER_STATUS.IN_PROGRESS,
        workSubmittedAt: null,
        updatedAt: { lte: threshold },
      },
    });
    let count = 0;
    for (const o of candidates) {
      await this.applyStatus(
        o,
        ORDER_STATUS.CANCELLED,
        'SYSTEM',
        `Auto-cancel: tidak ada pengumpulan hasil kerja dalam ${AUTO_CANCEL_DAYS} hari`,
      );
      count++;
    }
    return count;
  }

  async runAutoResolveDisputes(): Promise<number> {
    const now = new Date();
    const disputes = await this.prisma.dispute.findMany({
      where: {
        status: DISPUTE_STATUS.PENDING,
        autoResolveAt: { not: null, lte: now },
      },
      include: { order: true },
    });
    let count = 0;
    for (const d of disputes) {
      await this.prisma.dispute.update({
        where: { id: d.id },
        data: {
          status: DISPUTE_STATUS.RESOLVED,
          resolution:
            'Diselesaikan otomatis oleh sistem setelah 3 hari (demo).',
          resolvedAt: now,
        },
      });
      if (d.order && d.order.status === ORDER_STATUS.DISPUTED) {
        await this.applyStatus(
          d.order,
          ORDER_STATUS.COMPLETED,
          'SYSTEM',
          'Auto-resolve sengketa (demo)',
        );
      }
      const targets = d.order
        ? [d.order.buyerId, d.order.sellerId]
        : [d.raisedBy];
      for (const t of targets) {
        await this.notifications
          .notify(
            t,
            'DISPUTE',
            '✅ Sengketa Diselesaikan',
            'Sengketa pesanan Anda telah diselesaikan otomatis oleh sistem.',
            { disputeId: d.id, event: 'DISPUTE_RESOLVED' },
            d.order ? `/orders/${d.order.id}` : '/disputes',
          )
          .catch(() => undefined);
      }
      count++;
    }
    return count;
  }
}
