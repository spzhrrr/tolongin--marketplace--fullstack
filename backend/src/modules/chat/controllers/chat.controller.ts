import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { CreateConversationDto, SendMessageDto } from '../dto/chat.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth('jwt')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  list(@CurrentUser('id') uid: string) {
    return this.chatService.listConversations(uid);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start (or get) conversation with another user' })
  start(@CurrentUser('id') uid: string, @Body() dto: CreateConversationDto) {
    return this.chatService.startConversation(uid, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation detail' })
  detail(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.chatService.getConversation(id, uid);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get messages (also marks as read)' })
  messages(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.chatService.getMessages(id, uid);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message (with optional attachment)' })
  send(
    @Param('id') id: string,
    @CurrentUser('id') uid: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, uid, dto);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  read(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.chatService.markAsRead(id, uid);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete conversation' })
  delete(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.chatService.deleteConversation(id, uid);
  }
}
