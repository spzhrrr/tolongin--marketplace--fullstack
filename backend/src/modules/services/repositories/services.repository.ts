import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ServiceWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.ServiceOrderByWithRelationInput,
  ) {
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              avatar: true,
              verified: true, // ✅ TAMBAHKAN verified
            },
          },
          category: true,
          reviews: {
            // ✅ TAMBAHKAN reviews untuk hitung rating
            select: {
              rating: true,
            },
          },
        },
      }),
      this.prisma.service.count({ where }),
    ]);

    // ✅ Hitung rating real-time dari reviews
    const itemsWithRating = items.map((item) => {
      const reviews = item.reviews || [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;

      // Hapus reviews dari output (tidak perlu dikirim)
      const { reviews: _, ...rest } = item;

      return {
        ...rest,
        rating: avgRating,
        reviewCount: reviewCount,
      };
    });

    return { items: itemsWithRating, total };
  }

  async findById(id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            ktpVerified: true,
            rating: true,
            verified: true, // ✅ TAMBAHKAN verified
            bio: true,
            city: true,
          },
        },
        category: true,
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!service) return null;

    // ✅ Hitung rating real-time
    const reviews = service.reviews || [];
    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    // ✅ Format images dengan benar
    let images: string[] = [];
    try {
      images =
        typeof service.images === 'string'
          ? JSON.parse(service.images)
          : Array.isArray(service.images)
            ? service.images
            : [];
    } catch (e) {
      images = [];
    }

    // ✅ Format reviews untuk frontend
    const formattedReviews = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      buyerName: r.reviewer?.name || 'User',
      buyerAvatar: r.reviewer?.avatar || null,
    }));

    return {
      ...service,
      rating: avgRating,
      reviewCount: reviewCount,
      images: images,
      image: images[0] || null, // ✅ TAMBAHKAN image (first image)
      reviews: formattedReviews,
    };
  }

  create(data: Prisma.ServiceCreateInput) {
    return this.prisma.service.create({ data });
  }

  update(id: string, data: Prisma.ServiceUpdateInput) {
    return this.prisma.service.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.service.delete({ where: { id } });
  }

  async findFeatured() {
    const items = await this.prisma.service.findMany({
      where: { isActive: true, isFeatured: true },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        category: true,
        reviews: { select: { rating: true } },
      },
      take: 12,
    });

    // ✅ Hitung rating real-time
    return items.map((item) => {
      const reviews = item.reviews || [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
      const { reviews: _, ...rest } = item;
      return { ...rest, rating: avgRating, reviewCount: reviewCount };
    });
  }

  async findRecommended() {
    const items = await this.prisma.service.findMany({
      where: { isActive: true },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            verified: true,
          },
        },
        category: true,
        reviews: { select: { rating: true } },
      },
      orderBy: [{ rating: 'desc' }, { orderCount: 'desc' }],
      take: 12,
    });

    // ✅ Hitung rating real-time
    return items.map((item) => {
      const reviews = item.reviews || [];
      const reviewCount = reviews.length;
      const avgRating =
        reviewCount > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          : 0;
      const { reviews: _, ...rest } = item;
      return { ...rest, rating: avgRating, reviewCount: reviewCount };
    });
  }

  incrementView(id: string) {
    return this.prisma.service.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
