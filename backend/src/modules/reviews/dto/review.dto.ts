import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
  @ApiProperty({ minLength: 5 }) @IsString() @MinLength(5) comment!: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  images?: string[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class UpdateReviewDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() comment?: string;
}

export class ReplyReviewDto {
  @ApiProperty() @IsString() @MinLength(2) reply!: string;
}
