export interface PaymentResult {
    success: boolean;
    gatewayRef: string | null;
    note?: string;
}
export declare class PaymentContext {
    private strategy;
    setMethod(method: string): void;
    execute(bookingId: string, amount: number): Promise<PaymentResult>;
    refund(gatewayRef: string | null): Promise<boolean>;
}
