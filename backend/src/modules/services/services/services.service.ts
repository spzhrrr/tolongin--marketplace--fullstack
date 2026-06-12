import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ServicesRepository } from '../repositories/services.repository';
import { CategoriesRepository } from '../../categories/repositories/categories.repository';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from '../dto/service.dto';
import {
  paginate,
  parseJsonField,
  stringifyJsonField,
  buildPageMeta,
} from '../../../common/utils/helpers';
import { Prisma } from '@prisma/client';
import { ROLE } from '../../../common/constants/enums';

@Injectable()
export class ServicesService {
  constructor(
    private readonly repo: ServicesRepository,
    private readonly categoriesRepo: CategoriesRepository,
  ) {}

  private toDto(s: any) {
    return { ...s, images: parseJsonField<string[]>(s.images, []) };
  }

  // Konversi parameter sortBy (termasuk alias frontend) menjadi orderBy Prisma
  private resolveSort(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.ServiceOrderByWithRelationInput {
    switch (sortBy) {
      case 'newest':
        return { createdAt: 'desc' };
      case 'price_asc':
        return { price: 'asc' };
      case 'price_desc':
        return { price: 'desc' };
      case 'rating_desc':
        return { rating: 'desc' };
      case 'price':
      case 'rating':
      case 'createdAt':
        return { [sortBy]: sortOrder || 'desc' } as any;
      default:
        return { createdAt: 'desc' };
    }
  }

  async findAll(query: ServiceQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const { skip, take } = paginate(page, limit);

    const where: Prisma.ServiceWhereInput = { isActive: true };
    if (query.q) where.title = { contains: query.q };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined)
        (where.price as any).gte = query.minPrice;
      if (query.maxPrice !== undefined)
        (where.price as any).lte = query.maxPrice;
    }
    // Filter rating minimum
    if (query.minRating !== undefined) {
      where.rating = { gte: query.minRating };
    }
    // Filter maksimum waktu pengerjaan (hari)
    if (query.maxDeliveryDays !== undefined) {
      where.deliveryTime = { lte: query.maxDeliveryDays };
    }

    // Dukung alias pengurutan dari frontend selain field mentah
    const orderBy = this.resolveSort(query.sortBy, query.sortOrder);
    const { items, total } = await this.repo.findMany(
      where,
      skip,
      take,
      orderBy,
    );
    return {
      data: items.map((i) => this.toDto(i)),
      meta: buildPageMeta(total, page, limit),
    };
  }

  async findById(id: string) {
    const s = await this.repo.findById(id);
    if (!s) throw new NotFoundException('Service not found');
    await this.repo.incrementView(id).catch(() => undefined);
    return this.toDto(s);
  }

  async create(sellerId: string, dto: CreateServiceDto) {
    const cat = await this.categoriesRepo.findById(dto.categoryId);
    if (!cat) throw new NotFoundException('Category not found');
    const created = await this.repo.create({
      seller: { connect: { id: sellerId } },
      category: { connect: { id: dto.categoryId } },
      title: dto.title,
      description: dto.description,
      price: dto.price,
      priceType: dto.priceType || 'FIXED',
      deliveryTime: dto.deliveryTime,
      revisionCount: dto.revisionCount ?? 1,
      images: stringifyJsonField(dto.images || []),
    });
    return this.toDto(created);
  }

  async update(
    id: string,
    userId: string,
    role: string,
    dto: UpdateServiceDto,
  ) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Service not found');
    if (existing.sellerId !== userId && role !== ROLE.ADMIN) {
      throw new ForbiddenException('You can only edit your own services');
    }
    const data: any = { ...dto };

    if (dto.images) {
      data.images = stringifyJsonField(dto.images);
    }

    if (dto.categoryId) {
      const cat = await this.categoriesRepo.findById(dto.categoryId);
      if (!cat) throw new NotFoundException('Category not found');
      data.category = { connect: { id: dto.categoryId } };
      delete data.categoryId;
    }

    const updated = await this.repo.update(id, data);
    return this.toDto(updated);
  }

  async delete(id: string, userId: string, role: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Service not found');
    if (existing.sellerId !== userId && role !== ROLE.ADMIN) {
      throw new ForbiddenException('You can only delete your own services');
    }
    await this.repo.delete(id);
    return { message: 'Service deleted' };
  }

  async toggleActive(id: string, userId: string) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Service not found');
    if (existing.sellerId !== userId) throw new ForbiddenException();
    const updated = await this.repo.update(id, {
      isActive: !existing.isActive,
    });
    return { isActive: updated.isActive };
  }

  async featured() {
    const items = await this.repo.findFeatured();
    return items.map((i) => this.toDto(i));
  }

  async recommended() {
    const items = await this.repo.findRecommended();
    return items.map((i) => this.toDto(i));
  }
}
