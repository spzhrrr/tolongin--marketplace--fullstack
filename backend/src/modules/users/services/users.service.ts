import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getPublicProfile(id: string, viewerId?: string) {
    const u = await this.repo.findById(id);
    if (!u) throw new NotFoundException('User not found');

    let skillsArray: string[] = [];
    try {
      if (typeof u.skills === 'string') {
        skillsArray = JSON.parse(u.skills);
      } else if (Array.isArray(u.skills)) {
        skillsArray = u.skills;
      }
    } catch (e) {
      skillsArray = [];
    }

    const { password, emailOtpHash, phoneOtpHash, ...rest } = u as any;
    const isOwner = viewerId === id;

    return {
      ...rest,
      skills: skillsArray,
      // ✅ HANYA PEMILIK YANG BISA LIHAT INFORMASI PRIBADI
      email: isOwner ? rest.email : undefined,
      phone: isOwner ? rest.phone : undefined,
      balance: isOwner ? rest.balance : undefined,
    };
  }

  async getServices(id: string) {
    const services = await this.repo.findServices(id);
    return services.map((s) => {
      let imagesArray: string[] = [];
      try {
        if (typeof s.images === 'string') {
          imagesArray = JSON.parse(s.images);
        } else if (Array.isArray(s.images)) {
          imagesArray = s.images;
        }
      } catch (e) {
        imagesArray = [];
      }

      return {
        ...s,
        images: imagesArray,
        image: imagesArray[0] || null,
      };
    });
  }

  async getReviews(id: string) {
    const reviews = await this.repo.findReviews(id);
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      reviews: reviews.map((r) => {
        let imagesArray: string[] = [];
        try {
          if (typeof r.images === 'string') {
            imagesArray = JSON.parse(r.images);
          } else if (Array.isArray(r.images)) {
            imagesArray = r.images;
          }
        } catch (e) {
          imagesArray = [];
        }

        return {
          ...r,
          images: imagesArray,
          reviewer: {
            id: r.reviewer?.id,
            name: r.reviewer?.name,
            avatar: r.reviewer?.avatar,
          },
        };
      }),
      rating: avgRating,
      reviewCount: reviews.length,
    };
  }

  async getUserJobs(userId: string) {
    return this.repo.findJobsByUserId(userId);
  }

  async getWorkHistory(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { sellerId: userId },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        service: { select: { id: true, title: true, category: true } },
        application: {
          include: {
            job: {
              include: {
                category: true,
                buyer: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
        reviews: {
          where: { revieweeId: userId },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      type: o.serviceId ? 'SERVICE_ORDER' : 'JOB_APPLICATION',
      label: o.serviceId ? 'Jasa Ditawarkan' : 'Job Cari Kerja',
      title: o.service?.title || o.application?.job?.title || o.title,
      status: o.status,
      amount: o.amount,
      completedAt: o.completedAt,
      createdAt: o.createdAt,
      category: o.service?.category || o.application?.job?.category || null,
      client: o.buyer,
      review: o.reviews[0] || null,
    }));
  }

  async getPortfolio(userId: string) {
    return this.repo.findPortfolio(userId);
  }

  async addPortfolio(
    userId: string,
    dto: {
      title: string;
      description?: string;
      imageUrl?: string;
      projectUrl?: string;
    },
  ) {
    return this.repo.createPortfolio({
      user: { connect: { id: userId } },
      title: dto.title,
      description: dto.description,
      imageUrl: dto.imageUrl,
      projectUrl: dto.projectUrl,
    });
  }

  async deletePortfolio(id: string, userId: string) {
    const item = await this.repo.findPortfolioById(id);
    if (!item) throw new NotFoundException('Portofolio tidak ditemukan');
    if (item.userId !== userId)
      throw new ForbiddenException(
        'Anda tidak berhak menghapus portofolio ini',
      );
    await this.repo.deletePortfolio(id);
    return { message: 'Portofolio dihapus' };
  }

  async getStats(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const earnings = await this.repo.aggregateSellerStats(userId);
    const totalOrders = await this.repo.countOrders(userId);
    const ratingAgg = await this.repo.aggregateRating(userId);

    return {
      totalEarnings: earnings._sum.amount || 0,
      completedOrders: earnings._count || 0,
      totalOrders,
      averageRating: ratingAgg._avg.rating || 0,
      reviewCount: ratingAgg._count || 0,
    };
  }

  async getCompleteProfile(id: string) {
    const userData = await this.repo.findUserWithAllData(id);
    if (!userData) throw new NotFoundException('User not found');

    const reviews = userData.reviews || [];
    const totalRating = reviews.reduce(
      (sum: number, r: any) => sum + r.rating,
      0,
    );
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return {
      ...userData,
      rating: avgRating,
      reviewCount: reviews.length,
      services: userData.services || [],
      jobs: userData.jobs || [],
      reviews: reviews.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        reviewer: r.reviewer,
        serviceTitle: r.order?.service?.title || null,
      })),
    };
  }
}
