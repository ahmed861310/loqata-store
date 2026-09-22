const crypto = require('crypto');

function timingSafeHex(expected, received) {
  if (!expected || !received) return false;
  const a = Buffer.from(String(expected).toLowerCase());
  const b = Buffer.from(String(received).toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function paymobHmac(payload, secret) {
  const obj = payload?.obj || {};
  const keys = [
    'amount_cents','created_at','currency','error_occured','has_parent_transaction','id',
    'integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment',
    'is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type',
    'success'
  ];
  const value = k => {
    const parts = k.split('.');
    let v = obj;
    for (const p of parts) v = v?.[p];
    return v == null ? '' : String(v);
  };
  const concatenated = keys.map(value).join('');
  return crypto.createHmac('sha512', secret).update(concatenated).digest('hex');
}

function createPaymentService() {
  const provider = String(process.env.PAYMENT_PROVIDER || (process.env.NODE_ENV === 'production' ? 'none' : 'demo')).toLowerCase();
  const currency = process.env.PAYMENT_CURRENCY || 'EGP';

  const paymob = {
    baseUrl: process.env.PAYMOB_BASE_URL || 'https://accept.paymob.com',
    secretKey: process.env.PAYMOB_SECRET_KEY || '',
    publicKey: process.env.PAYMOB_PUBLIC_KEY || '',
    integrationId: process.env.PAYMOB_INTEGRATION_ID || '',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET || '',
    webhookUrl: process.env.PAYMOB_NOTIFICATION_URL || '',
    redirectUrl: process.env.PAYMOB_REDIRECT_URL || ''
  };

  return {
    provider,
    currency,
    methods() {
      return [
        { id: 'cod', name: 'الدفع عند الاستلام', online: false, enabled: true },
        { id: 'card', name: 'الدفع الإلكتروني', online: true, enabled: provider === 'paymob' || provider === 'demo' }
      ];
    },
    async createIntent({ orderId, amount, billingData = {}, items = [] }) {
      if (provider === 'demo') {
        const cents = Math.round(Number(amount) * 100);
        if (!Number.isInteger(cents) || cents <= 0) return { status: 'invalid_amount' };
        return { status: 'created', provider: 'demo', orderId: String(orderId), intentionId: `demo_${crypto.randomBytes(6).toString('hex')}`, checkoutUrl: `/payment-demo?orderId=${encodeURIComponent(orderId)}`, clientSecret: null, publicKey: null };
      }
      if (provider !== 'paymob') {
        return { status: 'not_configured', message: 'بوابة الدفع الإلكتروني غير مفعلة بعد' };
      }
      if (!paymob.secretKey || !paymob.integrationId || !paymob.publicKey) {
        return { status: 'not_configured', message: 'بيانات Paymob غير مكتملة' };
      }
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isInteger(cents) || cents <= 0) return { status: 'invalid_amount' };
      const payload = {
        amount: cents,
        currency,
        payment_methods: [Number(paymob.integrationId)],
        items: items.slice(0, 50).map(i => ({
          name: String(i.name || 'منتج').slice(0, 200),
          amount: Math.round(Number(i.price || 0) * 100),
          description: String(i.name || 'منتج').slice(0, 200),
          quantity: Number(i.qty || 1)
        })),
        billing_data: {
          apartment: 'NA', building: 'NA', floor: 'NA', street: String(billingData.address || 'NA').slice(0, 100),
          first_name: String(billingData.name || 'Customer').split(' ')[0] || 'Customer',
          last_name: String(billingData.name || 'Customer').split(' ').slice(1).join(' ') || 'Customer',
          phone_number: String(billingData.phone || ''), city: String(billingData.city || 'Cairo'),
          country: 'EG', email: String(billingData.email || 'customer@loqata.local').slice(0, 100), state: 'Cairo', postal_code: 'NA'
        },
        extras: { loqata_order_id: String(orderId) },
        special_reference: String(orderId),
        expiration: 3600
      };
      if (paymob.webhookUrl) payload.notification_url = paymob.webhookUrl;
      if (paymob.redirectUrl) payload.redirection_url = paymob.redirectUrl;

      const response = await fetch(`${paymob.baseUrl}/v1/intention/`, {
        method: 'POST',
        headers: { Authorization: `Token ${paymob.secretKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { status: 'gateway_error', httpStatus: response.status, message: data?.detail || data?.message || 'فشل إنشاء عملية الدفع' };
      return {
        status: 'created', provider: 'paymob', orderId: String(orderId),
        intentionId: data.id || null, paymobOrderId: data.intention_order_id || null,
        clientSecret: data.client_secret || null, publicKey: paymob.publicKey,
        checkoutUrl: data.client_secret ? `${paymob.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(paymob.publicKey)}&clientSecret=${encodeURIComponent(data.client_secret)}` : null
      };
    },
    verifyWebhook(payload, signature) {
      if (provider !== 'paymob' || !paymob.hmacSecret || !signature) return false;
      return timingSafeHex(paymobHmac(payload, paymob.hmacSecret), signature);
    }
  };
}

module.exports = { createPaymentService };
