// src/notifications/notifications.controller.ts
import {
  Controller, Get, Patch, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard }         from '../auth/auth.guards';
import { CurrentUser }          from '../common/decorators/index';

@Controller('api/v1/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  getAll(
    @CurrentUser() user: any,
    @Query('isRead') isRead?: string,
  ) {
    const filter = isRead === undefined ? undefined : isRead === 'true';
    return this.svc.getForGuest(user.id, filter);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.svc.markAllRead(user.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/notifications/notifications.module.ts
import { Module } from '@nestjs/common';

@Module({
  controllers: [NotificationsController],
  providers:   [NotificationsService],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
