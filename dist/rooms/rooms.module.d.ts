import { RoomType, RoomStatus } from '@prisma/client';
export declare class CreateRoomDto {
    roomNumber: string;
    style: RoomType;
    pricePerNight: number;
    capacity: number;
    hotelId: string;
}
export declare class UpdateRoomDto {
    pricePerNight?: number;
    capacity?: number;
}
export declare class UpdateRoomStatusDto {
    status: RoomStatus;
}
export declare class SearchRoomsDto {
    type?: RoomType;
    checkIn?: string;
    checkOut?: string;
    maxPrice?: number;
    page?: number;
    limit?: number;
}
import { PrismaService } from '../common/prisma/prisma.service';
export declare class RoomsService {
    private prisma;
    constructor(prisma: PrismaService);
    searchRooms(query: SearchRoomsDto): Promise<{
        rooms: {
            id: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    create(dto: CreateRoomDto): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    update(id: string, dto: UpdateRoomDto): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    updateStatus(id: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
}
export declare class RoomsController {
    private rooms;
    constructor(rooms: RoomsService);
    search(query: SearchRoomsDto): Promise<{
        rooms: {
            id: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    create(dto: CreateRoomDto): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    update(id: string, dto: UpdateRoomDto): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    updateStatus(id: string, dto: UpdateRoomStatusDto): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        roomNumber: string;
        style: import(".prisma/client").$Enums.RoomType;
        pricePerNight: import("@prisma/client/runtime/library").Decimal;
        capacity: number;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
}
export declare class RoomsModule {
}
