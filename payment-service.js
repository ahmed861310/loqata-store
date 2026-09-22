const crypto = require('crypto');

/**
 * Payment gateway abstraction.
 * Add a real provider adapter later without changing checkout/order logic.
 */
function createPaymentService() {
  const provider = String(process.env.PAYMENT_PROVIDER || 'none').toLowerCase();
  const currency = process.env.PAYMENT_CURRENCY || 'EGP';

  return {
    provider,
    currency,
    methods() {
      return [
        { id: 'cod', name: 'الدفع عند الاستلام', online: false, enabled: true },
        { id: 'card', name: 'الدفع الإلكتروني', online: true, enabled: provider !== 'none' }
      ];
    },
    async createIntent({ orderId, amount }) {
      if (provider === 'none') {
        return { status: 'not_configured', message: 'بوابة الدفع الإلكتروني غير مفعلة بعد' };
      }
      // Provider-specific code will live in this adapter later.
      return {
        status: 'not_implemented',
        provider,
        reference: `pi_${crypto.randomBytes(8).toString('hex')}`,
        orderId,
        amount: Number(amount),
        currency
      };
    },
    verifyWebhook(rawBody, signature) {
      const secret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (!secret || !signature) return false;
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature))); }
      catch { return false; }
    }
  };
}

module.exports = { createPaymentService };
