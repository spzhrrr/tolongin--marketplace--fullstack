import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

// DTO untuk membuat item portofolio milik user
export class CreatePortfolioDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl({}, { message: 'projectUrl harus berupa URL yang valid' })
  projectUrl?: string;
}
