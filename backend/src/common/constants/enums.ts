// Tolongin enums
// User role: ADMIN platform vs USER biasa (semua aksi diatur lewat level verifikasi).
export const ROLE = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];
export const ROLE_VALUES = Object.values(ROLE);

export const PRICE_TYPE = { FIXED: 'FIXED', HOURLY: 'HOURLY' } as const;
export type PriceType = (typeof PRICE_TYPE)[keyof typeof PRICE_TYPE];
export const PRICE_TYPE_VALUES = Object.values(PRICE_TYPE);

export const BUDGET_TYPE = {
  FIXED: 'FIXED',
  HOURLY: 'HOURLY',
  RANGE: 'RANGE',
} as const;
export type BudgetType = (typeof BUDGET_TYPE)[keyof typeof BUDGET_TYPE];
export const BUDGET_TYPE_VALUES = Object.values(BUDGET_TYPE);

export const JOB_STATUS = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
  EXPIRED: 'EXPIRED',
} as const;
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
export const JOB_STATUS_VALUES = Object.values(JOB_STATUS);

export const APPLICATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  HIRED: 'HIRED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ApplicationStatus =
  (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];
export const APPLICATION_STATUS_VALUES = Object.values(APPLICATION_STATUS);

export const ORDER_STATUS = {
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  REVISION_REQUESTED: 'REVISION_REQUESTED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  DISPUTED: 'DISPUTED',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS);

export const DELIVERY_TYPE = {
  DIGITAL: 'DIGITAL',
  PHYSICAL: 'PHYSICAL',
} as const;
export type DeliveryType = (typeof DELIVERY_TYPE)[keyof typeof DELIVERY_TYPE];
export const DELIVERY_TYPE_VALUES = Object.values(DELIVERY_TYPE);

export const PAYMENT_METHOD = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD',
  GOPAY: 'GOPAY',
  OVO: 'OVO',
  DANA: 'DANA',
  VIRTUAL_ACCOUNT: 'VIRTUAL_ACCOUNT',
} as const;
export type PaymentMethod =
  (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];
export const PAYMENT_STATUS_VALUES = Object.values(PAYMENT_STATUS);

export const WITHDRAWAL_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;
export type WithdrawalStatus =
  (typeof WITHDRAWAL_STATUS)[keyof typeof WITHDRAWAL_STATUS];
export const WITHDRAWAL_STATUS_VALUES = Object.values(WITHDRAWAL_STATUS);

export const NOTIFICATION_TYPE = {
  ORDER: 'ORDER',
  PAYMENT: 'PAYMENT',
  MESSAGE: 'MESSAGE',
  REVIEW: 'REVIEW',
  SYSTEM: 'SYSTEM',
  DISPUTE: 'DISPUTE',
  APPLICATION: 'APPLICATION',
  WITHDRAWAL: 'WITHDRAWAL',
  KYC: 'KYC',
} as const;
export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];
export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPE);

export const DISPUTE_STATUS = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const;
export type DisputeStatus =
  (typeof DISPUTE_STATUS)[keyof typeof DISPUTE_STATUS];
export const DISPUTE_STATUS_VALUES = Object.values(DISPUTE_STATUS);

//                         ====
// Order state machine — sekarang tidak lagi pakai role 'buyer'/'seller',
// melainkan posisi user dalam order (apakah dia BUYER atau SELLER pada order itu).
// Konsumen di service mengevaluasi `userId === order.buyerId` dst.
//                         ====
export const ORDER_TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<'buyer' | 'seller' | 'admin', OrderStatus[]>>
> = {
  WAITING_CONFIRMATION: {
    buyer: ['CANCELLED'],
    seller: ['ACCEPTED', 'CANCELLED'],
    admin: ['CANCELLED', 'DISPUTED'],
  },
  ACCEPTED: {
    seller: ['IN_PROGRESS', 'CANCELLED'],
    admin: ['CANCELLED', 'DISPUTED'],
  },
  IN_PROGRESS: {
    seller: ['IN_REVIEW', 'CANCELLED'],
    admin: ['CANCELLED', 'DISPUTED'],
  },
  IN_REVIEW: {
    buyer: ['COMPLETED', 'REVISION_REQUESTED'],
    seller: [],
    admin: ['DISPUTED'],
  },
  REVISION_REQUESTED: {
    seller: ['IN_REVIEW'],
    buyer: [],
    admin: ['DISPUTED'],
  },
  COMPLETED: { buyer: [], seller: [], admin: [] },
  CANCELLED: { buyer: [], seller: [], admin: [] },
  DISPUTED: { admin: ['COMPLETED', 'CANCELLED'] },
};

// KYC status (computed)
export const KYC_STATUS = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;
export type KycStatus = (typeof KYC_STATUS)[keyof typeof KYC_STATUS];

// Verification levels (used by frontend to gate UI)
export const VERIFICATION_LEVEL = {
  NONE: 0,
  CONTACT: 1, // email + phone verified  → can apply to jobs
  KTP: 2, // + ktp verified            → can sell services
  BANK: 3, // + bank verified           → can withdraw
} as const;
