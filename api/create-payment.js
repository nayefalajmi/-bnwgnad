import crypto from 'crypto';
import https  from 'https';

const MERCHANT_CODE = '47340922';
const ACCESS_CODE   = '15dc3bd9-33b3-406c-b13b-edb3d056bc30';
const SECRET_KEY    = process.env.HESABE_SECRET_KEY;
const IV_KEY        = process.env.HESABE_IV_KEY;
const SB_HOST       = 'ymopznkoddniibrxbeav.supabase.co';
const SB_KEY        = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

/* ── AES-256-CBC encryption ── */
function encrypt(data) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(SECRET_KEY, 'utf8'),
    Buffer.from(IV_KEY,     'utf8')
  );
  return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
}

/* ── Generic HTTPS POST (no fetch dependency) ── */
function httpsPost(hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...extraHeaders,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (_) { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('Request timeout after 20s')));
    req.write(bodyStr);
    req.end();
  });
}

/* ── Save order to Supabase (fire-and-forget) ── */
async function saveOrder(orderData) {
  try {
    await httpsPost(SB_HOST, '/rest/v1/orders', orderData, {
      'apikey':        SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer':        'return=minimal',
    });
  } catch (e) {
    console.warn('Supabase order save failed:', e.message);
  }
}

/* ── Handler ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SECRET_KEY || !IV_KEY) {
    return res.status(500).json({ error: 'Payment gateway not configured — check Vercel env vars' });
  }

  const { amount, orderRef, items, customer } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const ref     = orderRef || `ORD-${Date.now()}`;
  const baseUrl = `https://${req.headers.host}`;

  /* Save order (don't block on failure) */
  await saveOrder({
    order_ref:      ref,
    customer_name:  customer?.name    || 'غير محدد',
    customer_phone: customer?.phone   || '',
    address:        customer?.address || '',
    notes:          customer?.notes   || null,
    items:          Array.isArray(items) ? items : [],
    total:          parseFloat(parseFloat(amount).toFixed(3)),
    payment_method: 'card',
    status:         'pending_payment',
  });

  /* Build Hesabe payload */
  const paymentData = {
    merchantCode:         MERCHANT_CODE,
    amount:               parseFloat(amount).toFixed(3),
    paymentType:          0,
    responseUrl:          `${baseUrl}/api/payment-callback`,
    failureUrl:           `${baseUrl}/payment-failed.html`,
    version:              '2.0',
    orderReferenceNumber: ref,
    variable1:            customer?.name    || '',
    variable2:            customer?.phone   || '',
    variable3:            customer?.address || '',
    variable4:            '',
    variable5:            '',
  };

  try {
    const encrypted = encrypt(JSON.stringify(paymentData));

    const result = await httpsPost(
      'checkout.hesabe.com',
      '/payment',
      { data: encrypted },
      { 'accessCode': ACCESS_CODE }
    );

    if (result.body?.status === 1 && result.body?.response) {
      return res.status(200).json({ paymentUrl: result.body.response });
    }

    console.error('Hesabe rejected:', JSON.stringify(result.body));
    return res.status(502).json({ error: 'Payment gateway error', details: result.body });

  } catch (err) {
    console.error('Hesabe request failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
