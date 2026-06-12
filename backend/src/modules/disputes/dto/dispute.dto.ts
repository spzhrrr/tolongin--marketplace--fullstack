import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDisputeDto {
  @ApiProperty() @IsString() orderId!: string;
  @ApiProperty() @IsString() @MinLength(3) reason!: string;
  @ApiProperty() @IsString() @MinLength(20) description!: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidence?: string[];
}

export class ResolveDisputeDto {
  @ApiProperty() @IsString() resolution!: string;
}
