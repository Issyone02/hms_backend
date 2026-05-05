"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentContext = void 0;
class CreditCardStrategy {
    async process(bookingId, amount) {
        const gatewayRef = `CC-${bookingId}-${Date.now()}`;
        console.log(`[GATEWAY] Credit card charge: £${amount} — ref: ${gatewayRef}`);
        return { success: true, gatewayRef };
    }
    async refund(gatewayRef) {
        console.log(`[GATEWAY] Credit card refund — ref: ${gatewayRef}`);
        return true;
    }
}
class ChequeStrategy {
    async process(bookingId, _amount) {
        return {
            success: true,
            gatewayRef: null,
            note: 'Awaiting cheque clearance — status will update to COMPLETED on clearance.',
        };
    }
    async refund(_ref) {
        console.log('[MANUAL] Cheque refund requires Manager action');
        return true;
    }
}
class CashStrategy {
    async process(_bookingId, amount) {
        console.log(`[CASH] Cash payment recorded: £${amount}`);
        return { success: true, gatewayRef: null };
    }
    async refund(_ref) {
        console.log('[MANUAL] Cash refund requires Manager action');
        return true;
    }
}
class PaymentContext {
    setMethod(method) {
        const map = {
            CREDIT_CARD: new CreditCardStrategy(),
            CHEQUE: new ChequeStrategy(),
            CASH: new CashStrategy(),
        };
        this.strategy = map[method];
        if (!this.strategy)
            throw new Error(`Unknown payment method: ${method}`);
    }
    execute(bookingId, amount) {
        return this.strategy.process(bookingId, amount);
    }
    refund(gatewayRef) {
        return this.strategy.refund(gatewayRef);
    }
}
exports.PaymentContext = PaymentContext;
//# sourceMappingURL=payment.context.js.map