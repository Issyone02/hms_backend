// src/notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';

// ── Observer Interface ─────────────────────────────────────────────────────────
interface NotificationObserver {
  update(event: string, guestId: string, message: string, type: NotificationType): Promise<void>;
}

// ── In-App Observer ────────────────────────────────────────────────────────────
class InAppObserver implements NotificationObserver {
  constructor(private prisma: PrismaService) {}

  async update(event: string, guestId: string, message: string, type: NotificationType) {
    await this.prisma.notification.create({
      data: { guestId, message, type, isRead: false },
    });
  }
}

// ── Email Observer (stub — wire up SendGrid API key to activate) ───────────────
class EmailObserver implements NotificationObserver {
  async update(event: string, guestId: string, message: string, type: NotificationType) {
    // TODO: integrate SendGrid
    // await sendgrid.send({ to: guestEmail, subject: type, text: message });
    console.log(`[EMAIL] ${type} → guest:${guestId} — ${message}`);
  }
}

// ── NotificationService (Subject) ─────────────────────────────────────────────
@Injectable()
export class NotificationsService {
  private observers: NotificationObserver[];

  constructor(private prisma: PrismaService) {
    this.observers = [
      new InAppObserver(prisma),
      new EmailObserver(),
    ];
  }

  async dispatch(
    event: string,
    guestId: string,
    message: string,
    type: NotificationType,
  ) {
    // Fire all observers; individual failures are logged, not re-thrown
    await Promise.allSettled(
      this.observers.map((obs) => obs.update(event, guestId, message, type)),
    );
  }

  // ── REST operations ──────────────────────────────────────────────────────────
  async getForGuest(guestId: string, isRead?: boolean) {
    const where: any = { guestId };
    if (isRead !== undefined) where.isRead = isRead;
    return this.prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    });
  }

  async markRead(id: string, guestId: string) {
    return this.prisma.notification.updateMany({
      where: { id, guestId },
      data:  { isRead: true },
    });
  }

  async markAllRead(guestId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { guestId, isRead: false },
      data:  { isRead: true },
    });
    return { count: result.count };
  }
}
