import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  create(data: Prisma.CategoryCreateInput) {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput) {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }

  findServicesInCategory(id: string) {
    return this.prisma.service.findMany({
      where: { categoryId: id, isActive: true },
      include: { seller: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findJobsInCategory(id: string) {
    return this.prisma.job.findMany({
      where: { categoryId: id, status: 'OPEN' },
      include: { buyer: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
