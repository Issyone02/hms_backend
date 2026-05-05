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
exports.PaymentsModule = exports.PaymentsController = exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma/prisma.service");
const payment_context_1 = require("./strategies/payment.context");
let PaymentsService = class PaymentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPayment(bookingId, method) {
        const booking = await this.prisma.roomBooking.findUnique({
            where: { id: bookingId },
            include: { invoiceItems: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (!['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.bookingStatus))
            throw new common_1.BadRequestException('Booking is not in a payable state');
        const total = booking.invoiceItems.reduce((sum, item) => sum + Number(item.amount), 0);
        const ctx = new payment_context_1.PaymentContext();
        ctx.setMethod(method);
        const result = await ctx.execute(bookingId, total);
        const payment = await this.prisma.payment.create({
            data: {
                bookingId,
                amount: total,
                method: method,
                status: result.success ? 'COMPLETED' : 'FAILED',
                paidAt: result.success ? new Date() : null,
                gatewayRef: result.gatewayRef,
            },
        });
        return payment;
    }
    async getPayment(id) {
        const p = await this.prisma.payment.findUnique({ where: { id } });
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        return p;
    }
    async refund(id) {
        const payment = await this.getPayment(id);
        if (payment.status !== 'COMPLETED')
            throw new common_1.BadRequestException('Only completed payments can be refunded');
        const ctx = new payment_context_1.PaymentContext();
        ctx.setMethod(payment.method);
        await ctx.refund(payment.gatewayRef);
        return this.prisma.payment.update({
            where: { id },
            data: { status: 'REFUNDED' },
        });
    }
    async getInvoice(bookingId) {
        const items = await this.prisma.invoiceItem.findMany({
            where: { bookingId },
            orderBy: { chargeDate: 'asc' },
        });
        const subtotal = items
            .filter((i) => !['TAX', 'DISCOUNT'].includes(i.category))
            .reduce((s, i) => s + Number(i.amount), 0);
        const tax = items
            .filter((i) => i.category === 'TAX')
            .reduce((s, i) => s + Number(i.amount), 0);
        const discount = items
            .filter((i) => i.category === 'DISCOUNT')
            .reduce((s, i) => s + Number(i.amount), 0);
        const total = subtotal + tax - Math.abs(discount);
        return { items, subtotal, tax, discount, total };
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
const common_2 = require("@nestjs/common");
const auth_guards_1 = require("../auth/auth.guards");
const auth_guards_2 = require("../auth/auth.guards");
const index_1 = require("../common/decorators/index");
let PaymentsController = class PaymentsController {
    constructor(svc) {
        this.svc = svc;
    }
    getInvoice(id) {
        return this.svc.getInvoice(id);
    }
    createPayment(bookingId, method) {
        return this.svc.createPayment(bookingId, method);
    }
    getPayment(id) {
        return this.svc.getPayment(id);
    }
    refund(id) {
        return this.svc.refund(id);
    }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_2.Get)('bookings/:id/invoice'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getInvoice", null);
__decorate([
    (0, common_2.Post)('bookings/:id/payment'),
    __param(0, (0, common_2.Param)('id')),
    __param(1, (0, common_2.Body)('method')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "createPayment", null);
__decorate([
    (0, common_2.Get)('payments/:id'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "getPayment", null);
__decorate([
    (0, common_2.Post)('payments/:id/refund'),
    (0, common_2.UseGuards)(auth_guards_2.RolesGuard),
    (0, index_1.Roles)('MANAGER'),
    __param(0, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "refund", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_2.Controller)('api/v1'),
    (0, common_2.UseGuards)(auth_guards_1.JwtAuthGuard),
    __metadata("design:paramtypes", [PaymentsService])
], PaymentsController);
const common_3 = require("@nestjs/common");
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_3.Module)({
        controllers: [PaymentsController],
        providers: [PaymentsService],
        exports: [PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map