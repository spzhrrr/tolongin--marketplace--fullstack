import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WithdrawalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Withdrawals
  createWithdrawal(data: Prisma.WithdrawalCreateInput) {
    return this.prisma.withdrawal.create({ data });
  }
  findWithdrawalsBySeller(sellerId: string) {
    return this.prisma.withdrawal.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Bank accounts
  createBankAccount(data: Prisma.BankAccountCreateInput) {
    return this.prisma.bankAccount.create({ data });
  }
  findBankAccountsByUser(userId: string) {
    return this.prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
  findBankAccountById(id: string) {
    return this.prisma.bankAccount.findUnique({ where: { id } });
  }
  deleteBankAccount(id: string) {
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  // Balance — sekarang ada di User langsung
  findUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }
  updateBalance(userId: string, delta: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: delta } },
    });
  }
}
