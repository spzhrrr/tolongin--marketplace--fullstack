import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApplicationsRepository } from '../repositories/applications.repository';
import { JobsRepository } from '../../jobs/repositories/jobs.repository';
import { NotificationsService } from '../../notifications/services/notifications.service';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  RejectApplicationDto,
} from '../dto/application.dto';
import {
  parseJsonField,
  stringifyJsonField,
} from '../../../common/utils/helpers';
import {
  APPLICATION_STATUS,
  JOB_STATUS,
} from '../../../common/constants/enums';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly repo: ApplicationsRepository,
    private readonly jobsRepo: JobsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toDto(a: any) {
    return { ...a, portfolioIds: parseJsonField<string[]>(a.portfolioIds, []) };
  }

  private formatCurrency(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  private async getSellerName(sellerId: string): Promise<string> {
    const user = await this.repo.getUserById(sellerId);
    return user?.name || sellerId;
  }

  async apply(sellerId: string, dto: CreateApplicationDto) {
    const job = await this.jobsRepo.findById(dto.jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== JOB_STATUS.OPEN)
      throw new BadRequestException('Job is not open for applications');
    if (job.buyerId === sellerId)
      throw new BadRequestException('Tidak bisa melamar proyek Anda sendiri');

    const MIN_PCT = 0.5;
    const MAX_PCT = 1.5;
    const minPrice = Math.round(job.budget * MIN_PCT);
    const maxPrice = Math.round(job.budget * MAX_PCT);

    if (dto.proposedPrice < minPrice || dto.proposedPrice > maxPrice) {
      throw new BadRequestException(
        `Harga tawaran harus antara ${this.formatCurrency(minPrice)} dan ${this.formatCurrency(maxPrice)} (50%-150% dari budget proyek)`,
      );
    }
    if (dto.proposedDuration < 1 || dto.proposedDuration > 30) {
      throw new BadRequestException('Durasi pengerjaan harus 1-30 hari');
    }
    if (!dto.coverLetter || dto.coverLetter.trim().length < 20) {
      throw new BadRequestException('Surat lamaran minimal 20 karakter');
    }

    const existing = await this.repo.findByJobAndSeller(dto.jobId, sellerId);
    if (existing) throw new ConflictException('Anda sudah melamar proyek ini');

    const created = await this.repo.create({
      job: { connect: { id: dto.jobId } },
      seller: { connect: { id: sellerId } },
      coverLetter: dto.coverLetter,
      proposedPrice: dto.proposedPrice,
      proposedDuration: dto.proposedDuration,
      portfolioIds: stringifyJsonField(dto.portfolioIds || []),
      status: APPLICATION_STATUS.PENDING,
    });

    await this.jobsRepo.incrementApplicationsCount(dto.jobId);

    const sellerName = await this.getSellerName(sellerId);
    await this.notificationsService.notify(
      job.buyerId,
      'APPLICATION',
      '📝 Lamaran Baru',
      `${sellerName} melamar pekerjaan "${job.title}" dengan tawaran ${this.formatCurrency(dto.proposedPrice)} (${dto.proposedDuration} hari).`,
      { applicationId: created.id, jobId: job.id, sellerId },
      `/jobs/${job.id}?tab=applications`,
    );

    return this.toDto(created);
  }

  async getMySellerApplications(sellerId: string) {
    const items = await this.repo.findBySeller(sellerId);
    return items.map((i) => this.toDto(i));
  }

  async getJobApplications(jobId: string, buyerId: string) {
    const job = await this.jobsRepo.findById(jobId);
    if (!job) throw new NotFoundException('Job not found');
    if (job.buyerId !== buyerId)
      throw new ForbiddenException(
        'You are not authorized to view these applications',
      );
    const items = await this.repo.findByJob(jobId);
    return items.map((i) => this.toDto(i));
  }

  async update(id: string, sellerId: string, dto: UpdateApplicationDto) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Application not found');
    if (a.sellerId !== sellerId)
      throw new ForbiddenException(
        'You are not authorized to update this application',
      );
    if (a.status !== APPLICATION_STATUS.PENDING)
      throw new BadRequestException('Cannot edit non-pending application');

    const updated = await this.repo.update(id, dto);
    return this.toDto(updated);
  }

  async withdraw(id: string, sellerId: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Application not found');
    if (a.sellerId !== sellerId)
      throw new ForbiddenException(
        'You are not authorized to withdraw this application',
      );

    const updated = await this.repo.update(id, {
      status: APPLICATION_STATUS.WITHDRAWN,
    });

    await this.notificationsService.notify(
      a.job.buyerId,
      'APPLICATION',
      'Lamaran Ditarik',
      `Pelamar telah menarik lamarannya untuk pekerjaan "${a.job.title}"`,
      { applicationId: id, jobId: a.jobId, sellerId },
      `/jobs/${a.jobId}?tab=applications`,
    );

    return this.toDto(updated);
  }

  async accept(id: string, buyerId: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Application not found');
    if (a.job.buyerId !== buyerId)
      throw new ForbiddenException(
        'You are not authorized to accept this application',
      );
    if (a.status !== APPLICATION_STATUS.PENDING)
      throw new BadRequestException(
        'This application has already been decided',
      );

    const updated = await this.repo.update(id, {
      status: APPLICATION_STATUS.ACCEPTED,
      reviewedAt: new Date(),
    });

    // ✅ PERBAIKAN: Redirect ke halaman JOB (bukan orders)
    await this.notificationsService.notify(
      a.sellerId,
      'APPLICATION',
      '🎉 Lamaran Diterima!',
      `Lamaran Anda untuk "${a.job.title}" telah diterima. Klik untuk melihat detail pekerjaan.`,
      { applicationId: id, jobId: a.jobId },
      `/jobs/${a.jobId}`, // ✅ Redirect ke halaman job
    );

    return this.toDto(updated);
  }

  async reject(id: string, buyerId: string, dto: RejectApplicationDto) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Application not found');
    if (a.job.buyerId !== buyerId)
      throw new ForbiddenException(
        'You are not authorized to reject this application',
      );
    if (a.status !== APPLICATION_STATUS.PENDING)
      throw new BadRequestException(
        'This application has already been decided',
      );

    const updated = await this.repo.update(id, {
      status: APPLICATION_STATUS.REJECTED,
      rejectionReason: dto.reason,
      reviewedAt: new Date(),
    });

    const reasonText = dto.reason ? ` Alasan: ${dto.reason}` : '';
    await this.notificationsService.notify(
      a.sellerId,
      'APPLICATION',
      'Aplikasi Ditolak',
      `${a.job.title} - Aplikasi Anda ditolak.${reasonText}`,
      { applicationId: id, jobId: a.jobId, reason: dto.reason },
      `/jobs/${a.jobId}?tab=applications`,
    );

    return this.toDto(updated);
  }

  async findById(id: string) {
    const application = await this.repo.findById(id);
    if (!application) throw new NotFoundException('Application not found');
    return this.toDto(application);
  }
}
