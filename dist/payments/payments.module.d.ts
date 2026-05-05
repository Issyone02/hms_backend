import { PrismaService } from '../common/prisma/prisma.service';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    createPayment(bookingId: string, method: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
    getPayment(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
    refund(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
    getInvoice(bookingId: string): Promise<{
        items: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
    }>;
}
export declare class PaymentsController {
    private svc;
    constructor(svc: PaymentsService);
    getInvoice(id: string): Promise<{
        items: {
            id: string;
            bookingId: string;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            chargeDate: Date;
            category: import(".prisma/client").$Enums.ChargeCategory;
        }[];
        subtotal: number;
        tax: number;
        discount: number;
        total: number;
    }>;
    createPayment(bookingId: string, method: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
    getPayment(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
    refund(id: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        gatewayRef: string | null;
        method: import(".prisma/client").$Enums.PaymentMethod;
        paidAt: Date | null;
    }>;
}
export declare class PaymentsModule {
}
