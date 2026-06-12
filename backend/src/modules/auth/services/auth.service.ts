import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from '../dto/password.dto';
import {
  AuthResponse,
  JwtPayload,
  PublicUser,
} from '../interfaces/auth.interface';
import { User } from '@prisma/client';
import { Role } from '../../../common/constants/enums';
import { TokenBlacklistService } from '../../../common/services/token-blacklist.service';
import { AuditLogService } from '../../../common/services/audit-log.service';
import { EMAIL_SERVICE } from '../../../integrations/email/email.interface';
import type { IEmailService } from '../../../integrations/email/email.interface';
import { SMS_SERVICE } from '../../../integrations/sms/sms.interface';
import type { ISmsService } from '../../../integrations/sms/sms.interface';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly blacklist: TokenBlacklistService,
    private readonly audit: AuditLogService,
    @Inject(EMAIL_SERVICE) private readonly email: IEmailService,
    @Inject(SMS_SERVICE) private readonly sms: ISmsService,
  ) {}

  // ---------- Helpers ----------
  toPublic(u: User): PublicUser {
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role as Role,
      phone: u.phone,
      avatar: u.avatar,
      bio: (u as any).bio,
      city: (u as any).city,
      isActive: u.isActive,
      isBanned: (u as any).isBanned,
      emailVerified: (u as any).emailVerified ?? false,
      phoneVerified: (u as any).phoneVerified ?? false,
      ktpVerified: (u as any).ktpVerified ?? false,
      bankVerified: (u as any).bankVerified ?? false,
      ktpRejectedReason: (u as any).ktpRejectedReason,
      ktpSubmittedAt: (u as any).ktpSubmittedAt,
      rating: (u as any).rating ?? 0,
      reviewCount: (u as any).reviewCount ?? 0,
      totalOrders: (u as any).totalOrders ?? 0,
      completedOrders: (u as any).completedOrders ?? 0,
      balance: (u as any).balance ?? 0,
      createdAt: u.createdAt,
    };
  }

  private secret() {
    return this.config.get<string>('app.jwt.secret') || 'change-me';
  }

  private signAccess(u: User): string {
    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      role: u.role as Role,
      type: 'access',
      jti: randomUUID(),
    };
    return this.jwtService.sign(payload, {
      secret: this.secret(),
      expiresIn: this.config.get<string>('app.jwt.accessExpiresIn') || '15m',
    });
  }

  private signRefresh(u: User): string {
    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      role: u.role as Role,
      type: 'refresh',
      jti: randomUUID(),
    };
    return this.jwtService.sign(payload, {
      secret: this.secret(),
      expiresIn: this.config.get<string>('app.jwt.refreshExpiresIn') || '7d',
    });
  }

  private buildTokens(u: User): AuthResponse {
    return {
      token: this.signAccess(u),
      refreshToken: this.signRefresh(u),
      user: this.toPublic(u),
    };
  }

  // ---------- Use cases ----------
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email sudah terdaftar');
    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUser({
      email: dto.email.toLowerCase(),
      password: hashed,
      name: dto.name,
      phone: dto.phone,
      role: 'USER',
    });

    // mock email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.email.sendVerificationEmail(user.email, otp);
    if (user.phone) await this.sms.sendOtp(user.phone, otp);

    await this.audit.log(user.id, 'USER_REGISTERED', 'User', user.id, {
      email: user.email,
      role: user.role,
    });
    return this.buildTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Email atau password salah');
    if (!user.isActive)
      throw new ForbiddenException('Akun Anda telah dinonaktifkan');
    await this.audit.log(user.id, 'USER_LOGIN', 'User', user.id);
    return this.buildTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.secret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh')
      throw new UnauthorizedException('Not a refresh token');
    if (payload.jti && this.blacklist.has(payload.jti))
      throw new UnauthorizedException('Refresh token has been revoked');
    const user = await this.repo.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException();
    return this.buildTokens(user);
  }

  async logout(accessToken?: string, refreshToken?: string) {
    for (const t of [accessToken, refreshToken]) {
      if (!t) continue;
      try {
        const p: any = this.jwtService.verify(t, { secret: this.secret() });
        if (p?.jti && p?.exp) this.blacklist.add(p.jti, p.exp);
      } catch {
        /* ignore */
      }
    }
    return { message: 'Logout berhasil' };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const u = await this.repo.findById(userId);
    if (!u) throw new NotFoundException('User not found');
    return this.toPublic(u);
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const updated = await this.repo.updateUser(userId, { ...dto });
    await this.audit.log(userId, 'PROFILE_UPDATED', 'User', userId, dto as any);
    return this.toPublic(updated);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const u = await this.repo.findById(userId);
    if (!u) throw new NotFoundException('User not found');
    const ok = await bcrypt.compare(dto.oldPassword, u.password);
    if (!ok) throw new BadRequestException('Password lama tidak sesuai');
    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.repo.updateUser(userId, { password: hashed });
    await this.audit.log(userId, 'PASSWORD_CHANGED', 'User', userId);
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ resetToken?: string; demoMode: boolean }> {
    const u = await this.repo.findByEmail(dto.email);
    if (!u) return { demoMode: true }; // don't leak existence
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await this.repo.createPasswordReset(u.id, token, expiresAt);
    const link = `https://tolongin.local/reset-password?token=${token}`;
    await this.email.sendPasswordReset(u.email, token, link);
    await this.audit.log(u.id, 'PASSWORD_RESET_REQUESTED', 'User', u.id);
    this.logger.log(`Password reset token for ${u.email}: ${token}`);
    return { resetToken: token, demoMode: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const reset = await this.repo.findValidPasswordReset(dto.token);
    if (!reset)
      throw new BadRequestException('Token tidak valid atau sudah kedaluwarsa');
    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.repo.updateUser(reset.userId, { password: hashed });
    await this.repo.markPasswordResetUsed(reset.id);
    await this.audit.log(reset.userId, 'PASSWORD_RESET', 'User', reset.userId);
  }

  async sendVerificationEmail(
    userId: string,
  ): Promise<{ demoMode: boolean; link?: string }> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerified)
      throw new BadRequestException('Email sudah terverifikasi');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    // Simpan OTP ke database (perlu tambah field di schema)
    await this.repo.saveEmailOtp(userId, otp, expiresAt);

    // Mock mode - kirim link via console
    const mockLink = `http://localhost:3000/verify-email?token=${otp}`;
    this.logger.log(`[MOCK EMAIL] Link verifikasi: ${mockLink}`);
    this.logger.log(`[MOCK EMAIL] Kode OTP: ${otp}`);

    await this.email.sendVerificationEmail(user.email, otp);

    return {
      demoMode: true,
      link: mockLink,
    };
  }
  async validateUser(payload: JwtPayload): Promise<User | null> {
    if (payload.type && payload.type !== 'access') return null;
    if (payload.jti && this.blacklist.has(payload.jti)) return null;
    const u = await this.repo.findById(payload.sub);
    if (!u || !u.isActive) return null;
    return u;
  }
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.repo.findByEmailOtp(token);
    if (!user) {
      throw new BadRequestException('Token tidak valid');
    }

    const verified = await this.repo.verifyEmail(user.id, token);
    if (!verified) {
      throw new BadRequestException('Token tidak valid atau sudah kadaluarsa');
    }

    return { message: 'Email berhasil diverifikasi' };
  }
}
