import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty()
  @IsString()
  recipientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  orderId?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  content!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  attachment?: {
    url: string;
    type: string;
    name: string;
    size: number;
  };
}
