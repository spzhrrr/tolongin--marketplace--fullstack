import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'buyer@tolongin.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Buyer@123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
