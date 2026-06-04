// ─────────────────────────────────────────────────────────────────────────────
// src/bookings/bookings.module.ts  (corrected)
// ─────────────────────────────────────────────────────────────────────────────
import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Module, Controller, Get, Post,
  Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PrismaService }        from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsModule }  from '../notifications/notifications.module';
import { EmailService }         from '../email/email.service';
import { EmailModule }          from '../email/email.module';
import { JwtAuthGuard }         from '../auth/auth.guards';
import { RolesGuard }           from '../auth/auth.guards';
import { Roles }                from '../common/decorators/index';
import { CurrentUser }          from '../common/decorators/index';
import { NotificationType, PaymentMethod, BookingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────
@Injectable()
export class BookingsService {
  constructor(
    private prisma:        PrismaService,
    private notifications: NotificationsService,
    private email:         EmailService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────
  async create(
    guestId:      string,
    roomId:       string,
    checkInDate:  string,
    checkOutDate: string,
    createdById?: string,
  ) {
    const checkIn  = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn)
      throw new BadRequestException('Check-out must be after check-in');
    if (checkIn < new Date())
      throw new BadRequestException('Check-in date cannot be in the past');

    // Check availability (including PENDING bookings to avoid double-booking)
    const conflict = await this.prisma.roomBooking.findFirst({
      where: {
        roomId,
        bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] },
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

    const guest = await this.prisma.guest.findUnique({ where: { id: guestId } });
    if (!guest) throw new NotFoundException('Guest not found');

    // Create booking
    const booking = await this.prisma.roomBooking.create({
      data: {
        guestId, roomId, checkInDate: checkIn, checkOutDate: checkOut,
        bookingStatus: 'PENDING', createdById,
      },
      include: { guest: true, room: true },
    });

    // Confirm and generate invoice
    await this.confirm(
      booking.id, guestId,
      room.pricePerNight, checkIn, checkOut,
      room.roomNumber,
    );

    // Send confirmation email (now with 20% VAT)
    if (guest.email) {
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / 86400000
      );
      const subtotal    = Number(room.pricePerNight) * nights;
      const tax         = subtotal * 0.20;   // 20% VAT – consistent with invoice
      const totalAmount = subtotal + tax;
      const bookingRef  = `GIH-${booking.id.slice(0, 8).toUpperCase()}`;

      await this.email.sendBookingConfirmation({
        guestName:   `${guest.firstName} ${guest.lastName}`,
        guestEmail:  guest.email,
        bookingRef,
        roomNumber:  room.roomNumber,
        roomType:    room.style,
        checkIn:     checkIn.toDateString(),
        checkOut:    checkOut.toDateString(),
        nights,
        totalAmount,
        hotelName:   'Grand Issyone Hotel',
      });
    }

    return this.findById(booking.id);
  }

  // ── Confirm (internal) ──────────────────────────────────────────────────────
  private async confirm(
    bookingId:      string,
    guestId:        string,
    pricePerNight:  Decimal | number,
    checkIn:        Date,
    checkOut:       Date,
    roomNumber:     string,
  ) {
    const nights      = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / 86400000
    );
    const roomRate    = Number(pricePerNight) * nights;
    const taxRate     = 0.20;   // 20% VAT
    const tax         = parseFloat((roomRate * taxRate).toFixed(2));

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
          description: `VAT (${(taxRate * 100).toFixed(0)}%)`,
          amount: tax,
        },
      }),
    ]);

    // In-app notification
    await this.notifications.dispatch(
      'BOOKING_CONFIRMED', guestId,
      `Your booking has been confirmed. Check-in: ${checkIn.toDateString()}.`,
      NotificationType.BOOKING_CONFIRMED,
    );
  }

  // ── Find All (staff only) ──────────────────────────────────────────────────
  async findAll(filters: {
    guestId?: string; status?: string; page?: number; limit?: number;
  }) {
    const page  = Number(filters.page  ?? 1);
    const limit = Number(filters.limit ?? 20);
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (filters.guestId) where.guestId      = filters.guestId;
    if (filters.status)  where.bookingStatus = filters.status;

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.roomBooking.findMany({
        where, skip, take: limit,
        include: {
          guest:        { select: { id: true, firstName: true, lastName: true, email: true } },
          room:         true,
          payment:      true,
          invoiceItems: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.roomBooking.count({ where }),
    ]);
    return { bookings, total, page, limit };
  }

  // ── Find My Bookings ────────────────────────────────────────────────────────
  async findMyBookings(guestId: string) {
    return this.prisma.roomBooking.findMany({
      where:   { guestId },
      include: { room: true, invoiceItems: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Find By ID (with permission check in controller) ────────────────────────
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


  // ── Quick Booking (No Account Required) ────────────────────────────────────
async quickBook(data: {
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  roomId:      string;
  checkInDate: string;
  checkOutDate: string;
}) {
  const checkIn  = new Date(data.checkInDate);
  const checkOut = new Date(data.checkOutDate);

  if (checkOut <= checkIn)
    throw new BadRequestException('Check-out must be after check-in');
  if (checkIn < new Date())
    throw new BadRequestException('Check-in date cannot be in the past');

  // Check room availability
  const conflict = await this.prisma.roomBooking.findFirst({
    where: {
      roomId: data.roomId,
      bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
      AND: [
        { checkInDate:  { lt: checkOut } },
        { checkOutDate: { gt: checkIn  } },
      ],
    },
  });
  if (conflict)
    throw new ConflictException('Room is not available for these dates');

  const room = await this.prisma.room.findUnique({
    where: { id: data.roomId },
  });
  if (!room) throw new NotFoundException('Room not found');
  if (room.status !== 'AVAILABLE')
    throw new BadRequestException(`Room is currently ${room.status}`);

  // Find or create guest account
  let guest = await this.prisma.guest.findFirst({
    where: { email: data.email },
  });

  if (!guest) {
    // Create a temporary guest account
    const bcrypt = require('bcrypt');
    const tempPassword = await bcrypt.hash(
      `GIH-${Date.now()}`, 10
    );
    guest = await this.prisma.guest.create({
      data: {
        firstName:    data.firstName,
        lastName:     data.lastName,
        email:        data.email,
        phone:        data.phone,
        passwordHash: tempPassword,
        hotel:        { connect: { id: room.hotelId } },
      },
    });
  }

  // Generate booking reference
  const bookingRef = `GIH-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  // Create booking
  const booking = await this.prisma.roomBooking.create({
    data: {
      guest:    { connect: { id: guest.id } },
      room:     { connect: { id: data.roomId } },
      checkInDate:   checkIn,
      checkOutDate:  checkOut,
      bookingStatus: 'PENDING',
    },
    include: { guest: true, room: true },
  });

  // Generate invoice items
  const nights   = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / 86400000
  );
  const roomRate  = Number(room.pricePerNight) * nights;
  const tax       = parseFloat((roomRate * 0.075).toFixed(2));
  const total     = roomRate + tax;

  await this.prisma.$transaction([
    this.prisma.roomBooking.update({
      where: { id: booking.id },
      data:  { bookingStatus: 'CONFIRMED' },
    }),
    this.prisma.invoiceItem.create({
      data: {
        bookingId:   booking.id,
        category:    'ROOM_RATE',
        description: `Room ${room.roomNumber} — ${nights} night(s)`,
        amount:      roomRate,
      },
    }),
    this.prisma.invoiceItem.create({
      data: {
        bookingId:   booking.id,
        category:    'TAX',
        description: 'VAT (7.5%)',
        amount:      tax,
      },
    }),
  ]);

  // Create in-app notification
  await this.prisma.notification.create({
    data: {
      guest:    { connect: { id: guest.id } },
      type:    'BOOKING_CONFIRMED',
      title:   'Booking Confirmed! 🎉',
      message: `Room ${room.roomNumber} booked. Ref: ${bookingRef}. Check-in: ${checkIn.toDateString()}`,
      isRead:  false,
    },
  }).catch(() => {
    // Ignore errors from notification creation
  });

  // Send confirmation email
  if (data.email) {
    await this.email.sendQuickBookingConfirmation({
      guestName:   `${data.firstName} ${data.lastName}`,
      guestEmail:  data.email,
      guestPhone:  data.phone,
      bookingRef,
      roomNumber:  room.roomNumber,
      roomType:    room.style,
      checkIn:     checkIn.toDateString(),
      checkOut:    checkOut.toDateString(),
      nights,
      totalAmount: total,
      hotelName:   'Grand Issyone Hotel',
    });
  }

  return {
    success:    true,
    bookingRef,
    bookingId:  booking.id,
    guestId:    guest.id,
    room: {
      roomNumber: room.roomNumber,
      style:      room.style,
    },
    checkIn:    checkIn.toDateString(),
    checkOut:   checkOut.toDateString(),
    nights,
    total,
    message:    'Booking confirmed! Check your email for details.',
  };
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

    const barcode = `KEY-${booking.room.roomNumber}-${Date.now()}`;

    await this.prisma.$transaction([
      this.prisma.roomBooking.update({
        where: { id },
        data:  { bookingStatus: 'CHECKED_IN' },
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

    // Use the notifications service for consistency
    await this.notifications.dispatch(
      'CHECKIN', booking.guestId,
      `Welcome! You have successfully checked into Room ${booking.room.roomNumber}. Enjoy your stay!`,
      NotificationType.BOOKING_CONFIRMED, // or a custom CHECKIN type
    );

    // Email notification
    if (booking.guest?.email) {
      await this.email.sendCheckInNotification({
        guestName:  `${booking.guest.firstName} ${booking.guest.lastName}`,
        guestEmail: booking.guest.email,
        roomNumber: booking.room.roomNumber,
        checkOut:   new Date(booking.checkOutDate).toDateString(),
        hotelName:  'Grand Issyone Hotel',
      });
    }

    const updatedBooking = await this.findById(id);
    const key = await this.prisma.roomKey.findFirst({
      where: { roomId: booking.roomId, isActive: true },
      orderBy: { issuedAt: 'desc' },
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
        where: { id },
        data:  { bookingStatus: 'CHECKED_OUT' },
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
      'CHECKOUT', booking.guestId,
      'Thank you for staying at Grand Issyone Hotel! We hope to see you again.',
      NotificationType.PAYMENT_RECEIPT,
    );

    // Fetch the updated booking to return fresh data
    const updatedBooking = await this.findById(id);
    const items = await this.prisma.invoiceItem.findMany({
      where: { bookingId: id },
    });
    return { booking: updatedBooking, invoice: items };
  }

  // ── Create Payment (with double-payment prevention) ─────────────────────────
  async createPayment(bookingId: string, method: PaymentMethod) {
    const booking = await this.findById(bookingId);

    // Prevent duplicate payment
    const existingPayment = await this.prisma.payment.findFirst({
      where: { bookingId, status: 'COMPLETED' },
    });
    if (existingPayment) {
      throw new BadRequestException('This booking has already been paid.');
    }

    const items  = await this.prisma.invoiceItem.findMany({
      where: { bookingId },
    });
    const amount = items.reduce((s, i) => s + Number(i.amount), 0);

    const strategies: Record<string, any> = {
      CASH:        { process: () => ({ success: true }) },
      CREDIT_CARD: { process: () => ({ success: true }) },
      CHEQUE:      { process: () => ({ success: true }) },
    };

    const strategy = strategies[method];
    if (!strategy) throw new BadRequestException('Unsupported payment method');

    const result  = strategy.process();
    const payment = await this.prisma.payment.create({
      data: {
        bookingId,
        method,
        amount,
        status:  result.success ? 'COMPLETED' : 'FAILED',
        paidAt:  result.success ? new Date() : null,
      },
    });

    // Send receipt email (using 20% tax logic already in invoice)
    if (result.success && booking.guest?.email) {
      const nights = Math.ceil(
        (new Date(booking.checkOutDate).getTime() -
         new Date(booking.checkInDate).getTime()) / 86400000
      );
      await this.email.sendReceipt({
        guestName:  `${booking.guest.firstName} ${booking.guest.lastName}`,
        guestEmail: booking.guest.email,
        bookingRef: `GIH-${booking.id.slice(0, 8).toUpperCase()}`,
        roomNumber: booking.room.roomNumber,
        checkIn:    new Date(booking.checkInDate).toDateString(),
        checkOut:   new Date(booking.checkOutDate).toDateString(),
        nights,
        amount,
        method,
        hotelName:  'Grand Issyone Hotel',
      });
    }

    return payment;
  }

  // ── Get Invoice (no permission check – done in controller) ─────────────────
  async getInvoice(bookingId: string) {
    const items = await this.prisma.invoiceItem.findMany({
      where: { bookingId },
    });
    const total = items.reduce((s, i) => s + Number(i.amount), 0);
    return { items, total };
  }

  // ── Helper: ensure a booking belongs to a guest ─────────────────────────────
  async assertGuestOwnership(bookingId: string, guestId: string) {
    const booking = await this.findById(bookingId);
    if (booking.guestId !== guestId) {
      throw new BadRequestException('You can only access your personal bookings');
    }
    return booking;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Post()
  async create(
    @Body() body: {
      roomId: string; checkInDate: string;
      checkOutDate: string; guestId?: string;
    },
    @CurrentUser() user: any,
  ) {
    const isStaff = user.role !== 'GUEST';
    // Staff must provide a guestId; guests use their own id
    if (isStaff && !body.guestId) {
      throw new BadRequestException('guestId is required for staff bookings');
    }
    const guestId = isStaff ? body.guestId! : user.id;
    const staffId = isStaff ? user.id : undefined;
    return this.svc.create(
      guestId, body.roomId,
      body.checkInDate, body.checkOutDate,
      staffId,
    );
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

  @Get(':id/invoice')
  async getInvoice(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === 'GUEST') {
      await this.svc.assertGuestOwnership(id, user.id);
    }
    return this.svc.getInvoice(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.role === 'GUEST') {
      await this.svc.assertGuestOwnership(id, user.id);
    }
    return this.svc.findById(id);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @CurrentUser() user: any) {
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

  @Post(':id/payment')
  async createPayment(
    @Param('id') id: string,
    @Body() body: { method: PaymentMethod },
    @CurrentUser() user: any,
  ) {
    if (user.role === 'GUEST') {
      await this.svc.assertGuestOwnership(id, user.id);
    }
    return this.svc.createPayment(id, body.method);
  }


  @Post('quick')
quickBook(@Body() body: {
  firstName:    string;
  lastName:     string;
  email:        string;
  phone:        string;
  roomId:       string;
  checkInDate:  string;
  checkOutDate: string;
}) {
  return this.svc.quickBook(body);
}
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────────────────────────────────────────
@Module({
  imports:     [NotificationsModule, EmailModule],
  controllers: [BookingsController],
  providers:   [BookingsService],
  exports:     [BookingsService],
})
export class BookingsModule {}