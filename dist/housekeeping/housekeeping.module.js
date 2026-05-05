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
exports.ServiceRequestsModule = exports.StaffModule = exports.HousekeepingModule = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const auth_guards_1 = require("../auth/auth.guards");
const auth_guards_2 = require("../auth/auth.guards");
const index_1 = require("../common/decorators/index");
let HousekeepingService = class HousekeepingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async schedule(roomId, staffId, scheduledDate) {
        const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
        if (!staff || !staff.isActive)
            throw new common_1.BadRequestException('Staff member is not active');
        const date = new Date(scheduledDate);
        const existing = await this.prisma.housekeepingLog.findUnique({
            where: { roomId_scheduledDate: { roomId, scheduledDate: date } },
        });
        if (existing)
            throw new common_1.ConflictException('Room already scheduled for this date');
        return this.prisma.housekeepingLog.create({
            data: { roomId, assignedStaffId: staffId, scheduledDate: date, status: 'PENDING' },
            include: { room: true, assignedStaff: { select: { id: true, name: true } } },
        });
    }
    async findAll(filters) {
        const where = {};
        if (filters.roomId)
            where.roomId = filters.roomId;
        if (filters.staffId)
            where.assignedStaffId = filters.staffId;
        if (filters.date)
            where.scheduledDate = new Date(filters.date);
        if (filters.status)
            where.status = filters.status;
        return this.prisma.housekeepingLog.findMany({
            where,
            include: { room: { select: { id: true, roomNumber: true } }, assignedStaff: { select: { id: true, name: true } } },
            orderBy: { scheduledDate: 'asc' },
        });
    }
    async markComplete(logId, notes) {
        const log = await this.prisma.housekeepingLog.findUnique({ where: { id: logId } });
        if (!log)
            throw new common_1.NotFoundException('Log not found');
        if (log.status === 'COMPLETED')
            throw new common_1.BadRequestException('Already completed');
        const updated = await this.prisma.housekeepingLog.update({
            where: { id: logId },
            data: { status: 'COMPLETED', completedAt: new Date(), notes: notes ?? log.notes },
        });
        const room = await this.prisma.room.findUnique({ where: { id: log.roomId } });
        if (room?.status === 'CLEANING')
            await this.prisma.room.update({ where: { id: log.roomId }, data: { status: 'AVAILABLE' } });
        return updated;
    }
    async addNotes(logId, notes) {
        return this.prisma.housekeepingLog.update({ where: { id: logId }, data: { notes } });
    }
};
HousekeepingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HousekeepingService);
let HousekeepingController = class HousekeepingController {
    constructor(svc) {
        this.svc = svc;
    }
    schedule(b) {
        return this.svc.schedule(b.roomId, b.staffId, b.scheduledDate);
    }
    findAll(q) { return this.svc.findAll(q); }
    complete(id, notes) {
        return this.svc.markComplete(id, notes);
    }
    addNotes(id, notes) {
        return this.svc.addNotes(id, notes);
    }
};
__decorate([
    (0, common_2.Post)(),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER'),
    __param(0, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HousekeepingController.prototype, "schedule", null);
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, common_2.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HousekeepingController.prototype, "findAll", null);
__decorate([
    (0, common_2.Patch)(':id/complete'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HousekeepingController.prototype, "complete", null);
__decorate([
    (0, common_2.Patch)(':id/notes'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HousekeepingController.prototype, "addNotes", null);
HousekeepingController = __decorate([
    (0, common_2.Controller)('api/v1/housekeeping'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_2.RolesGuard),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER', 'HOUSEKEEPING'),
    __metadata("design:paramtypes", [HousekeepingService])
], HousekeepingController);
let HousekeepingModule = class HousekeepingModule {
};
exports.HousekeepingModule = HousekeepingModule;
exports.HousekeepingModule = HousekeepingModule = __decorate([
    (0, common_2.Module)({
        controllers: [HousekeepingController],
        providers: [HousekeepingService],
    })
], HousekeepingModule);
const bcrypt = require("bcrypt");
let StaffService = class StaffService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const exists = await this.prisma.staff.findUnique({ where: { email: dto.email.toLowerCase() } });
        if (exists)
            throw new common_1.ConflictException('Email already in use');
        const hash = await bcrypt.hash(dto.password, 12);
        return this.prisma.staff.create({
            data: {
                hotelId: dto.hotelId, name: dto.name,
                email: dto.email.toLowerCase(), passwordHash: hash,
                role: dto.role, hiredDate: new Date(dto.hiredDate),
            },
            select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
        });
    }
    async findAll(filters) {
        const page = Number(filters.page ?? 1);
        const limit = Number(filters.limit ?? 20);
        const where = {};
        if (filters.role)
            where.role = filters.role;
        if (filters.isActive !== undefined)
            where.isActive = filters.isActive === 'true';
        const [staff, total] = await this.prisma.$transaction([
            this.prisma.staff.findMany({
                where, skip: (page - 1) * limit, take: limit,
                select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
            }),
            this.prisma.staff.count({ where }),
        ]);
        return { staff, total, page, limit };
    }
    async findById(id) {
        const s = await this.prisma.staff.findUnique({
            where: { id },
            select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
        });
        if (!s)
            throw new common_1.NotFoundException('Staff not found');
        return s;
    }
    async update(id, dto) {
        return this.prisma.staff.update({
            where: { id },
            data: { isActive: dto.isActive, role: dto.role },
            select: { id: true, name: true, role: true, email: true, isActive: true },
        });
    }
};
StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
let StaffController = class StaffController {
    constructor(svc) {
        this.svc = svc;
    }
    create(dto) { return this.svc.create(dto); }
    findAll(q) { return this.svc.findAll(q); }
    findOne(id) { return this.svc.findById(id); }
    update(id, dto) { return this.svc.update(id, dto); }
};
__decorate([
    (0, common_2.Post)(),
    __param(0, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "create", null);
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, common_2.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "findAll", null);
__decorate([
    (0, common_2.Get)(':id'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "findOne", null);
__decorate([
    (0, common_2.Patch)(':id'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StaffController.prototype, "update", null);
StaffController = __decorate([
    (0, common_2.Controller)('api/v1/staff'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_2.RolesGuard),
    (0, index_1.Roles)('MANAGER'),
    __metadata("design:paramtypes", [StaffService])
], StaffController);
let StaffModule = class StaffModule {
};
exports.StaffModule = StaffModule;
exports.StaffModule = StaffModule = __decorate([
    (0, common_2.Module)({ controllers: [StaffController], providers: [StaffService] })
], StaffModule);
let ServiceRequestsService = class ServiceRequestsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(bookingId, guestId, serviceDetails) {
        const booking = await this.prisma.roomBooking.findUnique({ where: { id: bookingId } });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.guestId !== guestId)
            throw new common_1.BadRequestException('Not your booking');
        if (booking.bookingStatus !== 'CHECKED_IN')
            throw new common_1.BadRequestException('Room service requests require an active check-in');
        return this.prisma.roomServiceRequest.create({
            data: { bookingId, serviceDetails, status: 'PENDING' },
        });
    }
    async findByBooking(bookingId) {
        return this.prisma.roomServiceRequest.findMany({ where: { bookingId }, orderBy: { requestedAt: 'desc' } });
    }
    async updateStatus(id, status) {
        return this.prisma.roomServiceRequest.update({ where: { id }, data: { status: status } });
    }
    async cancel(id, guestId) {
        const req = await this.prisma.roomServiceRequest.findUnique({
            where: { id }, include: { booking: true },
        });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        if (req.booking.guestId !== guestId)
            throw new common_1.BadRequestException('Not your request');
        return this.prisma.roomServiceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
    }
};
ServiceRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServiceRequestsService);
let ServiceRequestsController = class ServiceRequestsController {
    constructor(svc) {
        this.svc = svc;
    }
    create(bookingId, details, user) { return this.svc.create(bookingId, user.id, details); }
    findByBooking(id) { return this.svc.findByBooking(id); }
    updateStatus(id, status) {
        return this.svc.updateStatus(id, status);
    }
    cancel(id, user) {
        return this.svc.cancel(id, user.id);
    }
};
__decorate([
    (0, common_2.Post)('bookings/:id/service-requests'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)('serviceDetails')),
    __param(2, (0, index_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ServiceRequestsController.prototype, "create", null);
__decorate([
    (0, common_2.Get)('bookings/:id/service-requests'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ServiceRequestsController.prototype, "findByBooking", null);
__decorate([
    (0, common_2.Patch)('service-requests/:id/status'),
    (0, common_2.UseGuards)(auth_guards_2.RolesGuard),
    (0, index_1.Roles)('RECEPTIONIST', 'MANAGER'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ServiceRequestsController.prototype, "updateStatus", null);
__decorate([
    (0, common_2.Patch)('service-requests/:id/cancel'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, index_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ServiceRequestsController.prototype, "cancel", null);
ServiceRequestsController = __decorate([
    (0, common_2.Controller)('api/v1'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ServiceRequestsService])
], ServiceRequestsController);
let ServiceRequestsModule = class ServiceRequestsModule {
};
exports.ServiceRequestsModule = ServiceRequestsModule;
exports.ServiceRequestsModule = ServiceRequestsModule = __decorate([
    (0, common_2.Module)({ controllers: [ServiceRequestsController], providers: [ServiceRequestsService] })
], ServiceRequestsModule);
//# sourceMappingURL=housekeeping.module.js.map