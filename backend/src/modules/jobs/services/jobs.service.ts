import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JobsRepository } from '../repositories/jobs.repository';
import { CreateJobDto, UpdateJobDto, JobQueryDto } from '../dto/job.dto';
import {
  paginate,
  parseJsonField,
  stringifyJsonField,
  buildPageMeta,
} from '../../../common/utils/helpers';
import { Prisma } from '@prisma/client';
import { ROLE, JOB_STATUS } from '../../../common/constants/enums';

@Injectable()
export class JobsService {
  constructor(private readonly repo: JobsRepository) {}

  private toDto(j: any) {
    return { ...j, skills: parseJsonField<string[]>(j.skills, []) };
  }

  async findAll(query: JobQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { skip, take } = paginate(page, limit);

    const where: Prisma.JobWhereInput = {};
    if (query.q) where.title = { contains: query.q };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.buyerId) where.buyerId = query.buyerId;
    if (query.status) where.status = (query.status as string).toUpperCase();
    if (query.urgency) where.urgency = query.urgency.toUpperCase();
    if (query.location) where.location = { contains: query.location };
    // Filter rentang budget
    if (query.minBudget !== undefined || query.maxBudget !== undefined) {
      where.budget = {};
      if (query.minBudget !== undefined)
        (where.budget as any).gte = query.minBudget;
      if (query.maxBudget !== undefined)
        (where.budget as any).lte = query.maxBudget;
    }

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

  // Konversi parameter sortBy (termasuk alias) menjadi orderBy Prisma
  private resolveSort(
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
  ): Prisma.JobOrderByWithRelationInput {
    switch (sortBy) {
      case 'newest':
        return { createdAt: 'desc' };
      case 'budget_asc':
        return { budget: 'asc' };
      case 'budget_desc':
        return { budget: 'desc' };
      case 'budget':
      case 'createdAt':
        return { [sortBy]: sortOrder || 'desc' } as any;
      default:
        return { createdAt: 'desc' };
    }
  }

  async findById(id: string) {
    const j = await this.repo.findById(id);
    if (!j) throw new NotFoundException('Job not found');
    return this.toDto(j);
  }

  async create(buyerId: string, dto: CreateJobDto) {
    const created = await this.repo.create({
      buyer: { connect: { id: buyerId } },
      category: { connect: { id: dto.categoryId } },
      title: dto.title,
      description: dto.description,
      budget: dto.budget,
      budgetType: dto.budgetType || 'FIXED',
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      location: dto.location,
      isOnline: dto.isOnline ?? false,
      skills: stringifyJsonField(dto.skills || []),
      urgency: dto.urgency ? dto.urgency.toUpperCase() : 'NORMAL',
      status: JOB_STATUS.OPEN,
    });
    return this.toDto(created);
  }

  async update(id: string, userId: string, role: string, dto: UpdateJobDto) {
    const j = await this.repo.findById(id);
    if (!j) throw new NotFoundException('Job not found');
    if (j.buyerId !== userId && role !== ROLE.ADMIN)
      throw new ForbiddenException();

    const data: any = { ...dto };

    // Handle skills separately
    if (dto.skills) {
      data.skills = stringifyJsonField(dto.skills);
    }

    // Normalisasi urgency ke uppercase
    if (dto.urgency) {
      data.urgency = dto.urgency.toUpperCase();
    }

    // Handle deadline separately
    if (dto.deadline) {
      data.deadline = new Date(dto.deadline);
    }

    // Handle category relation
    if (dto.categoryId) {
      data.category = { connect: { id: dto.categoryId } };
      delete data.categoryId;
    }

    const updated = await this.repo.update(id, data);
    return this.toDto(updated);
  }

  async delete(id: string, userId: string, role: string) {
    const j = await this.repo.findById(id);
    if (!j) throw new NotFoundException('Job not found');
    if (j.buyerId !== userId && role !== ROLE.ADMIN)
      throw new ForbiddenException();
    await this.repo.delete(id);
    return { message: 'Job deleted' };
  }

  async close(id: string, userId: string) {
    const j = await this.repo.findById(id);
    if (!j) throw new NotFoundException('Job not found');
    if (j.buyerId !== userId) throw new ForbiddenException();
    const updated = await this.repo.update(id, { status: JOB_STATUS.CLOSED });
    return this.toDto(updated);
  }
}
