import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        bio: true,
        city: true,
        skills: true,
        rating: true,
        reviewCount: true,
        totalOrders: true,
        completedOrders: true,
        verified: true,
        emailVerified: true,
        phoneVerified: true,
        ktpVerified: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findServices(sellerId: string) {
    const services = await this.prisma.service.findMany({
      where: { sellerId, isActive: true },
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, avatar: true, verified: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Hitung rating real-time untuk setiap service
    return services.map((service) => {
      const reviews = service.reviews || [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

      // Parse images - FIX: convert string to array properly
      let imagesArray: string[] = [];
      try {
        if (typeof service.images === 'string') {
          imagesArray = JSON.parse(service.images);
        } else if (Array.isArray(service.images)) {
          imagesArray = service.images;
        } else {
          imagesArray = [];
        }
      } catch (e) {
        imagesArray = [];
      }

      const { reviews: _, ...rest } = service;
      return {
        ...rest,
        rating: avgRating,
        reviewCount: reviewCount,
        images: imagesArray,
        image: imagesArray[0] || null,
      };
    });
  }

  async findReviews(revieweeId: string) {
    return this.prisma.review.findMany({
      where: { revieweeId },
      include: {
        reviewer: {
          select: { id: true, name: true, avatar: true },
        },
        order: {
          select: { service: { select: { title: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findJobsByUserId(userId: string) {
    return this.prisma.job.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        applications: {
          select: { id: true, status: true },
        },
      },
    });
  }

  // ---- PORTOFOLIO ----
  async findPortfolio(userId: string) {
    return this.prisma.portfolio.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPortfolio(data: Prisma.PortfolioCreateInput) {
    return this.prisma.portfolio.create({ data });
  }

  async findPortfolioById(id: string) {
    return this.prisma.portfolio.findUnique({ where: { id } });
  }

  async deletePortfolio(id: string) {
    return this.prisma.portfolio.delete({ where: { id } });
  }

  // ---- STATISTIK USER ----
  // Hitung total pendapatan & jumlah order yang selesai sebagai penjual
  async aggregateSellerStats(userId: string) {
    return this.prisma.order.aggregate({
      where: { sellerId: userId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });
  }

  async countOrders(userId: string) {
    return this.prisma.order.count({ where: { sellerId: userId } });
  }

  async aggregateRating(userId: string) {
    return this.prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    });
  }

  async findUserWithAllData(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        bio: true,
        city: true,
        skills: true,
        rating: true,
        reviewCount: true,
        totalOrders: true,
        completedOrders: true,
        verified: true,
        emailVerified: true,
        phoneVerified: true,
        ktpVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    // Get services
    const services = await this.findServices(id);

    // Get jobs
    const jobs = await this.findJobsByUserId(id);

    // Get reviews
    const reviews = await this.findReviews(id);

    return {
      ...user,
      services,
      jobs,
      reviews,
    };
  }
}
