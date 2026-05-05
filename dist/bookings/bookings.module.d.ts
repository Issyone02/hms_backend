import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class BookingsService {
    private prisma;
    private notifications;
    constructor(prisma: PrismaService, notifications: NotificationsService);
    create(guestId: string, roomId: string, checkInDate: string, checkOutDate: string, createdById?: string): Promise<{
        guest: {
            firstName: string;
            lastName: string;
            email: string;
            id: string;
        };
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        serviceRequests: {
            id: string;
            status: import(".prisma/client").$Enums.ServiceStatus;
            bookingId: string;
            serviceDetails: string;
            requestedAt: Date;
        }[];
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    }>;
    private confirm;
    findAll(filters: {
        guestId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        bookings: ({
            guest: {
                firstName: string;
                lastName: string;
                email: string;
                id: string;
            };
            room: {
                id: string;
                createdAt: Date;
                hotelId: string;
                roomNumber: string;
                style: import(".prisma/client").$Enums.RoomType;
                pricePerNight: import("@prisma/client/runtime/library").Decimal;
                capacity: number;
                status: import(".prisma/client").$Enums.RoomStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    findMyBookings(guestId: string): Promise<({
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    })[]>;
    findById(id: string): Promise<{
        guest: {
            firstName: string;
            lastName: string;
            email: string;
            id: string;
        };
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        serviceRequests: {
            id: string;
            status: import(".prisma/client").$Enums.ServiceStatus;
            bookingId: string;
            serviceDetails: string;
            requestedAt: Date;
        }[];
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    }>;
    cancel(id: string, guestId?: string): Promise<void>;
    checkIn(id: string, receptionistId: string): Promise<{
        booking: {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        };
        roomKey: {
            id: string;
            isActive: boolean;
            roomId: string;
            barcode: string;
            issuedAt: Date | null;
        };
    }>;
    checkOut(id: string, receptionistId: string): Promise<{
        booking: {
            guest: {
                firstName: string;
                lastName: string;
                email: string;
                id: string;
            };
            room: {
                id: string;
                createdAt: Date;
                hotelId: string;
                roomNumber: string;
                style: import(".prisma/client").$Enums.RoomType;
                pricePerNight: import("@prisma/client/runtime/library").Decimal;
                capacity: number;
                status: import(".prisma/client").$Enums.RoomStatus;
            };
            payment: {
                id: string;
                status: import(".prisma/client").$Enums.PaymentStatus;
                bookingId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                gatewayRef: string | null;
                method: import(".prisma/client").$Enums.PaymentMethod;
                paidAt: Date | null;
            } | null;
            serviceRequests: {
                id: string;
                status: import(".prisma/client").$Enums.ServiceStatus;
                bookingId: string;
                serviceDetails: string;
                requestedAt: Date;
            }[];
            invoiceItems: {
                id: string;
                bookingId: string;
                description: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                chargeDate: Date;
                category: import(".prisma/client").$Enums.ChargeCategory;
            }[];
        } & {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        };
        invoice: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    }>;
}
export declare class BookingsController {
    private svc;
    constructor(svc: BookingsService);
    create(body: {
        roomId: string;
        checkInDate: string;
        checkOutDate: string;
    }, user: any): Promise<{
        guest: {
            firstName: string;
            lastName: string;
            email: string;
            id: string;
        };
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        serviceRequests: {
            id: string;
            status: import(".prisma/client").$Enums.ServiceStatus;
            bookingId: string;
            serviceDetails: string;
            requestedAt: Date;
        }[];
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    }>;
    findAll(q: any): Promise<{
        bookings: ({
            guest: {
                firstName: string;
                lastName: string;
                email: string;
                id: string;
            };
            room: {
                id: string;
                createdAt: Date;
                hotelId: string;
                roomNumber: string;
                style: import(".prisma/client").$Enums.RoomType;
                pricePerNight: import("@prisma/client/runtime/library").Decimal;
                capacity: number;
                status: import(".prisma/client").$Enums.RoomStatus;
            };
        } & {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    myBookings(user: any): Promise<({
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        guest: {
            firstName: string;
            lastName: string;
            email: string;
            id: string;
        };
        room: {
            id: string;
            createdAt: Date;
            hotelId: string;
            roomNumber: string;
            style: import(".prisma/client").$Enums.RoomType;
            pricePerNight: import("@prisma/client/runtime/library").Decimal;
            capacity: number;
            status: import(".prisma/client").$Enums.RoomStatus;
        };
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            gatewayRef: string | null;
            method: import(".prisma/client").$Enums.PaymentMethod;
            paidAt: Date | null;
        } | null;
        serviceRequests: {
            id: string;
            status: import(".prisma/client").$Enums.ServiceStatus;
            bookingId: string;
            serviceDetails: string;
            requestedAt: Date;
        }[];
        invoiceItems: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    } & {
        id: string;
        createdAt: Date;
        checkOutDate: Date;
        checkInDate: Date;
        guestId: string;
        roomId: string;
        bookingStatus: import(".prisma/client").$Enums.BookingStatus;
        createdById: string | null;
        updatedAt: Date;
    }>;
    cancel(id: string, user: any): Promise<void>;
    checkIn(id: string, user: any): Promise<{
        booking: {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        };
        roomKey: {
            id: string;
            isActive: boolean;
            roomId: string;
            barcode: string;
            issuedAt: Date | null;
        };
    }>;
    checkOut(id: string, user: any): Promise<{
        booking: {
            guest: {
                firstName: string;
                lastName: string;
                email: string;
                id: string;
            };
            room: {
                id: string;
                createdAt: Date;
                hotelId: string;
                roomNumber: string;
                style: import(".prisma/client").$Enums.RoomType;
                pricePerNight: import("@prisma/client/runtime/library").Decimal;
                capacity: number;
                status: import(".prisma/client").$Enums.RoomStatus;
            };
            payment: {
                id: string;
                status: import(".prisma/client").$Enums.PaymentStatus;
                bookingId: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                gatewayRef: string | null;
                method: import(".prisma/client").$Enums.PaymentMethod;
                paidAt: Date | null;
            } | null;
            serviceRequests: {
                id: string;
                status: import(".prisma/client").$Enums.ServiceStatus;
                bookingId: string;
                serviceDetails: string;
                requestedAt: Date;
            }[];
            invoiceItems: {
                id: string;
                bookingId: string;
                description: string;
                amount: import("@prisma/client/runtime/library").Decimal;
                chargeDate: Date;
                category: import(".prisma/client").$Enums.ChargeCategory;
            }[];
        } & {
            id: string;
            createdAt: Date;
            checkOutDate: Date;
            checkInDate: Date;
            guestId: string;
            roomId: string;
            bookingStatus: import(".prisma/client").$Enums.BookingStatus;
            createdById: string | null;
            updatedAt: Date;
        };
        invoice: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
    }>;
}
export declare class BookingsModule {
}
