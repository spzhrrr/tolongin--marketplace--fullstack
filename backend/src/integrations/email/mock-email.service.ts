import { Injectable, Logger } from '@nestjs/common';
import { IEmailService } from './email.interface';

@Injectable()
export class MockEmailService implements IEmailService {
  private readonly logger = new Logger('MockEmailService');

  async sendEmail({ to, subject }: { to: string; subject: string; html: string; text?: string }) {
    this.logger.log(`📧 [MOCK] email -> ${to} | subject="${subject}"`);
  }

  async sendOtp(to: string, otp: string) {
    this.logger.log(`📧 [MOCK] OTP -> ${to} : ${otp}`);
  }

  async sendPasswordReset(to: string, token: string, link: string) {
    this.logger.log(`📧 [MOCK] PWD-RESET -> ${to} token=${token} link=${link}`);
  }

  async sendVerificationEmail(to: string, otp: string) {
    this.logger.log(`📧 [MOCK] VERIFY-EMAIL -> ${to} otp=${otp}`);
  }
}
