// src/rooms/dto/rooms.dto.ts
import {
  IsString, IsEnum, IsNumber, IsOptional,
  IsDateString, Min, MaxLength,
} from 'class-validator';
import { RoomType, RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @IsString() @MaxLength(10) roomNumber: string;
  @IsEnum(RoomType)           style: RoomType;
  @IsNumber() @Min(0)         pricePerNight: number;
  @IsNumber() @Min(1)         capacity: number;
  @IsString()                 hotelId: string;
}

export class UpdateRoomDto {
  @IsOptional() @IsNumber() @Min(0) pricePerNight?: number;
  @IsOptional() @IsNumber() @Min(1) capacity?: number;
}

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus) status: RoomStatus;
}

export class SearchRoomsDto {
  @IsOptional() @IsEnum(RoomType)   type?: RoomType;
  @IsOptional() @IsDateString()     checkIn?: string;
  @IsOptional() @IsDateString()     checkOut?: string;
  @IsOptional() @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @IsNumber() @Min(1) page?: number;
  @IsOptional() @IsNumber() @Min(1) limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// src/rooms/rooms.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async searchRooms(query: SearchRoomsDto) {
   	const page  = Number(query.page  ?? 1);
	const limit = Number(query.limit ?? 50);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (query.type)     where.style = query.type;
    if (query.maxPrice) where.pricePerNight = { lte: Number(query.maxPrice)};

    // Exclude rooms with overlapping confirmed/checked-in bookings
    if (query.checkIn && query.checkOut) {
      where.bookings = {
        none: {
          bookingStatus: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkInDate:  { lt: new Date(query.checkOut) } },
            { checkOutDate: { gt: new Date(query.checkIn)  } },
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

  async findById(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async create(dto: CreateRoomDto) {
    return this.prisma.room.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findById(id);
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async updateStatus(id: string, status: string) {
    await this.findById(id);
    return this.prisma.room.update({ where: { id }, data: { status: status as any } });
  }

  async bulkUpdatePrice(style: string, pricePerNight: number) {
    const result = await this.prisma.room.updateMany({
      where: { style: style as any},
      data: {pricePerNight},
    });
    return {
      message: 'Updated ${result.count) ${style} room(s) to N${pricePerNight}/night',
      count:  result.count,
    };
  }
}

export enum RoomStyleEnum {
  STANDARD = 'STANDARD',
  DELUXE   = 'DELUXE',
  FAMILY   = 'FAMILY',
  BUSINESS = 'BUSINESS',
}

class BulkUpdatePriceDto {
  @IsEnum(RoomStyleEnum)
  style: RoomStyleEnum;

  @IsNumber()
  @Min(0)
  pricePerNight: number;
}


// ─────────────────────────────────────────────────────────────────────────────
// src/rooms/rooms.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard }        from '../auth/auth.guards';
import { RolesGuard }          from '../auth/auth.guards';
import { Roles }               from '../common/decorators/index';

@Controller('api/v1/rooms')
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @Get()
  search(@Query() query: SearchRoomsDto) {
    return this.rooms.searchRooms(query);
  }


  @Patch('bulk-price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  bulkUpdatePrice(@Body() body: BulkUpdatePriceDto) {
  return this.rooms.bulkUpdatePrice(body.style, body.pricePerNight);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rooms.findById(id);
  }


  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  create(@Body() dto: CreateRoomDto) {
    return this.rooms.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER')
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.rooms.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'RECEPTIONIST')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.rooms.updateStatus(id, dto.status);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// src/rooms/rooms.module.ts
import { Module }          from '@nestjs/common';

@Module({
  controllers: [RoomsController],
  providers:   [RoomsService],
  exports:     [RoomsService],
})
export class RoomsModule {}
