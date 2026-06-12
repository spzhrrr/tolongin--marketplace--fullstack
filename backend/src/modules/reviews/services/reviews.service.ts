import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ReviewsRepository } from '../repositories/reviews.repository';
import { OrdersRepository } from '../../orders/repositories/orders.repository';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReplyReviewDto,
} from '../dto/review.dto';
import {
  parseJsonField,
  stringifyJsonField,
} from '../../../common/utils/helpers';
import { ORDER_STATUS, ROLE } from '../../../common/constants/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/services/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly repo: ReviewsRepository,
    private readonly ordersRepo: OrdersRepository,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private toDto(r: any) {
    // ✅ PASTIKAN REVIEWER DATA TIDAK ANONIM - TAMPILKAN NAMA LENGKAP
    const reviewer = r.reviewer || {};
    return {
      ...r,
      images: parseJsonField<string[]>(r.images, []),
      reviewer: {
        id: reviewer.id,
        name: reviewer.name || 'Pengguna',
        avatar: reviewer.avatar,
      },
    };
  }

  async create(userId: string, dto: CreateReviewDto) {
    const order = await this.ordersRepo.findById(dto.orderId);
    if (!order) throw new NotFoundException('Pesanan tidak ditemukan');

    // Hanya pembeli ATAU penjual pada order ini yang boleh memberi review (dual-review)
    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;
    if (!isBuyer && !isSeller)
      throw new ForbiddenException(
        'Hanya pihak yang terlibat dalam pesanan yang dapat memberi ulasan',
      );

    // Order harus sudah selesai sebelum bisa diberi ulasan
    if (order.status !== ORDER_STATUS.COMPLETED)
      throw new BadRequestException('Pesanan harus berstatus selesai');

    // Cek duplikasi: tiap pihak hanya boleh memberi 1 ulasan per pesanan
    const existing = await this.repo.findByOrderAndReviewer(
      dto.orderId,
      userId,
    );
    if (existing)
      throw new BadRequestException(
        'Anda sudah memberi ulasan untuk pesanan ini',
      );

    // Tentukan siapa yang diulas (lawan transaksi) dan tipe ulasannya
    const revieweeId = isBuyer ? order.sellerId : order.buyerId;
    const reviewType = isBuyer ? 'BUYER_TO_SELLER' : 'SELLER_TO_BUYER';

    const created = await this.repo.create({
      order: { connect: { id: order.id } },
      reviewer: { connect: { id: userId } },
      reviewee: { connect: { id: revieweeId } },
      service:
        isBuyer && order.serviceId
          ? { connect: { id: order.serviceId } }
          : undefined,
      rating: dto.rating,
      comment: dto.comment,
      images: stringifyJsonField(dto.images || []),
      isAnonymous: false, // ✅ JANGAN ANONIM - TAMPILKAN NAMA ASLI
      reviewType: reviewType as any,
    });

    // Update agregat rating/reviewCount untuk user yang diulas
    const agg = await this.repo.aggregateSellerRating(revieweeId);
    await this.prisma.user.update({
      where: { id: revieweeId },
      data: {
        rating: agg._avg.rating || 0,
        reviewCount: agg._count,
      },
    });

    // Update rating & reviewCount service (hanya untuk ulasan pembeli ke penjual)
    if (isBuyer && order.serviceId) {
      const svcAgg = await this.prisma.review.aggregate({
        where: { serviceId: order.serviceId },
        _avg: { rating: true },
        _count: true,
      });
      await this.prisma.service.update({
        where: { id: order.serviceId },
        data: {
          rating: svcAgg._avg.rating || 0,
          reviewCount: svcAgg._count,
        },
      });
    }

    // Kirim notifikasi ke pihak yang menerima ulasan
    await this.notifications.notify(
      revieweeId,
      'REVIEW',
      '⭐ Ulasan Baru',
      `${isBuyer ? 'Pembeli' : 'Penjual'} memberi Anda ulasan ${dto.rating} bintang untuk pesanan "${order.title}"`,
      { orderId: order.id, reviewId: created.id, rating: dto.rating },
      `/orders/${order.id}`,
    );

    // Re-fetch with reviewer/reviewee included so the response shows real identity
    const full = await this.prisma.review.findUnique({
      where: { id: created.id },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        reviewee: { select: { id: true, name: true, avatar: true } },
      },
    });
    return this.toDto(full || created);
  }

  async getBySeller(sellerId: string) {
    const reviews = await this.repo.findBySeller(sellerId);
    return reviews.map((r) => this.toDto(r));
  }

  async getByUser(userId: string) {
    const reviews = await this.repo.findByReviewee(userId);
    const mapped = reviews.map((r) => this.toDto(r));
    return {
      all: mapped,
      asSeller: mapped.filter((r) => r.reviewType === 'BUYER_TO_SELLER'),
      asBuyer: mapped.filter((r) => r.reviewType === 'SELLER_TO_BUYER'),
    };
  }

  async getByService(serviceId: string) {
    const reviews = await this.repo.findByService(serviceId);
    return reviews.map((r) => this.toDto(r));
  }

  async getByOrder(orderId: string) {
    const reviews = await this.repo.findByOrder(orderId);
    return reviews.map((r) => this.toDto(r));
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Review not found');
    if (r.reviewerId !== userId)
      throw new ForbiddenException('You can only edit your own reviews');

    const updated = await this.repo.update(id, dto);

    if (r.serviceId && dto.rating !== undefined) {
      const svcAgg = await this.prisma.review.aggregate({
        where: { serviceId: r.serviceId },
        _avg: { rating: true },
        _count: true,
      });
      await this.prisma.service.update({
        where: { id: r.serviceId },
        data: {
          rating: svcAgg._avg.rating || 0,
          reviewCount: svcAgg._count,
        },
      });

      const sellerAgg = await this.repo.aggregateSellerRating(r.revieweeId);
      await this.prisma.user.update({
        where: { id: r.revieweeId },
        data: {
          rating: sellerAgg._avg.rating || 0,
          reviewCount: sellerAgg._count,
        },
      });
    }

    return this.toDto(updated);
  }

  async delete(id: string, userId: string, role: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Review not found');
    if (r.reviewerId !== userId && role !== ROLE.ADMIN)
      throw new ForbiddenException('You can only delete your own reviews');

    const serviceId = r.serviceId;
    const revieweeId = r.revieweeId;

    await this.repo.delete(id);

    if (serviceId) {
      const svcAgg = await this.prisma.review.aggregate({
        where: { serviceId: serviceId },
        _avg: { rating: true },
        _count: true,
      });
      await this.prisma.service.update({
        where: { id: serviceId },
        data: {
          rating: svcAgg._avg.rating || 0,
          reviewCount: svcAgg._count,
        },
      });
    }

    if (revieweeId) {
      const sellerAgg = await this.repo.aggregateSellerRating(revieweeId);
      await this.prisma.user.update({
        where: { id: revieweeId },
        data: {
          rating: sellerAgg._avg.rating || 0,
          reviewCount: sellerAgg._count,
        },
      });
    }

    return { message: 'Review deleted' };
  }

  async reply(id: string, userId: string, dto: ReplyReviewDto) {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Review not found');
    if (r.revieweeId !== userId)
      throw new ForbiddenException('Only the reviewed seller can reply');

    const updated = await this.repo.update(id, {
      reply: dto.reply,
      replyAt: new Date(),
    });
    return this.toDto(updated);
  }

  async markHelpful(id: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new NotFoundException('Review not found');

    const updated = await this.repo.update(id, {
      helpfulCount: { increment: 1 },
    });
    return this.toDto(updated);
  }
}
