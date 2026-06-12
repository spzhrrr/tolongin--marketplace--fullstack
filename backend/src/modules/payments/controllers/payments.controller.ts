import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from '../services/payments.service';
import { CreatePaymentDto } from '../dto/payment.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('jwt')
  @Roles(ROLE.USER)
  @Post()
  @ApiOperation({ summary: '[Buyer] Create payment for an order' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(userId, dto);
  }

  @ApiBearerAuth('jwt')
  @Get(':id/status')
  @ApiOperation({ summary: 'Check payment status' })
  status(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.paymentsService.checkStatus(id, uid);
  }

  @ApiBearerAuth('jwt')
  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  history(@CurrentUser('id') uid: string) {
    return this.paymentsService.history(uid);
  }

  @Public()
  @Get('methods')
  @ApiOperation({ summary: 'Available payment methods' })
  methods() {
    return this.paymentsService.getMethods();
  }

  @Public()
  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Payment provider webhook' })
  webhook(@Param('provider') provider: string, @Body() body: any) {
    return this.paymentsService.webhook(provider, body);
  }
}
