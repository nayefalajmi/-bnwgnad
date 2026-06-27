import crypto from 'crypto';
import https  from 'https';

/* ── Hesabe credentials ── */
const MERCHANT_CODE = '47340922';
const ACCESS_CODE   = '15dc3bd9-33b3-406c-b13b-edb3d056bc30';
const SECRET_KEY    = process.env.HESABE_SECRET_KEY;   // 32 chars
const IV_KEY        = process.env.HESABE_IV_KEY;       // 16 chars

/* ── Hesabe endpoints (In-Direct / paymentType 0) ── */
const HESABE_HOST   = 'api.hesabe.com';
const CHECKOUT_PATH = '/checkout';
const PAYMENT_URL   = 'https://api.hesabe.com/payment';

/* ── Supabase ── */
const SB_HOST = 'ymopznkoddniibrxbeav.supabase.co';
const SB_KEY  = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

/* ════════════════════════════════════════════════════
   HesabeCrypt — exact port of the official library
   AES-256-CBC + custom PKCS5 padding (block size 32) + hex
   ════════════════════════════════════════════════════ */
function pkcs5Pad(buf) {
  const blockSize = 32;
  const pad = blockSize - (buf.length % blockSize);
  return Buffer.concat([buf, Buffer.alloc(pad, pad)]);
}

function encrypt(plain) {
  const data   = pkcs5Pad(Buffer.from(plain, 'utf8'));
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(SECRET_KEY, 'utf8'),
    Buffer.from(IV_KEY,     'utf8')
  );
  cipher.setAutoPadding(false);                 // we padded manually
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('hex');
}

function decrypt(hex) {
  hex = String(hex).trim();
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return false;
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(SECRET_KEY, 'utf8'),
    Buffer.from(IV_KEY,     'utf8')
  );
  decipher.setAutoPadding(false);
  const dec = Buffer.concat([decipher.update(Buffer.from(hex, 'hex')), decipher.final()]);
  const pad = dec[dec.length - 1];              // pkcs5 unpad
  if (pad > dec.length) return false;
  return dec.slice(0, dec.length - pad).toString('utf8');
}

/* ── Generic HTTPS POST (raw string body, no fetch dependency) ── */
function httpsPost(hostname, path, bodyStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: { 'Content-Length': Buffer.byteLength(bodyStr), ...headers },
      },
      (res) => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: raw }));
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
    await httpsPost(SB_HOST, '/rest/v1/orders', JSON.stringify(orderData), {
      'Content-Type':  'application/json',
      'apikey':        SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Prefer':        'return=minimal',
    });
  } catch (e) {
    console.warn('Supabase order save failed:', e.message);
  }
}

/* ════════════════════════════════════════════════════
   Handler
   ════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SECRET_KEY || !IV_KEY) {
    return res.status(500).json({ error: 'Payment gateway not configured — check Vercel env vars' });
  }

  const { amount, deliveryFee, discountCode, discountAmount,
          loyaltyPointsUsed, loyaltyDiscount, orderRef, items, customer } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const ref     = orderRef || `ORD-${Date.now()}`;
  const baseUrl = `https://${req.headers.host}`;

  /* IP الزبون من ترويسة الطلب */
  const xff = req.headers['x-forwarded-for'];
  const ip  = (xff ? String(xff).split(',')[0].trim() : '') || req.headers['x-real-ip'] || '';

  /* منع إعادة استخدام كود الخصم من نفس الشخص (هاتف/إيميل/IP) */
  if (discountCode) {
    try {
      const chk = await httpsPost(SB_HOST, '/rest/v1/rpc/check_discount',
        JSON.stringify({ p_code: discountCode, p_phone: customer?.phone || '', p_email: customer?.email || '', p_ip: ip }),
        { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` });
      const rows = JSON.parse(chk.body || '[]');
      const row  = Array.isArray(rows) ? rows[0] : rows;
      if (row && row.ok && row.used) {
        return res.status(400).json({ error: 'discount_used', message: 'هذا الكود استُخدم مسبقاً' });
      }
    } catch (e) { console.warn('discount check failed:', e.message); }
  }

  /* Save the order (don't block checkout on a save failure) */
  await saveOrder({
    order_ref:       ref,
    customer_name:   customer?.name    || 'غير محدد',
    customer_phone:  customer?.phone   || '',
    customer_email:  customer?.email   || null,
    customer_ip:     ip || null,
    address:         customer?.address || '',
    block:           customer?.block   || null,
    notes:           customer?.notes   || null,
    items:           Array.isArray(items) ? items : [],
    total:           parseFloat(parseFloat(amount).toFixed(3)),
    delivery_fee:    parseFloat(parseFloat(deliveryFee || 0).toFixed(3)),
    discount_code:   discountCode || null,
    discount_amount: parseFloat(parseFloat(discountAmount || 0).toFixed(3)),
    loyalty_points_used: parseInt(loyaltyPointsUsed || 0, 10) || 0,
    loyalty_discount:    parseFloat(parseFloat(loyaltyDiscount || 0).toFixed(3)),
    payment_method:  'card',
    status:          'pending_payment',
  });

  /* Build the Hesabe In-Direct payload */
  const paymentData = {
    merchantCode:         MERCHANT_CODE,
    amount:               parseFloat(amount).toFixed(3),
    paymentType:          0,
    currency:             'KWD',
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

    /* POST encrypted payload to Hesabe /checkout (form-urlencoded) */
    const result = await httpsPost(
      HESABE_HOST,
      CHECKOUT_PATH,
      `data=${encrypted}`,                       // hex is URL-safe
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        'accessCode':   ACCESS_CODE,
        'Accept':       'application/json',
      }
    );

    /* The response body is an encrypted hex string — decrypt it */
    const plain = decrypt(result.body);
    if (!plain) {
      console.error('Hesabe non-encrypted response:', result.status, result.body);
      return res.status(502).json({ error: 'Payment gateway error', details: result.body });
    }

    const data  = JSON.parse(plain);
    const token = data?.response?.data;

    if (data?.status === false || !token) {
      console.error('Hesabe checkout rejected:', plain);
      return res.status(502).json({ error: 'Payment gateway rejected the request', details: data });
    }

    /* Redirect customer to the hosted payment page */
    return res.status(200).json({ paymentUrl: `${PAYMENT_URL}?data=${token}` });

  } catch (err) {
    console.error('Hesabe request failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
