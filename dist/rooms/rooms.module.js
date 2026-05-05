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
exports.RoomsModule = exports.RoomsController = exports.RoomsService = exports.SearchRoomsDto = exports.UpdateRoomStatusDto = exports.UpdateRoomDto = exports.CreateRoomDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateRoomDto {
}
exports.CreateRoomDto = CreateRoomDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "roomNumber", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RoomType),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "style", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateRoomDto.prototype, "pricePerNight", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateRoomDto.prototype, "capacity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "hotelId", void 0);
class UpdateRoomDto {
}
exports.UpdateRoomDto = UpdateRoomDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateRoomDto.prototype, "pricePerNight", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateRoomDto.prototype, "capacity", void 0);
class UpdateRoomStatusDto {
}
exports.UpdateRoomStatusDto = UpdateRoomStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.RoomStatus),
    __metadata("design:type", String)
], UpdateRoomStatusDto.prototype, "status", void 0);
class SearchRoomsDto {
}
exports.SearchRoomsDto = SearchRoomsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.RoomType),
    __metadata("design:type", String)
], SearchRoomsDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SearchRoomsDto.prototype, "checkIn", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], SearchRoomsDto.prototype, "checkOut", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], SearchRoomsDto.prototype, "maxPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SearchRoomsDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SearchRoomsDto.prototype, "limit", void 0);
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchRooms(query) {
        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);
        const skip = (page - 1) * limit;
        const where = {};
        if (query.type)
            where.style = query.type;
        if (query.maxPrice)
            where.pricePerNight = { lte: Number(query.maxPrice) };
        if (query.checkIn && query.checkOut) {
            where.bookings = {
                none: {
                    bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
                    AND: [
                        { checkInDate: { lt: new Date(query.checkOut) } },
                        { checkOutDate: { gt: new Date(query.checkIn) } },
                    ],
                },
            };
            where.status = 'AVAILABLE';
        }
        const [rooms, total] = await this.prisma.$transaction([
            this.prisma.room.findMany({
                where, skip, take: limit,
                select: {
                    id: true, roomNumber: true, style: true,
                    status: true, pricePerNight: true, capacity: true,
                },
                orderBy: { pricePerNight: 'asc' },
            }),
            this.prisma.room.count({ where }),
        ]);
        return { rooms, total, page, limit };
    }
    async findById(id) {
        const room = await this.prisma.room.findUnique({ where: { id } });
        if (!room)
            throw new common_1.NotFoundException('Room not found');
        return room;
    }
    async create(dto) {
        return this.prisma.room.create({ data: { ...dto } });
    }
    async update(id, dto) {
        await this.findById(id);
        return this.prisma.room.update({ where: { id }, data: dto });
    }
    async updateStatus(id, status) {
        await this.findById(id);
        return this.prisma.room.update({ where: { id }, data: { status: status } });
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
const common_2 = require("@nestjs/common");
const auth_guards_1 = require("../auth/auth.guards");
const auth_guards_2 = require("../auth/auth.guards");
const index_1 = require("../common/decorators/index");
let RoomsController = class RoomsController {
    constructor(rooms) {
        this.rooms = rooms;
    }
    search(query) {
        return this.rooms.searchRooms(query);
    }
    findOne(id) {
        return this.rooms.findById(id);
    }
    create(dto) {
        return this.rooms.create(dto);
    }
    update(id, dto) {
        return this.rooms.update(id, dto);
    }
    updateStatus(id, dto) {
        return this.rooms.updateStatus(id, dto.status);
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_2.Get)(),
    __param(0, (0, common_2.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SearchRoomsDto]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "search", null);
__decorate([
    (0, common_2.Get)(':id'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "findOne", null);
__decorate([
    (0, common_2.Post)(),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_2.RolesGuard),
    (0, index_1.Roles)('MANAGER'),
    __param(0, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateRoomDto]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_2.Patch)(':id'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_2.RolesGuard),
    (0, index_1.Roles)('MANAGER'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateRoomDto]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "update", null);
__decorate([
    (0, common_2.Patch)(':id/status'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard, auth_guards_2.RolesGuard),
    (0, index_1.Roles)('MANAGER', 'RECEPTIONIST'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateRoomStatusDto]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "updateStatus", null);
exports.RoomsController = RoomsController = __decorate([
    (0, common_2.Controller)('api/v1/rooms'),
    __metadata("design:paramtypes", [RoomsService])
], RoomsController);
const common_3 = require("@nestjs/common");
let RoomsModule = class RoomsModule {
};
exports.RoomsModule = RoomsModule;
exports.RoomsModule = RoomsModule = __decorate([
    (0, common_3.Module)({
        controllers: [RoomsController],
        providers: [RoomsService],
        exports: [RoomsService],
    })
], RoomsModule);
//# sourceMappingURL=rooms.module.js.map