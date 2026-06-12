import { Injectable, Logger } from '@nestjs/common';
import { ISmsService } from './sms.interface';

@Injectable()
export class MockSmsService implements ISmsService {
  private readonly logger = new Logger('MockSmsService');

  async sendOtp(phone: string, otp: string) {
    this.logger.log(`📱 [MOCK] SMS OTP -> ${phone} : ${otp}`);
  }

  async sendSms(phone: string, message: string) {
    this.logger.log(`📱 [MOCK] SMS -> ${phone} : ${message}`);
  }
}
