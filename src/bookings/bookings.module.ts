// src/bookings/bookings.service.ts
import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService }        from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType }     from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma:         PrismaService,
    private notifications:  NotificationsService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(
    guestId: string,
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    createdById?: string,
  ) {
    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn)
      throw new BadRequestException('Check-out must be after check-in');
    if (checkIn < new Date())
      throw new BadRequestException('Check-in date cannot be in the past');

    // Verify room availability
    const conflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId,
        bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
        AND: [
          { checkInDate:  { lt: checkOut } },
          { checkOutDate: { gt: checkIn  } },
        ],
      },
    });
    if (conflict) throw new ConflictException('Room is not available for these dates');

    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'AVAILABLE')
      throw new BadRequestException(`Room is currently ${room.status}`);

    // Create booking (PENDING → auto-confirm)
    const booking = await this.prisma.roomBooking.create({
      data: {
        guestId, roomId, checkInDate: checkIn, checkOutDate: checkOut,
        bookingStatus: 'PENDING', createdById,
      },
      include: { guest: true, room: true },
    });

    // Confirm and generate invoice items
    await this.confirm(booking.id, booking.guestId, booking.room.pricePerNight, checkIn, checkOut, booking.room.roomNumber);
    return this.findById(booking.id);
  }

  private async confirm(
    bookingId: string, guestId: string,
    pricePerNight: any, checkIn: Date, checkOut: Date,
    roomNumber: string,
  ) {
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);
    const roomRate = Number(pricePerNight) * nights;
    const hotelTaxRate = 0.20; // default 20%; load from hotel config in production
    const tax = parseFloat((roomRate * hotelTaxRate).toFixed(2));

    await this.prisma.$transaction([
      this.prisma.roomBooking.update({
        where: { id: bookingId },
        data:  { bookingStatus: 'CONFIRMED' },
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

    await this.notifications.dispatch(
      'BOOKING_CONFIRMED', guestId,
      `Your booking has been confirmed. Check-in: ${checkIn.toDateString()}.`,
      NotificationType.BOOKING_CONFIRMED,
    );
  }

  // ── Find all (receptionist/manager) ────────────────────────────────────────
  async findAll(filters: {
    guestId?: string; status?: string; page?: number; limit?: number;
  }) {
    const page  = Number(filters.page  ?? 1);
    const limit = Number(filters.limit ?? 20);
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (filters.guestId) where.guestId       = filters.guestId;
    if (filters.status)  where.bookingStatus  = filters.status;

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

  // ── Find mine (guest) ───────────────────────────────────────────────────────
  async findMyBookings(guestId: string) {
    return this.prisma.roomBooking.findMany({
      where:   { guestId },
      include: { room: true, invoiceItems: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Find by ID ──────────────────────────────────────────────────────────────
  async findById(id: string) {
    const b = await this.prisma.roomBooking.findUnique({
      where:   { id },
      include: {
        guest:           { select: { id: true, firstName: true, lastName: true, email: true } },
        room:            true,
        invoiceItems:    true,
        payment:         true,
        serviceRequests: true,
      },
    });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  // ── Cancel ──────────────────────────────────────────────────────────────────
  async cancel(id: string, guestId?: string) {
    const booking = await this.findById(id);

    if (guestId && booking.guestId !== guestId)
      throw new BadRequestException('Cannot cancel another guest\'s booking');

    if (['CHECKED_IN', 'CHECKED_OUT'].includes(booking.bookingStatus))
      throw new BadRequestException('Cannot cancel an active or completed booking');

    await this.prisma.roomBooking.update({
      where: { id },
      data:  { bookingStatus: 'CANCELLED' },
    });

    await this.notifications.dispatch(
      'BOOKING_CANCELLED', booking.guestId,
      'Your booking has been cancelled.',
      NotificationType.BOOKING_CANCELLED,
    );
  }

  // ── Check-In ────────────────────────────────────────────────────────────────
  async checkIn(id: string, receptionistId: string) {
    const booking = await this.findById(id);
    if (booking.bookingStatus !== 'CONFIRMED')
      throw new BadRequestException('Booking must be CONFIRMED before check-in');

    // Issue a room key
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
        data:  { status: 'OCCUPIED' },
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

  // ── Check-Out ───────────────────────────────────────────────────────────────
  async checkOut(id: string, receptionistId: string) {
    const booking = await this.findById(id);
    if (booking.bookingStatus !== 'CHECKED_IN')
      throw new BadRequestException('Booking must be CHECKED_IN for check-out');

    await this.prisma.$transaction([
      this.prisma.roomBooking.update({
        where: { id }, data: { bookingStatus: 'CHECKED_OUT' },
      }),
      this.prisma.roomKey.updateMany({
        where: { roomId: booking.roomId, isActive: true },
        data:  { isActive: false },
      }),
      this.prisma.room.update({
        where: { id: booking.roomId },
        data:  { status: 'CLEANING' },
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        actorId: receptionistId, actorRole: 'RECEPTIONIST',
        action: 'CHECK_OUT', entity: 'room_bookings', entityId: id,
      },
    });

    await this.notifications.dispatch(
      'CHECK_OUT_REMINDER', booking.guestId,
      'Thank you for staying with us. Your invoice is ready.',
      NotificationType.PAYMENT_RECEIPT,
    );

    // Return invoice summary
    const items = await this.prisma.invoiceItem.findMany({ where: { bookingId: id } });
    return { booking, invoice: items };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/bookings/bookings.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guards';
import { RolesGuard }   from '../auth/auth.guards';
import { Roles }        from '../common/decorators/index';
import { CurrentUser }  from '../common/decorators/index';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Post()
  create(
    @Body() body: { roomId: string; checkInDate: string; checkOutDate: string },
    @CurrentUser() user: any,
  ) {
    const staffId = user.role !== 'GUEST' ? user.id : undefined;
    return this.svc.create(user.id, body.roomId, body.checkInDate, body.checkOutDate, staffId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('RECEPTIONIST', 'MANAGER')
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Get('my')
  myBookings(@CurrentUser() user: any) {
    return this.svc.findMyBookings(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const guestId = user.role === 'GUEST' ? user.id : undefined;
    return this.svc.cancel(id, guestId);
  }

  @Patch(':id/checkin')
  @UseGuards(RolesGuard)
  @Roles('RECEPTIONIST', 'MANAGER')
  checkIn(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.checkIn(id, user.id);
  }

  @Patch(':id/checkout')
  @UseGuards(RolesGuard)
  @Roles('RECEPTIONIST', 'MANAGER')
  checkOut(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.checkOut(id, user.id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/bookings/bookings.module.ts
import { Module }               from '@nestjs/common';
import { NotificationsModule }  from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [BookingsController],
  providers:   [BookingsService],
  exports:     [BookingsService],
})
export class BookingsModule {}
