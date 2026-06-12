import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RejectSellerDto {
  @ApiProperty() @IsString() reason!: string;
}

export class UpdateSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platformFee?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  minWithdraw?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supportEmail?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  platformName?: string;
}
