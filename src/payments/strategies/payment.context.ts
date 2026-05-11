// src/payments/strategies/payment.context.ts

export interface PaymentResult {
  success:    boolean;
  gatewayRef: string | null;
  note?:      string;
}

interface PaymentStrategy {
  process(bookingId: string, amount: number): Promise<PaymentResult>;
  refund(gatewayRef: string | null): Promise<boolean>;
}

// ── Credit Card ───────────────────────────────────────────────────────────────
class CreditCardStrategy implements PaymentStrategy {
  async process(bookingId: string, amount: number): Promise<PaymentResult> {
    // In production: call your payment gateway (Stripe, Flutterwave, Paystack…)
    // Raw PAN is NEVER stored; gateway returns a reference token
    const gatewayRef = `CC-${bookingId}-${Date.now()}`;
    console.log(`[GATEWAY] Credit card charge: ₦${amount} — ref: ${gatewayRef}`);
    return { success: true, gatewayRef };
  }

  async refund(gatewayRef: string | null): Promise<boolean> {
    console.log(`[GATEWAY] Credit card refund — ref: ${gatewayRef}`);
    return true;
  }
}

// ── Cheque ────────────────────────────────────────────────────────────────────
class ChequeStrategy implements PaymentStrategy {
  async process(bookingId: string, _amount: number): Promise<PaymentResult> {
    return {
      success:    true,
      gatewayRef: null,
      note:       'Awaiting cheque clearance — status will update to COMPLETED on clearance.',
    };
  }

  async refund(_ref: string | null): Promise<boolean> {
    // Manual refund — flagged for Manager action (extend with alert service)
    console.log('[MANUAL] Cheque refund requires Manager action');
    return true;
  }
}

// ── Cash ──────────────────────────────────────────────────────────────────────
class CashStrategy implements PaymentStrategy {
  async process(_bookingId: string, amount: number): Promise<PaymentResult> {
    console.log(`[CASH] Cash payment recorded: ₦${amount}`);
    return { success: true, gatewayRef: null };
  }

  async refund(_ref: string | null): Promise<boolean> {
    console.log('[MANUAL] Cash refund requires Manager action');
    return true;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
export class PaymentContext {
  private strategy!: PaymentStrategy;

  setMethod(method: string): void {
    const map: Record<string, PaymentStrategy> = {
      CREDIT_CARD: new CreditCardStrategy(),
      CHEQUE:      new ChequeStrategy(),
      CASH:        new CashStrategy(),
    };
    this.strategy = map[method];
    if (!this.strategy) throw new Error(`Unknown payment method: ${method}`);
  }

  execute(bookingId: string, amount: number): Promise<PaymentResult> {
    return this.strategy.process(bookingId, amount);
  }

  refund(gatewayRef: string | null): Promise<boolean> {
    return this.strategy.refund(gatewayRef);
  }
}
