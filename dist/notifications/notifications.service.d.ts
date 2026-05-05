import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationType } from '@prisma/client';
export declare class NotificationsService {
    private prisma;
    private observers;
    constructor(prisma: PrismaService);
    dispatch(event: string, guestId: string, message: string, type: NotificationType): Promise<void>;
    getForGuest(guestId: string, isRead?: boolean): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.NotificationType;
        message: string;
        sentAt: Date;
        isRead: boolean;
        guestId: string;
    }[]>;
    markRead(id: string, guestId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(guestId: string): Promise<{
        count: number;
    }>;
}
