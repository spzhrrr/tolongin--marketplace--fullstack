import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { WithdrawalsRepository } from './../repositories/withdrawals.repository';
import {
  CreateWithdrawalDto,
  CreateBankAccountDto,
} from '../dto/withdrawal.dto';

@Injectable()
export class WithdrawalsService {
  constructor(private readonly repo: WithdrawalsRepository) {}

  async create(sellerId: string, dto: CreateWithdrawalDto) {
    const acc = await this.repo.findBankAccountById(dto.bankAccountId);
    if (!acc || acc.userId !== sellerId)
      throw new NotFoundException('Bank account not found');
    const profile = await this.repo.findUser(sellerId);
    if (!profile) throw new BadRequestException('Seller profile not found');
    if (profile.balance < dto.amount)
      throw new BadRequestException('Saldo tidak mencukupi');
    const created = await this.repo.createWithdrawal({
      seller: { connect: { id: sellerId } },
      amount: dto.amount,
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountName: acc.accountName,
    });
    await this.repo.updateBalance(sellerId, -dto.amount);
    return created;
  }

  listMine(sellerId: string) {
    return this.repo.findWithdrawalsBySeller(sellerId);
  }

  async balance(sellerId: string) {
    const profile = await this.repo.findUser(sellerId);
    return { balance: profile?.balance || 0 };
  }

  bankAccounts(userId: string) {
    return this.repo.findBankAccountsByUser(userId);
  }

  addBankAccount(userId: string, dto: CreateBankAccountDto) {
    return this.repo.createBankAccount({
      user: { connect: { id: userId } },
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName,
      isDefault: !!dto.isDefault,
    });
  }

  async deleteBankAccount(id: string, userId: string) {
    const acc = await this.repo.findBankAccountById(id);
    if (!acc) throw new NotFoundException();
    if (acc.userId !== userId) throw new ForbiddenException();
    await this.repo.deleteBankAccount(id);
    return { message: 'Bank account deleted' };
  }
}
