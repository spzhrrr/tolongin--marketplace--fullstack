import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { RejectSellerDto, UpdateSettingsDto } from '../dto/admin.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';

@ApiTags('Admin')
@ApiBearerAuth('jwt')
@Roles(ROLE.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard stats' })
  stats() {
    return this.adminService.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  users() {
    return this.adminService.users();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user detail' })
  userDetail(@Param('id') id: string) {
    return this.adminService.userDetail(id);
  }

  @Post('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend user' })
  suspend(@Param('id') id: string, @CurrentUser('id') admin: string) {
    return this.adminService.suspendUser(id, admin);
  }

  @Post('users/:id/activate')
  @ApiOperation({ summary: 'Activate user' })
  activate(@Param('id') id: string, @CurrentUser('id') admin: string) {
    return this.adminService.activateUser(id, admin);
  }

  @Get('sellers/pending')
  @ApiOperation({ summary: 'Pending seller verifications' })
  pendingSellers() {
    return this.adminService.pendingSellers();
  }

  @Post('sellers/:id/approve')
  @ApiOperation({ summary: 'Approve seller' })
  approveSeller(@Param('id') id: string, @CurrentUser('id') admin: string) {
    return this.adminService.approveSeller(id, admin);
  }

  @Post('sellers/:id/reject')
  @ApiOperation({ summary: 'Reject seller' })
  rejectSeller(
    @Param('id') id: string,
    @CurrentUser('id') admin: string,
    @Body() dto: RejectSellerDto,
  ) {
    return this.adminService.rejectSeller(id, admin, dto);
  }

  @Get('services')
  @ApiOperation({ summary: 'List all services' })
  services() {
    return this.adminService.services();
  }

  @Delete('services/:id')
  @ApiOperation({ summary: 'Delete service' })
  deleteService(@Param('id') id: string, @CurrentUser('id') admin: string) {
    return this.adminService.deleteService(id, admin);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all jobs' })
  jobs() {
    return this.adminService.jobs();
  }

  @Delete('jobs/:id')
  @ApiOperation({ summary: 'Delete job' })
  deleteJob(@Param('id') id: string, @CurrentUser('id') admin: string) {
    return this.adminService.deleteJob(id, admin);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  orders() {
    return this.adminService.orders();
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List all disputes' })
  disputes() {
    return this.adminService.disputes();
  }

  @Post('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve dispute' })
  resolveDispute(
    @Param('id') id: string,
    @CurrentUser('id') admin: string,
    @Body() body: { resolution: string },
  ) {
    return this.adminService.resolveDispute(id, admin, body.resolution);
  }

  @Get('activity-log')
  @ApiOperation({ summary: 'Activity log' })
  activity() {
    return this.adminService.activity();
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  settings() {
    return this.adminService.settings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser('id') admin: string,
  ) {
    return this.adminService.updateSettings(dto, admin);
  }

  //       ====== KYC MANAGEMENT       ======
  @Get('kyc')
  @ApiOperation({ summary: 'Get KYC submissions' })
  async getKycSubmissions(@Query('status') status: string) {
    return this.adminService.getKycSubmissions(status || 'pending');
  }

  @Post('kyc/:id/approve')
  @ApiOperation({ summary: 'Approve KYC' })
  async approveKyc(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.approveKyc(id, adminId);
  }

  @Post('kyc/:id/reject')
  @ApiOperation({ summary: 'Reject KYC with reason' })
  async rejectKyc(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.rejectKyc(id, adminId, body.reason);
  }
}
