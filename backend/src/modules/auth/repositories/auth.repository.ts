import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, User, PasswordReset } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  createPasswordReset(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordReset> {
    return this.prisma.passwordReset.create({
      data: { userId, token, expiresAt },
    });
  }

  findValidPasswordReset(token: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  markPasswordResetUsed(id: string): Promise<PasswordReset> {
    return this.prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async findByEmailOtp(otp: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        emailOtpHash: otp,
        emailOtpExpiresAt: { gt: new Date() },
      },
    });
  }
  async saveEmailOtp(
    userId: string,
    otp: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailOtpHash: otp,
        emailOtpExpiresAt: expiresAt,
      },
    });
  }

  async verifyEmail(userId: string, otp: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailOtpHash: true, emailOtpExpiresAt: true },
    });

    if (!user || !user.emailOtpHash || !user.emailOtpExpiresAt) return false;
    if (user.emailOtpHash !== otp) return false;
    if (new Date() > user.emailOtpExpiresAt) return false;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
      },
    });

    return true;
  }
}
