// src/housekeeping/housekeeping.module.ts
import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { Module, Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard }  from '../auth/auth.guards';
import { RolesGuard }    from '../auth/auth.guards';
import { Roles, CurrentUser }   from '../common/decorators/index';

// ── Service ───────────────────────────────────────────────────────────────────
@Injectable()
class HousekeepingService {
  constructor(private prisma: PrismaService) {}

  async schedule(roomId: string, staffId: string, scheduledDate: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.isActive)
      throw new BadRequestException('Staff member is not active');

    const date = new Date(scheduledDate);
    const existing = await this.prisma.housekeepingLog.findUnique({
      where: { roomId_scheduledDate: { roomId, scheduledDate: date } },
    });
    if (existing) throw new ConflictException('Room already scheduled for this date');

    return this.prisma.housekeepingLog.create({
      data: { roomId, assignedStaffId: staffId, scheduledDate: date, status: 'PENDING' },
      include: { room: true, assignedStaff: { select: { id: true, name: true } } },
    });
  }

  async findAll(filters: { roomId?: string; staffId?: string; date?: string; status?: string }) {
    const where: any = {};
    if (filters.roomId)  where.roomId          = filters.roomId;
    if (filters.staffId) where.assignedStaffId = filters.staffId;
    if (filters.date)    where.scheduledDate   = new Date(filters.date);
    if (filters.status)  where.status          = filters.status;
    return this.prisma.housekeepingLog.findMany({
      where,
      include: { room: { select: { id: true, roomNumber: true } }, assignedStaff: { select: { id: true, name: true } } },
      orderBy: { scheduledDate: 'asc' },
    });
  }

  async markComplete(logId: string, notes?: string) {
    const log = await this.prisma.housekeepingLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log not found');
    if (log.status === 'COMPLETED') throw new BadRequestException('Already completed');

    const updated = await this.prisma.housekeepingLog.update({
      where: { id: logId },
      data:  { status: 'COMPLETED', completedAt: new Date(), notes: notes ?? log.notes },
    });

    // Auto-set room back to AVAILABLE if it was CLEANING
    const room = await this.prisma.room.findUnique({ where: { id: log.roomId } });
    if (room?.status === 'CLEANING')
      await this.prisma.room.update({ where: { id: log.roomId }, data: { status: 'AVAILABLE' } });

    return updated;
  }

  async addNotes(logId: string, notes: string) {
    return this.prisma.housekeepingLog.update({ where: { id: logId }, data: { notes } });
  }
}

// ── Controller ────────────────────────────────────────────────────────────────
@Controller('api/v1/housekeeping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECEPTIONIST', 'MANAGER', 'HOUSEKEEPING')
class HousekeepingController {
  constructor(private svc: HousekeepingService) {}

  @Post()
  @Roles('RECEPTIONIST', 'MANAGER')
  schedule(@Body() b: { roomId: string; staffId: string; scheduledDate: string }) {
    return this.svc.schedule(b.roomId, b.staffId, b.scheduledDate);
  }

  @Get()
  findAll(@Query() q: any) { return this.svc.findAll(q); }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.svc.markComplete(id, notes);
  }

  @Patch(':id/notes')
  addNotes(@Param('id') id: string, @Body('notes') notes: string) {
    return this.svc.addNotes(id, notes);
  }
}

@Module({
  controllers: [HousekeepingController],
  providers:   [HousekeepingService],
})
export class HousekeepingModule {}


// ═════════════════════════════════════════════════════════════════════════════
// STAFF MODULE
// ═════════════════════════════════════════════════════════════════════════════
import * as bcrypt from 'bcrypt';

@Injectable()
class StaffService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    hotelId: string; name: string; email: string;
    role: string; password: string; hiredDate: string;
  }) {
    const exists = await this.prisma.staff.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email already in use');
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.staff.create({
      data: {
        hotelId: dto.hotelId, name: dto.name,
        email: dto.email.toLowerCase(), passwordHash: hash,
        role: dto.role as any, hiredDate: new Date(dto.hiredDate),
      },
      select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
    });
  }

  async findAll(filters: { role?: string; isActive?: string; page?: number; limit?: number }) {
    const page  = Number(filters.page  ?? 1);
    const limit = Number(filters.limit ?? 20);
    const where: any = {};
    if (filters.role)     where.role     = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive === 'true';
    const [staff, total] = await this.prisma.$transaction([
      this.prisma.staff.findMany({
        where, skip: (page - 1) * limit, take: limit,
        select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
      }),
      this.prisma.staff.count({ where }),
    ]);
    return { staff, total, page, limit };
  }

  async findById(id: string) {
    const s = await this.prisma.staff.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, email: true, hiredDate: true, isActive: true },
    });
    if (!s) throw new NotFoundException('Staff not found');
    return s;
  }

  async update(id: string, dto: { isActive?: boolean; role?: string }) {
    return this.prisma.staff.update({
      where: { id },
      data:  { isActive: dto.isActive, role: dto.role as any },
      select: { id: true, name: true, role: true, email: true, isActive: true },
    });
  }
}

@Controller('api/v1/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MANAGER')
class StaffController {
  constructor(private svc: StaffService) {}
  @Post()    create(@Body() dto: any)                  { return this.svc.create(dto); }
  @Get()     findAll(@Query() q: any)                  { return this.svc.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string)         { return this.svc.findById(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: any) { return this.svc.update(id, dto); }
}

@Module({ controllers: [StaffController], providers: [StaffService] })
export class StaffModule {}


// ═════════════════════════════════════════════════════════════════════════════
// SERVICE REQUESTS MODULE
// ═════════════════════════════════════════════════════════════════════════════

@Injectable()
class ServiceRequestsService {
  constructor(private prisma: PrismaService) {}

  async create(bookingId: string, guestId: string, serviceDetails: string) {
    const booking = await this.prisma.roomBooking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId) throw new BadRequestException('Not your booking');
    if (booking.bookingStatus !== 'CHECKED_IN')
      throw new BadRequestException('Room service requests require an active check-in');

    return this.prisma.roomServiceRequest.create({
      data: { bookingId, serviceDetails, status: 'PENDING' },
    });
  }

  async findByBooking(bookingId: string) {
    return this.prisma.roomServiceRequest.findMany({ where: { bookingId }, orderBy: { requestedAt: 'desc' } });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.roomServiceRequest.update({ where: { id }, data: { status: status as any } });
  }

  async cancel(id: string, guestId: string) {
    const req = await this.prisma.roomServiceRequest.findUnique({
      where: { id }, include: { booking: true },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (req.booking.guestId !== guestId) throw new BadRequestException('Not your request');
    return this.prisma.roomServiceRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }
}

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
class ServiceRequestsController {
  constructor(private svc: ServiceRequestsService) {}

  @Post('bookings/:id/service-requests')
  create(
    @Param('id') bookingId: string,
    @Body('serviceDetails') details: string,
    @CurrentUser() user: any,
  ) { return this.svc.create(bookingId, user.id, details); }

  @Get('bookings/:id/service-requests')
  findByBooking(@Param('id') id: string) { return this.svc.findByBooking(id); }

  @Patch('service-requests/:id/status')
  @UseGuards(RolesGuard)
  @Roles('RECEPTIONIST', 'MANAGER')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.svc.updateStatus(id, status);
  }

  @Patch('service-requests/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.cancel(id, user.id);
  }
}

@Module({ controllers: [ServiceRequestsController], providers: [ServiceRequestsService] })
export class ServiceRequestsModule {}
