import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.JobWhereInput,
    skip: number,
    take: number,
    orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' },
  ) {
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          buyer: { select: { id: true, name: true, avatar: true } },
          category: true,
        },
      }),
      this.prisma.job.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string) {
    return this.prisma.job.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, avatar: true } },
        category: true,
        applications: {
          include: {
            seller: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });
  }

  create(data: Prisma.JobCreateInput) {
    return this.prisma.job.create({ data });
  }

  update(id: string, data: Prisma.JobUpdateInput) {
    return this.prisma.job.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.job.delete({ where: { id } });
  }

  incrementApplicationsCount(id: string) {
    return this.prisma.job.update({
      where: { id },
      data: { applicationsCount: { increment: 1 } },
    });
  }
}
