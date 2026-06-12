/** SMS provider abstraction. Replace mock with TwilioService in production. */
export interface ISmsService {
  sendOtp(phone: string, otp: string): Promise<void>;
  sendSms(phone: string, message: string): Promise<void>;
}
export const SMS_SERVICE = Symbol('ISmsService');
