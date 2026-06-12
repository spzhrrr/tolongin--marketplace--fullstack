import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('jwt')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  list(
    @CurrentUser('id') uid: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    // Dukung filter ?unreadOnly=true untuk hanya menampilkan notifikasi belum dibaca
    return this.notificationsService.list(uid, unreadOnly === 'true');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread count' })
  unread(@CurrentUser('id') uid: string) {
    return this.notificationsService.unread(uid).then((count) => ({ count }));
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark as read' })
  read(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.notificationsService
      .markRead(id, uid)
      .then(() => ({ ok: true }));
  }

  // Alias PATCH untuk kompatibilitas dengan frontend
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark as read (alias PATCH)' })
  readPatch(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.notificationsService
      .markRead(id, uid)
      .then(() => ({ ok: true }));
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all as read' })
  readAll(@CurrentUser('id') uid: string) {
    return this.notificationsService
      .markAllRead(uid)
      .then(() => ({ ok: true }));
  }

  // Alias PATCH untuk kompatibilitas dengan frontend
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all as read (alias PATCH)' })
  readAllPatch(@CurrentUser('id') uid: string) {
    return this.notificationsService
      .markAllRead(uid)
      .then(() => ({ ok: true }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  delete(@Param('id') id: string, @CurrentUser('id') uid: string) {
    return this.notificationsService.delete(id, uid).then(() => ({ ok: true }));
  }
}
