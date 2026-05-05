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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsModule = exports.BookingsController = exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const client_1 = require("@prisma/client");
let BookingsService = class BookingsService {
    constructor(prisma, notifications) {
        this.prisma = prisma;
        this.notifications = notifications;
    }
    async create(guestId, roomId, checkInDate, checkOutDate, createdById) {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        if (checkOut <= checkIn)
            throw new common_1.BadRequestException('Check-out must be after check-in');
        if (checkIn < new Date())
            throw new common_1.BadRequestException('Check-in date cannot be in the past');
        const conflict = await this.prisma.roomBooking.findFirst({
            where: {
                roomId,
                bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
                AND: [
                    { checkInDate: { lt: checkOut } },
                    { checkOutDate: { gt: checkIn } },
                ],
            },
        });
        if (conflict)
            throw new common_1.ConflictException('Room is not available for these dates');
        const room = await this.prisma.room.findUnique({ where: { id: roomId } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        if (room.status !== 'AVAILABLE')
            throw new common_1.BadRequestException(`Room is currently ${room.status}`);
        const booking = await this.prisma.roomBooking.create({
            data: {
                guestId, roomId, checkInDate: checkIn, checkOutDate: checkOut,
                bookingStatus: 'PENDING', createdById,
            },
            include: { guest: true, room: true },
        });
        await this.confirm(booking.id, booking.guestId, booking.room.pricePerNight, checkIn, checkOut, booking.room.roomNumber);
        return this.findById(booking.id);
    }
    async confirm(bookingId, guestId, pricePerNight, checkIn, checkOut, roomNumber) {
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
        const roomRate = Number(pricePerNight) * nights;
        const hotelTaxRate = 0.20;
        const tax = parseFloat((roomRate * hotelTaxRate).toFixed(2));
        await this.prisma.$transaction([
            this.prisma.roomBooking.update({
                where: { id: bookingId },
                data: { bookingStatus: 'CONFIRMED' },
            }),
            this.prisma.invoiceItem.create({
                data: {
                    bookingId, category: 'ROOM_RATE',
                    description: `Room ${roomNumber} — ${nights} night(s)`,
                    amount: roomRate,
                },
            }),
            this.prisma.invoiceItem.create({
                data: {
                    bookingId, category: 'TAX',
                    description: `VAT (${(hotelTaxRate * 100).toFixed(0)}%)`,
                    amount: tax,
                },
            }),
        ]);
        await this.notifications.dispatch('BOOKING_CONFIRMED', guestId, `Your booking has been confirmed. Check-in: ${checkIn.toDateString()}.`, client_1.NotificationType.BOOKING_CONFIRMED);
    }
    async findAll(filters) {
        const page = Number(filters.page ?? 1);
        const limit = Number(filters.limit ?? 20);
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.guestId)
            where.guestId = filters.guestId;
        if (filters.status)
            where.bookingStatus = filters.status;
        const [bookings, total] = await this.prisma.$transaction([
            this.prisma.roomBooking.findMany({
                where, skip, take: limit,
                include: { guest: { select: { id: true, firstName: true, lastName: true, email: true } }, room: true },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.roomBooking.count({ where }),
        ]);
        return { bookings, total, page, limit };
    }
    async findMyBookings(guestId) {
        return this.prisma.roomBooking.findMany({
            where: { guestId },
            include: { room: true, invoiceItems: true, payment: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id) {
        const b = await this.prisma.roomBooking.findUnique({
            where: { id },
            include: {
                guest: { select: { id: true, firstName: true, lastName: true, email: true } },
                room: true,
                invoiceItems: true,
                payment: true,
                serviceRequests: true,
            },
        });
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        return b;
    }
    async cancel(id, guestId) {
        const booking = await this.findById(id);
        if (guestId && booking.guestId !== guestId)
            throw new common_1.BadRequestException('Cannot cancel another guest\'s booking');
        if (['CHECKED_IN', 'CHECKED_OUT'].includes(booking.bookingStatus))
            throw new common_1.BadRequestException('Cannot cancel an active or completed booking');
        await this.prisma.roomBooking.update({
            where: { id },
            data: { bookingStatus: 'CANCELLED' },
        });
        await this.notifications.dispatch('BOOKING_CANCELLED', booking.guestId, 'Your booking has been cancelled.', client_1.NotificationType.BOOKING_CANCELLED);
    }
    async checkIn(id, receptionistId) {
        const booking = await this.findById(id);
        if (booking.bookingStatus !== 'CONFIRMED')
            throw new common_1.BadRequestException('Booking must be CONFIRMED before check-in');
        const barcode = `KEY-${booking.room.roomNumber}-${Date.now()}`;
        const [updatedBooking, key] = await this.prisma.$transaction([
            this.prisma.roomBooking.update({
                where: { id }, data: { bookingStatus: 'CHECKED_IN' },
            }),
            this.prisma.roomKey.create({
                data: {
                    roomId: booking.roomId, barcode,
                    isActive: true, issuedAt: new Date(),
                },
            }),
            this.prisma.room.update({
                where: { id: booking.roomId },
                data: { status: 'OCCUPIED' },
            }),
        ]);
        await this.prisma.auditLog.create({
            data: {
                actorId: receptionistId, actorRole: 'RECEPTIONIST',
                action: 'CHECK_IN', entity: 'room_bookings', entityId: id,
            },
        });
        return { booking: updatedBooking, roomKey: key };
    }
    async checkOut(id, receptionistId) {
        const booking = await this.findById(id);
        if (booking.bookingStatus !== 'CHECKED_IN')
            throw new common_1.BadRequestException('Booking must be CHECKED_IN for check-out');
        await this.prisma.$transaction([
            this.prisma.roomBooking.update({
                where: { id }, data: { bookingStatus: 'CHECKED_OUT' },
            }),
            this.prisma.roomKey.updateMany({
                where: { roomId: booking.roomId, isActive: true },
                data: { isActive: false },
            }),
            this.prisma.room.update({
                where: { id: booking.roomId },
                data: { status: 'CLEANING' },
            }),
        ]);
        await this.prisma.auditLog.create({
            data: {
                actorId: receptionistId, actorRole: 'RECEPTIONIST',
                action: 'CHECK_OUT', entity: 'room_bookings', entityId: id,
            },
        });
        await this.notifications.dispatch('CHECK_OUT_REMINDER', booking.guestId, 'Thank you for staying with us. Your invoice is ready.', client_1.NotificationType.PAYMENT_RECEIPT);
        const items = await this.prisma.invoiceItem.findMany({ where: { bookingId: id } });
        return { booking, invoice: items };
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], BookingsService);
const common_2 = require("@nestjs/common");
const auth_guards_1 = require("../auth/auth.guards");
const auth_guards_2 = require("../auth/auth.guards");
const index_1 = require("../common/decorators/index");
const index_2 = require("../common/decorators/index");
let BookingsController = class BookingsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(body, user) {
        const staffId = user.role !== 'GUEST' ? user.id : undefined;
        return this.svc.create(user.id, body.roomId, body.checkInDate, body.checkOutDate, staffId);
    }
    findAll(q) {
        return this.svc.findAll(q);
    }
    myBookings(user) {
        return this.svc.findMyBookings(user.id);
    }
    findOne(id) {
        return this.svc.findById(id);
    }
    cancel(id, user) {
        const guestId = user.role === 'GUEST' ? user.id : undefined;
        return this.svc.cancel(id, guestId);
    }
    checkIn(id, user) {
        return this.svc.checkIn(id, user.id);
    }
    checkOut(id, user) {
        return this.svc.checkOut(id, user.id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_2.Post)(),
    __param(0, (0, common_2.Body)()),
    __param(1, (0, index_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_2.Get)(),
    (0, common_2.UseGuards)(auth_guards_2.RolesGuard),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER'),
    __param(0, (0, common_2.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findAll", null);
__decorate([
    (0, common_2.Get)('my'),
    __param(0, (0, index_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "myBookings", null);
__decorate([
    (0, common_2.Get)(':id'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findOne", null);
__decorate([
    (0, common_2.Patch)(':id/cancel'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, index_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "cancel", null);
__decorate([
    (0, common_2.Patch)(':id/checkin'),
    (0, common_2.UseGuards)(auth_guards_2.RolesGuard),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, index_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "checkIn", null);
__decorate([
    (0, common_2.Patch)(':id/checkout'),
    (0, common_2.UseGuards)(auth_guards_2.RolesGuard),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, index_2.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "checkOut", null);
exports.BookingsController = BookingsController = __decorate([
    (0, common_2.Controller)('api/v1/bookings'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard),
    __metadata("design:paramtypes", [BookingsService])
], BookingsController);
const common_3 = require("@nestjs/common");
const notifications_module_1 = require("../notifications/notifications.module");
let BookingsModule = class BookingsModule {
};
exports.BookingsModule = BookingsModule;
exports.BookingsModule = BookingsModule = __decorate([
    (0, common_3.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [BookingsController],
        providers: [BookingsService],
        exports: [BookingsService],
    })
], BookingsModule);
//# sourceMappingURL=bookings.module.js.map