import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CategoriesRepository } from '../repositories/categories.repository';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { parseJsonField } from '../../../common/utils/helpers';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async findById(id: string) {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }

  async create(dto: CreateCategoryDto) {
    if (await this.repo.findBySlug(dto.slug))
      throw new ConflictException('Slug already exists');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    await this.repo.delete(id);
    return { message: 'Category deleted' };
  }

  async getServices(id: string) {
    await this.findById(id);
    const services = await this.repo.findServicesInCategory(id);
    return services.map((s) => ({
      ...s,
      images: parseJsonField<string[]>(s.images, []),
    }));
  }

  async getJobs(id: string) {
    await this.findById(id);
    const jobs = await this.repo.findJobsInCategory(id);
    return jobs.map((j) => ({
      ...j,
      skills: parseJsonField<string[]>(j.skills, []),
    }));
  }
}
