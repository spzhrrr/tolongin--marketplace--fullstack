import { Global, Module } from '@nestjs/common';
import { EMAIL_SERVICE } from './email/email.interface';
import { MockEmailService } from './email/mock-email.service';
import { SMS_SERVICE } from './sms/sms.interface';
import { MockSmsService } from './sms/mock-sms.service';
import { PAYMENT_SERVICE } from './payment/payment.interface';
import { MockPaymentService } from './payment/mock-payment.service';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { MockStorageService } from './storage/mock-storage.service';

/**
 * Wraps all 3rd-party integrations behind interfaces.
 * Swap the `useClass` value to plug a real provider (Resend, Twilio, Midtrans, Cloudinary, ...)
 * without touching business logic.
 */
@Global()
@Module({
  providers: [
    { provide: EMAIL_SERVICE, useClass: MockEmailService },
    { provide: SMS_SERVICE, useClass: MockSmsService },
    { provide: PAYMENT_SERVICE, useClass: MockPaymentService },
    { provide: STORAGE_SERVICE, useClass: MockStorageService },
  ],
  exports: [EMAIL_SERVICE, SMS_SERVICE, PAYMENT_SERVICE, STORAGE_SERVICE],
})
export class IntegrationsModule {}
