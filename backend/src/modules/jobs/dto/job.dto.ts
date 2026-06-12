import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BUDGET_TYPE_VALUES } from '../../../common/constants/enums';
import type { BudgetType } from '../../../common/constants/enums';

export class CreateJobDto {
  @ApiProperty({ minLength: 5, maxLength: 100 })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ minLength: 20 })
  @IsString()
  @MinLength(20)
  description!: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  budget!: number;

  @ApiProperty({ enum: BUDGET_TYPE_VALUES, required: false })
  @IsOptional()
  @IsEnum(BUDGET_TYPE_VALUES)
  budgetType?: BudgetType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({
    required: false,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    description: 'Tingkat urgensi pekerjaan',
  })
  @IsOptional()
  @IsString()
  urgency?: string;
}

export class UpdateJobDto {
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
  budget?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(BUDGET_TYPE_VALUES)
  budgetType?: BudgetType; // ← Pakai import type

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({
    required: false,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  urgency?: string;
}

export class JobQueryDto {
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
  buyerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Budget minimum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minBudget?: number;

  @ApiProperty({ required: false, description: 'Budget maksimum' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxBudget?: number;

  @ApiProperty({ required: false, description: 'Filter lokasi (mengandung)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    required: false,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
  })
  @IsOptional()
  @IsString()
  urgency?: string;

  @ApiProperty({
    required: false,
    description:
      'Pengurutan: newest|budget_asc|budget_desc ATAU field createdAt|budget',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
