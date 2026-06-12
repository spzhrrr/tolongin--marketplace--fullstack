import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WithdrawalsService } from '../services/withdrawals.service';
import {
  CreateBankAccountDto,
  CreateWithdrawalDto,
} from '../dto/withdrawal.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ROLE } from '../../../common/constants/enums';
import { VerifiedWithdrawalGuard } from '../../../common/guards/verification.guards';

@ApiTags('Withdrawals')
@ApiBearerAuth('jwt')
@Roles(ROLE.USER)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get('seller')
  @ApiOperation({ summary: 'Withdrawal history' })
  history(@CurrentUser('id') uid: string) {
    return this.withdrawalsService.listMine(uid);
  }

  @UseGuards(VerifiedWithdrawalGuard)
  @Post()
  @ApiOperation({
    summary: 'Request withdrawal (requires KTP + bank verified)',
  })
  create(@CurrentUser('id') uid: string, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(uid, dto);
  }

  @Get('balance')
  @ApiOperation({ summary: '[Seller] Get current balance' })
  balance(@CurrentUser('id') uid: string) {
    return this.withdrawalsService.balance(uid);
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: '[Seller] List bank accounts' })
  bankAccounts(@CurrentUser('id') uid: string) {
    return this.withdrawalsService.bankAccounts(uid);
  }

  @Post('bank-accounts')
  @ApiOperation({ summary: '[Seller] Add bank account' })
  add(@CurrentUser('id') uid: string, @Body() dto: CreateBankAccountDto) {
    return this.withdrawalsService.addBankAccount(uid, dto);
  }

  @Delete('bank-accounts/:id')
  @ApiOperation({ summary: '[Seller] Delete bank account' })
  remove(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.withdrawalsService.deleteBankAccount(id, uid);
  }
}
