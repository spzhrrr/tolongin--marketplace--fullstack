import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from '../services/reviews.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReplyReviewDto,
} from '../dto/review.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth('jwt')
  @Post()
  @ApiOperation({ summary: 'Create review for completed order' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(userId, dto);
  }

  @Public()
  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get reviews for a seller' })
  bySeller(@Param('sellerId') sellerId: string) {
    return this.reviewsService.getBySeller(sellerId);
  }

  @Public()
  @Get('service/:serviceId')
  @ApiOperation({ summary: 'Get reviews for a service' })
  byService(@Param('serviceId') serviceId: string) {
    return this.reviewsService.getByService(serviceId);
  }

  @Public()
  @Get('order/:orderId')
  @ApiOperation({ summary: 'Ambil semua ulasan pada sebuah order' })
  byOrder(@Param('orderId') orderId: string) {
    return this.reviewsService.getByOrder(orderId);
  }

  @Public()
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Ambil ulasan seorang user (dipisah sebagai penjual & pembeli)',
  })
  byUser(@Param('userId') userId: string) {
    return this.reviewsService.getByUser(userId);
  }

  @ApiBearerAuth('jwt')
  @Put(':id')
  @ApiOperation({ summary: 'Update own review' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, uid, dto);
  }

  @ApiBearerAuth('jwt')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete own review (or admin)' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @CurrentUser('role') role: string,
  ) {
    return this.reviewsService.delete(id, uid, role);
  }

  @ApiBearerAuth('jwt')
  @Post(':id/reply')
  @ApiOperation({ summary: '[Seller] Reply to review on me' })
  reply(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.reply(id, uid, dto);
  }

  @ApiBearerAuth('jwt')
  @Post(':id/helpful')
  @ApiOperation({ summary: 'Mark review as helpful' })
  helpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }
}
