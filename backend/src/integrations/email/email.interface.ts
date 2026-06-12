/**
 * Base interface for any email provider.
 * Replace `MockEmailService` with `ResendService` / `SendGridService` etc in production.
 */
export interface IEmailService {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;

  sendOtp(to: string, otp: string): Promise<void>;
  sendPasswordReset(to: string, token: string, link: string): Promise<void>;
  sendVerificationEmail(to: string, otp: string): Promise<void>;
}

export const EMAIL_SERVICE = Symbol('IEmailService');
