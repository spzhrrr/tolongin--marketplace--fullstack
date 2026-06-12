import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DisputesRepository } from '../repositories/disputes.repository';
import { OrdersRepository } from '../../orders/repositories/orders.repository';
import { CreateDisputeDto, ResolveDisputeDto } from '../dto/dispute.dto';
import {
  stringifyJsonField,
  parseJsonField,
} from '../../../common/utils/helpers';
import { DISPUTE_STATUS, ORDER_STATUS } from '../../../common/constants/enums';

@Injectable()
export class DisputesService {
  constructor(
    private readonly repo: DisputesRepository,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  private toDto(d: any) {
    return { ...d, evidence: parseJsonField<string[]>(d.evidence, []) };
  }

  async create(userId: string, dto: CreateDisputeDto) {
    const order = await this.ordersRepo.findById(dto.orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== userId && order.sellerId !== userId)
      throw new ForbiddenException();
    if (await this.repo.findByOrder(dto.orderId))
      throw new BadRequestException('Dispute already exists for this order');
    const dispute = await this.repo.create({
      order: { connect: { id: dto.orderId } },
      raiser: { connect: { id: userId } },
      reason: dto.reason,
      description: dto.description,
      evidence: stringifyJsonField(dto.evidence || []),
      status: DISPUTE_STATUS.PENDING,
    });
    // Move order to DISPUTED
    await this.ordersRepo.update(order.id, { status: ORDER_STATUS.DISPUTED });
    return this.toDto(dispute);
  }

  async findAll() {
    const items = await this.repo.findAll();
    return items.map((i) => this.toDto(i));
  }

  // Daftar sengketa milik user yang sedang login
  async findMine(userId: string) {
    const items = await this.repo.findByUser(userId);
    return items.map((i) => this.toDto(i));
  }

  async findById(id: string) {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException();
    return this.toDto(d);
  }

  async resolve(id: string, adminId: string, dto: ResolveDisputeDto) {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException();
    const updated = await this.repo.update(id, {
      status: DISPUTE_STATUS.RESOLVED,
      resolution: dto.resolution,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });
    return this.toDto(updated);
  }

  async reject(id: string, adminId: string) {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException();
    const updated = await this.repo.update(id, {
      status: DISPUTE_STATUS.REJECTED,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });
    return this.toDto(updated);
  }
}
