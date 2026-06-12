/** Payment provider abstraction. Replace mock with MidtransService / StripeService in production. */
export interface PaymentCreateParams {
  orderId: string;
  amount: number;
  method: string;
  buyerEmail?: string;
  buyerName?: string;
}

export interface PaymentCreateResult {
  transactionId: string;
  paymentUrl: string;
  expiresAt: Date;
}

export interface IPaymentService {
  createPayment(params: PaymentCreateParams): Promise<PaymentCreateResult>;
  verifyWebhook(payload: unknown): boolean;
  getStatus(transactionId: string): Promise<'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED'>;
}
export const PAYMENT_SERVICE = Symbol('IPaymentService');
