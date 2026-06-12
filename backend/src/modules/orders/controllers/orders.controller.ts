import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from '../services/orders.service';
import {
  CancelOrderDto,
  CreateOrderFromServiceDto,
  RevisionRequestDto,
  SubmitWorkDto,
  OpenDisputeDto,
} from '../dto/order.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ROLE,
  ORDER_STATUS,
  OrderStatus,
} from '../../../common/constants/enums';

@ApiTags('Orders')
@ApiBearerAuth('jwt')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(ROLE.USER)
  @Post('service/:serviceId')
  @ApiOperation({ summary: '[Buyer] Create order from a service' })
  fromService(
    @Param('serviceId') serviceId: string,
    @CurrentUser('id') buyerId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateOrderFromServiceDto,
  ) {
    if (userRole !== ROLE.USER) {
      throw new ForbiddenException(
        'Hanya akun BUYER yang dapat membuat pesanan',
      );
    }
    return this.ordersService.createFromService(buyerId, serviceId, dto);
  }

  @Roles(ROLE.USER)
  @Post('application/:applicationId')
  @ApiOperation({
    summary: '[Buyer] Create order from an accepted application',
  })
  fromApplication(
    @Param('applicationId') applicationId: string,
    @CurrentUser('id') buyerId: string,
    @CurrentUser('role') userRole: string,
  ) {
    if (userRole !== ROLE.USER) {
      throw new ForbiddenException(
        'Hanya akun BUYER yang dapat membuat pesanan',
      );
    }
    return this.ordersService.createFromApplication(buyerId, applicationId);
  }

  @Get()
  @ApiOperation({
    summary:
      'List my orders. Optional ?role=BUYER|SELLER|all (defaults to all when omitted; admin sees nothing here).',
  })
  async listMine(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('role') filter?: string,
  ) {
    const f = (filter || 'all').toUpperCase();
    if (f === 'BUYER') return this.ordersService.listByBuyer(userId);
    if (f === 'SELLER') return this.ordersService.listBySeller(userId);
    // all → merge
    const [buyer, seller] = await Promise.all([
      this.ordersService.listByBuyer(userId),
      this.ordersService.listBySeller(userId),
    ]);
    const map = new Map<string, any>();
    [...buyer, ...seller].forEach((o) => map.set(o.id, o));
    return [...map.values()].sort(
      (a, b) =>
        new Date(b.createdAt as any).getTime() -
        new Date(a.createdAt as any).getTime(),
    );
  }

  @Roles(ROLE.USER)
  @Get('buyer')
  @ApiOperation({ summary: '[Buyer] My orders' })
  buyerOrders(@CurrentUser('id') buyerId: string) {
    return this.ordersService.listByBuyer(buyerId);
  }

  @Roles(ROLE.USER)
  @Get('seller')
  @ApiOperation({ summary: '[Seller] Orders received' })
  sellerOrders(@CurrentUser('id') sellerId: string) {
    return this.ordersService.listBySeller(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail' })
  detail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.getById(id, userId, role);
  }

  @Roles(ROLE.USER)
  @Patch(':id/accept')
  @ApiOperation({ summary: '[Seller] Accept order' })
  accept(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.accept(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Patch(':id/start')
  @ApiOperation({ summary: '[Seller] Start working on order' })
  start(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.start(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Patch(':id/submit-review')
  @ApiOperation({ summary: '[Seller] Submit work for buyer review' })
  submitReview(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.submitReview(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Post(':id/work-submission')
  @ApiOperation({ summary: '[Seller] Submit work proof for buyer approval' })
  submitWork(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: SubmitWorkDto,
  ) {
    return this.ordersService.submitWork(id, uid, role, dto);
  }

  @Roles(ROLE.USER)
  @Post(':id/work-revision')
  @ApiOperation({
    summary: '[Buyer] Reject submitted work and request revision',
  })
  rejectWork(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: RevisionRequestDto,
  ) {
    return this.ordersService.rejectWork(id, uid, role, dto);
  }

  // ====== Alias endpoint sesuai spesifikasi fitur work submission ======

  @Roles(ROLE.USER)
  @Post(':id/submit-work')
  @ApiOperation({
    summary: '[Seller] Kumpulkan bukti hasil kerja (note + file URLs)',
  })
  submitWorkAlias(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: SubmitWorkDto,
  ) {
    return this.ordersService.submitWork(id, uid, role, dto);
  }

  @Roles(ROLE.USER)
  @Post(':id/approve-work')
  @ApiOperation({ summary: '[Buyer] Setujui hasil kerja (order selesai)' })
  approveWork(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.approveWork(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Post(':id/request-revision')
  @ApiOperation({ summary: '[Buyer] Minta revisi hasil kerja dengan alasan' })
  requestRevisionAlias(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: RevisionRequestDto,
  ) {
    return this.ordersService.rejectWork(id, uid, role, dto);
  }

  @Roles(ROLE.USER)
  @Post(':id/dispute')
  @ApiOperation({ summary: '[Buyer/Seller] Buka sengketa pada order' })
  openDispute(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.ordersService.openDispute(id, uid, role, dto);
  }

  @Roles(ROLE.USER)
  @Post(':id/revision')
  @ApiOperation({ summary: '[Buyer] Request revision' })
  revision(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: RevisionRequestDto,
  ) {
    return this.ordersService.requestRevision(id, uid, role, dto);
  }

  @Roles(ROLE.USER)
  @Patch(':id/complete')
  @ApiOperation({ summary: '[Buyer] Complete order' })
  complete(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.complete(id, uid, role);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (subject to state machine)' })
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(id, uid, role, dto);
  }

  /**
   * Unified status-transition endpoint.
   * Body: { status: 'ACCEPTED'|'IN_PROGRESS'|'IN_REVIEW'|'COMPLETED'|'CANCELLED'|'REVISION_REQUESTED', reason?: string }
   * Convenience for the frontend.
   */
  @Post(':id/status')
  @ApiOperation({ summary: 'Generic state transition (frontend-friendly)' })
  async setStatus(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
    @Body() body: { status?: string; reason?: string },
  ) {
    if (!body?.status) throw new BadRequestException('status required');
    const next = String(body.status).toUpperCase() as OrderStatus;
    switch (next) {
      case ORDER_STATUS.ACCEPTED:
        return this.ordersService.accept(id, uid, role);
      case ORDER_STATUS.IN_PROGRESS:
        return this.ordersService.start(id, uid, role);
      case ORDER_STATUS.IN_REVIEW:
        return this.ordersService.submitReview(id, uid, role);
      case ORDER_STATUS.REVISION_REQUESTED:
        return this.ordersService.requestRevision(id, uid, role, {
          reason: body.reason || 'Mohon revisi',
        } as any);
      case ORDER_STATUS.COMPLETED:
        return this.ordersService.complete(id, uid, role);
      case ORDER_STATUS.CANCELLED:
        return this.ordersService.cancel(id, uid, role, {
          reason: body.reason,
        } as any);
      default:
        throw new BadRequestException(`Unsupported status: ${next}`);
    }
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get status timeline' })
  timeline(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.getTimeline(id, uid, role);
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get order invoice' })
  invoice(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.getInvoice(id, uid, role);
  }

  // ========== DEMO ENDPOINTS (seperti Verifikasi) ==========

  @Roles(ROLE.USER)
  @Post(':id/demo-accept')
  @ApiOperation({ summary: '[Demo] Langsung terima order tanpa verifikasi' })
  async demoAccept(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.accept(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Post(':id/demo-submit-work')
  @ApiOperation({ summary: '[Demo] Langsung submit bukti kerja tanpa upload' })
  async demoSubmitWork(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.submitWork(id, uid, role, {
      note: '✅ [DEMO] Hasil kerja diserahkan secara instan. File demo terlampir.',
      attachments: ['https://demo.tolongin.com/sample-work.pdf'],
    });
  }

  @Roles(ROLE.USER)
  @Post(':id/demo-approve')
  @ApiOperation({ summary: '[Demo] Langsung approve kerja dan rilis dana' })
  async demoApprove(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.approveWork(id, uid, role);
  }

  @Roles(ROLE.USER)
  @Post(':id/demo-complete')
  @ApiOperation({ summary: '[Demo] Langsung selesaikan order' })
  async demoComplete(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.ordersService.complete(id, uid, role);
  }
}
