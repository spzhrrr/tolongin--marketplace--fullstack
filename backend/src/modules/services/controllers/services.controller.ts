import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ServicesService } from '../services/services.service';
import {
  CreateServiceDto,
  UpdateServiceDto,
  ServiceQueryDto,
} from '../dto/service.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';
import { VerifiedKtpGuard } from '../../../common/guards/verification.guards';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List active services with filter, search, pagination',
  })
  findAll(@Query() query: ServiceQueryDto) {
    return this.servicesService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured services' })
  featured() {
    return this.servicesService.featured();
  }

  @Public()
  @Get('recommended')
  @ApiOperation({ summary: 'Get top-rated recommended services' })
  recommended() {
    return this.servicesService.recommended();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get service detail with reviews' })
  findOne(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }

  @ApiBearerAuth('jwt')
  @UseGuards(VerifiedKtpGuard)
  @Post()
  @ApiOperation({
    summary: 'Create new service (requires KTP-verified user)',
  })
  create(@CurrentUser('id') sellerId: string, @Body() dto: CreateServiceDto) {
    return this.servicesService.create(sellerId, dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Put(':id')
  @ApiOperation({ summary: '[Seller/Admin] Update service (owner or admin)' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, userId, role, dto);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Delete(':id')
  @ApiOperation({ summary: '[Seller/Admin] Delete service' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.servicesService.delete(id, userId, role);
  }

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Post(':id/toggle-active')
  @ApiOperation({ summary: '[Seller] Activate / deactivate service' })
  toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.servicesService.toggleActive(id, userId);
  }
}
