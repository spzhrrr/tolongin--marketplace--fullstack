import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PAYMENT_METHOD_VALUES } from '../../../common/constants/enums';
// ✅ Gunakan import type untuk PaymentMethod
import type { PaymentMethod } from '../../../common/constants/enums';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({ enum: PAYMENT_METHOD_VALUES })
  @IsEnum(PAYMENT_METHOD_VALUES) // ✅ Hapus "as unknown as PaymentMethod[]"
  method!: PaymentMethod; // ✅ Sekarang pakai type dari import type
}
