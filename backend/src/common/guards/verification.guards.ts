import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Requires emailVerified && phoneVerified. Used for actions that put the user
 * in contact with the public — e.g. melamar pekerjaan.
 */
@Injectable()
export class VerifiedContactGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Login terlebih dahulu');
    if (!user.emailVerified || !user.phoneVerified) {
      throw new ForbiddenException({
        message:
          'Verifikasi email dan nomor telepon diperlukan untuk aksi ini',
        code: 'VERIFICATION_REQUIRED',
        requiredLevel: 'CONTACT',
        missing: {
          email: !user.emailVerified,
          phone: !user.phoneVerified,
        },
      });
    }
    return true;
  }
}

/**
 * Requires ktpVerified. Used for selling actions (creating a service,
 * receiving payments).
 */
@Injectable()
export class VerifiedKtpGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Login terlebih dahulu');
    if (!user.ktpVerified) {
      throw new ForbiddenException({
        message: 'Verifikasi KTP diperlukan untuk menjual jasa',
        code: 'VERIFICATION_REQUIRED',
        requiredLevel: 'KTP',
      });
    }
    return true;
  }
}

/**
 * Requires ktpVerified && bankVerified. Used for withdrawal actions.
 */
@Injectable()
export class VerifiedWithdrawalGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Login terlebih dahulu');
    if (!user.ktpVerified || !user.bankVerified) {
      throw new ForbiddenException({
        message:
          'Verifikasi KTP dan rekening bank diperlukan untuk menarik dana',
        code: 'VERIFICATION_REQUIRED',
        requiredLevel: 'BANK',
        missing: {
          ktp: !user.ktpVerified,
          bank: !user.bankVerified,
        },
      });
    }
    return true;
  }
}
