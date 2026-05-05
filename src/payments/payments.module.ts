// src/payments/payments.service.ts
import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService }  from '../common/prisma/prisma.service';
import { PaymentContext } from './strategies/payment.context';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async createPayment(bookingId: string, method: string) {
    const booking = await this.prisma.roomBooking.findUnique({
      where:   { id: bookingId },
      include: { invoiceItems: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (!['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.bookingStatus))
      throw new BadRequestException('Booking is not in a payable state');

    const total = booking.invoiceItems.reduce(
      (sum, item) => sum + Number(item.amount), 0,
    );

    const ctx = new PaymentContext();
    ctx.setMethod(method);
    const result = await ctx.execute(bookingId, total);

    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        amount:     total,
        method:     method as any,
        status:     result.success ? 'COMPLETED' : 'FAILED',
        paidAt:     result.success ? new Date() : null,
        gatewayRef: result.gatewayRef,
      },
    });
    return payment;
  }

  async getPayment(id: string) {
    const p = await this.prisma.payment.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  async refund(id: string) {
    const payment = await this.getPayment(id);
    if (payment.status !== 'COMPLETED')
      throw new BadRequestException('Only completed payments can be refunded');

    const ctx = new PaymentContext();
    ctx.setMethod(payment.method);
    await ctx.refund(payment.gatewayRef);

    return this.prisma.payment.update({
      where: { id },
      data:  { status: 'REFUNDED' },
    });
  }

  async getInvoice(bookingId: string) {
    const items = await this.prisma.invoiceItem.findMany({
      where: { bookingId },
      orderBy: { chargeDate: 'asc' },
    });
    const subtotal = items
      .filter((i) => !['TAX', 'DISCOUNT'].includes(i.category))
      .reduce((s, i) => s + Number(i.amount), 0);
    const tax      = items
      .filter((i) => i.category === 'TAX')
      .reduce((s, i) => s + Number(i.amount), 0);
    const discount = items
      .filter((i) => i.category === 'DISCOUNT')
      .reduce((s, i) => s + Number(i.amount), 0);
    const total = subtotal + tax - Math.abs(discount);
    return { items, subtotal, tax, discount, total };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/payments/payments.controller.ts
import {
  Controller, Get, Post, Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guards';
import { RolesGuard }   from '../auth/auth.guards';
import { Roles }        from '../common/decorators/index';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('bookings/:id/invoice')
  getInvoice(@Param('id') id: string) {
    return this.svc.getInvoice(id);
  }

  @Post('bookings/:id/payment')
  createPayment(
    @Param('id') bookingId: string,
    @Body('method') method: string,
  ) {
    return this.svc.createPayment(bookingId, method);
  }

  @Get('payments/:id')
  getPayment(@Param('id') id: string) {
    return this.svc.getPayment(id);
  }

  @Post('payments/:id/refund')
  @UseGuards(RolesGuard)
  @Roles('MANAGER')
  refund(@Param('id') id: string) {
    return this.svc.refund(id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/payments/payments.module.ts
import { Module } from '@nestjs/common';

@Module({
  controllers: [PaymentsController],
  providers:   [PaymentsService],
  exports:     [PaymentsService],
})
export class PaymentsModule {}
