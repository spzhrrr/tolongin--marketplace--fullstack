import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreatePortfolioDto } from '../dto/portfolio.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Public()
  @Get(':id/services')
  @ApiOperation({ summary: 'Get user services' })
  async getUserServices(@Param('id') id: string) {
    return this.usersService.getServices(id);
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get user reviews' })
  async getUserReviews(@Param('id') id: string) {
    return this.usersService.getReviews(id);
  }

  @Public()
  @Get(':id/jobs')
  @ApiOperation({ summary: 'Get user jobs' })
  async getUserJobs(@Param('id') id: string) {
    return this.usersService.getUserJobs(id);
  }

  @Public()
  @Get(':id/work-history')
  @ApiOperation({ summary: 'Get completed and active work history as seller' })
  async getWorkHistory(@Param('id') id: string) {
    return this.usersService.getWorkHistory(id);
  }

  @Public()
  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Ambil daftar portofolio user' })
  async getPortfolio(@Param('id') id: string) {
    return this.usersService.getPortfolio(id);
  }

  @ApiBearerAuth('jwt')
  @Post('portfolio')
  @ApiOperation({ summary: 'Tambah item portofolio milik sendiri' })
  async addPortfolio(
    @CurrentUser('id') uid: string,
    @Body() dto: CreatePortfolioDto,
  ) {
    return this.usersService.addPortfolio(uid, dto);
  }

  @ApiBearerAuth('jwt')
  @Delete('portfolio/:portfolioId')
  @ApiOperation({ summary: 'Hapus item portofolio milik sendiri' })
  async deletePortfolio(
    @Param('portfolioId') portfolioId: string,
    @CurrentUser('id') uid: string,
  ) {
    return this.usersService.deletePortfolio(portfolioId, uid);
  }

  @Public()
  @Get(':id/stats')
  @ApiOperation({
    summary: 'Statistik user (total pendapatan, rating, jumlah order)',
  })
  async getStats(@Param('id') id: string) {
    return this.usersService.getStats(id);
  }

  @Public()
  @Get(':id/complete')
  @ApiOperation({
    summary: 'Get complete user profile with services, jobs, reviews',
  })
  async getCompleteProfile(@Param('id') id: string) {
    return this.usersService.getCompleteProfile(id);
  }
}
