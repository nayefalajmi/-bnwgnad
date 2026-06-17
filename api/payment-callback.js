import crypto from 'crypto';
import https  from 'https';

const SECRET_KEY = process.env.HESABE_SECRET_KEY;
const IV_KEY     = process.env.HESABE_IV_KEY;
const SB_HOST    = 'ymopznkoddniibrxbeav.supabase.co';
const SB_KEY     = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

/* ── AES-256-CBC decrypt ── */
function decrypt(data) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(SECRET_KEY, 'utf8'),
    Buffer.from(IV_KEY,     'utf8')
  );
  const plain = decipher.update(data, 'base64', 'utf8') + decipher.final('utf8');
  return JSON.parse(plain);
}

/* ── HTTPS PATCH (no fetch dependency) ── */
function httpsPatch(hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname,
        path,
        method: 'PATCH',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...extraHeaders,
        },
      },
      (res) => { res.resume(); resolve(res.statusCode); }
    );
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('timeout')));
    req.write(bodyStr);
    req.end();
  });
}

/* ── Update order status in Supabase ── */
async function updateOrderStatus(orderRef, status) {
  try {
    await httpsPatch(
      SB_HOST,
      `/rest/v1/orders?order_ref=eq.${encodeURIComponent(orderRef)}`,
      { status },
      {
        'apikey':        SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Prefer':        'return=minimal',
      }
    );
  } catch (e) {
    console.warn('Order status update failed:', e.message);
  }
}

/* ── Handler ── */
export default async function handler(req, res) {
  try {
    const raw = req.method === 'POST' ? req.body?.data : req.query?.data;
    if (!raw) return res.redirect(302, '/payment-failed.html?reason=no_data');

    const result   = decrypt(raw);
    const orderRef = result.orderReferenceNumber || '';

    if (result?.status === 1) {
      if (orderRef) await updateOrderStatus(orderRef, 'new');
      const params = new URLSearchParams({
        ref:    orderRef,
        amount: result.amount    || '',
        txn:    result.paymentId || '',
      });
      return res.redirect(302, `/payment-success.html?${params}`);
    }

    if (orderRef) await updateOrderStatus(orderRef, 'cancelled');
    return res.redirect(302, `/payment-failed.html?reason=${result?.status || 'unknown'}`);

  } catch (err) {
    console.error('Callback error:', err.message);
    return res.redirect(302, '/payment-failed.html?reason=error');
  }
}
