import crypto from 'crypto';

const SECRET_KEY   = process.env.HESABE_SECRET_KEY;
const IV_KEY       = process.env.HESABE_IV_KEY;
const SUPABASE_URL = 'https://ymopznkoddniibrxbeav.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

function decrypt(data) {
  const key      = Buffer.from(SECRET_KEY, 'utf8');
  const iv       = Buffer.from(IV_KEY,     'utf8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return JSON.parse(decipher.update(data, 'base64', 'utf8') + decipher.final('utf8'));
}

async function updateOrderStatus(orderRef, status) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/orders?order_ref=eq.${encodeURIComponent(orderRef)}`,
      {
        method:  'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ status }),
      }
    );
  } catch (e) {
    console.warn('Order status update failed:', e.message);
  }
}

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
    return res.redirect(302, '/payment-failed.html?reason=error');
  }
}
