import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(50000) amount!: number;
  @ApiProperty() @IsString() bankAccountId!: string;
}

export class CreateBankAccountDto {
  @ApiProperty() @IsString() bankName!: string;
  @ApiProperty() @IsString() accountNumber!: string;
  @ApiProperty() @IsString() accountName!: string;
  @ApiProperty({ required: false }) @IsOptional() isDefault?: boolean;
}
