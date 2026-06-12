import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PRICE_TYPE_VALUES } from '../../../common/constants/enums';
// ✅ Gunakan import type untuk PriceType
import type { PriceType } from '../../../common/constants/enums';

export class CreateServiceDto {
  @ApiProperty({
    example: 'Desain Logo Modern & Minimalis',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title!: string;

  @ApiProperty({
    example: 'Saya akan membuat desain logo modern, minimalis, dan unik...',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 150000, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price!: number;

  @ApiProperty({ enum: PRICE_TYPE_VALUES, default: 'FIXED' })
  @IsOptional()
  @IsEnum(PRICE_TYPE_VALUES)
  priceType?: PriceType;

  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deliveryTime!: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revisionCount?: number;

  @ApiProperty({ type: [String], required: false, maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];
}

export class UpdateServiceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(20)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price?: number;

  @ApiProperty({ required: false, enum: PRICE_TYPE_VALUES })
  @IsOptional()
  @IsEnum(PRICE_TYPE_VALUES) // ✅ Hapus "as unknown as PriceType[]"
  priceType?: PriceType; // ✅ Pakai type dari import type

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  deliveryTime?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  revisionCount?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiProperty({ required: false, description: 'Rating minimum (0-5)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRating?: number;

  @ApiProperty({
    required: false,
    description: 'Maksimum waktu pengerjaan (hari)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxDeliveryDays?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiProperty({
    required: false,
    description:
      'Pengurutan: createdAt|price|rating ATAU alias newest|price_asc|price_desc|rating_desc',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
