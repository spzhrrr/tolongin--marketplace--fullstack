import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DisputesService } from '../services/disputes.service';
import { CreateDisputeDto } from '../dto/dispute.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';

@ApiTags('Disputes')
@ApiBearerAuth('jwt')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Raise a dispute on an order' })
  create(@CurrentUser('id') uid: string, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(uid, dto);
  }

  // Daftar sengketa milik user yang sedang login (untuk halaman status sengketa)
  @Get()
  @ApiOperation({ summary: 'Daftar sengketa milik saya' })
  myDisputes(@CurrentUser('id') uid: string) {
    return this.disputesService.findMine(uid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute detail' })
  detail(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  // Tolak sengketa (hanya admin)
  @Post(':id/reject')
  @ApiOperation({ summary: '[Admin] Tolak sengketa' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('role') role: string,
  ) {
    if (role !== ROLE.ADMIN) throw new ForbiddenException();
    return this.disputesService.reject(id, adminId);
  }
}
