import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty() @IsString() jobId!: string;
  @ApiProperty({ minLength: 20 })
  @IsString()
  @MinLength(20)
  coverLetter!: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(1) proposedPrice!: number;
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  proposedDuration!: number;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  portfolioIds?: string[];
}

export class UpdateApplicationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverLetter?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proposedPrice?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  proposedDuration?: number;
}

export class RejectApplicationDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}
