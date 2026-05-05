"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
class InAppObserver {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async update(event, guestId, message, type) {
        await this.prisma.notification.create({
            data: { guestId, message, type, isRead: false },
        });
    }
}
class EmailObserver {
    async update(event, guestId, message, type) {
        console.log(`[EMAIL] ${type} → guest:${guestId} — ${message}`);
    }
}
let NotificationsService = class NotificationsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.observers = [
            new InAppObserver(prisma),
            new EmailObserver(),
        ];
    }
    async dispatch(event, guestId, message, type) {
        await Promise.allSettled(this.observers.map((obs) => obs.update(event, guestId, message, type)));
    }
    async getForGuest(guestId, isRead) {
        const where = { guestId };
        if (isRead !== undefined)
            where.isRead = isRead;
        return this.prisma.notification.findMany({
            where,
            orderBy: { sentAt: 'desc' },
        });
    }
    async markRead(id, guestId) {
        return this.prisma.notification.updateMany({
            where: { id, guestId },
            data: { isRead: true },
        });
    }
    async markAllRead(guestId) {
        const result = await this.prisma.notification.updateMany({
            where: { guestId, isRead: false },
            data: { isRead: true },
        });
        return { count: result.count };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map