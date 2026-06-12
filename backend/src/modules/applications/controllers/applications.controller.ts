import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApplicationsService } from '../services/applications.service';
import {
  CreateApplicationDto,
  UpdateApplicationDto,
  RejectApplicationDto,
} from '../dto/application.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';
import { VerifiedContactGuard } from '../../../common/guards/verification.guards';

@ApiTags('Applications')
@ApiBearerAuth('jwt')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @UseGuards(VerifiedContactGuard)
  @Post()
  @ApiOperation({
    summary: 'Apply to a job (requires email+phone verified)',
  })
  apply(
    @CurrentUser('id') sellerId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.apply(sellerId, dto);
  }

  @Roles(ROLE.USER)
  @Get('seller')
  @ApiOperation({ summary: '[Seller] My applications' })
  mySeller(@CurrentUser('id') sellerId: string) {
    return this.applicationsService.getMySellerApplications(sellerId);
  }

  @Roles(ROLE.USER)
  @Get('job/:jobId')
  @ApiOperation({ summary: '[Buyer] Applications received for a job' })
  forJob(@Param('jobId') jobId: string, @CurrentUser('id') buyerId: string) {
    return this.applicationsService.getJobApplications(jobId, buyerId);
  }

  @Roles(ROLE.USER)
  @Put(':id')
  @ApiOperation({ summary: '[Seller] Update my pending application' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.applicationsService.update(id, sellerId, dto);
  }

  @Roles(ROLE.USER)
  @Delete(':id')
  @ApiOperation({ summary: '[Seller] Withdraw application' })
  withdraw(@Param('id') id: string, @CurrentUser('id') sellerId: string) {
    return this.applicationsService.withdraw(id, sellerId);
  }

  @Roles(ROLE.USER)
  @Post(':id/accept')
  @ApiOperation({ summary: '[Buyer] Accept application' })
  accept(@Param('id') id: string, @CurrentUser('id') buyerId: string) {
    return this.applicationsService.accept(id, buyerId);
  }

  @Roles(ROLE.USER)
  @Post(':id/reject')
  @ApiOperation({ summary: '[Buyer] Reject application' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') buyerId: string,
    @Body() dto: RejectApplicationDto,
  ) {
    return this.applicationsService.reject(id, buyerId, dto);
  }

  @Roles(ROLE.USER)
  @Post(':id/demo-accept')
  @ApiOperation({ summary: '[Demo] Langsung terima lamaran' })
  async demoAccept(
    @Param('id') id: string,
    @CurrentUser('id') buyerId: string,
  ) {
    return this.applicationsService.accept(id, buyerId);
  }
}
