import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private svc;
    constructor(svc: NotificationsService);
    getAll(user: any, isRead?: string): Promise<{
        id: string;
        type: import(".prisma/client").$Enums.NotificationType;
        message: string;
        sentAt: Date;
        isRead: boolean;
        guestId: string;
    }[]>;
    markRead(id: string, user: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    markAllRead(user: any): Promise<{
        count: number;
    }>;
}
export declare class NotificationsModule {
}
