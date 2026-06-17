import crypto from 'crypto';

const MERCHANT_CODE  = '47340922';
const ACCESS_CODE    = '15dc3bd9-33b3-406c-b13b-edb3d056bc30';
const SECRET_KEY     = process.env.HESABE_SECRET_KEY;
const IV_KEY         = process.env.HESABE_IV_KEY;
const HESABE_URL     = 'https://checkout.hesabe.com/payment';
const SUPABASE_URL   = 'https://ymopznkoddniibrxbeav.supabase.co';
const SUPABASE_KEY   = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

function encrypt(data) {
  const key    = Buffer.from(SECRET_KEY, 'utf8');
  const iv     = Buffer.from(IV_KEY,     'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return cipher.update(data, 'utf8', 'base64') + cipher.final('base64');
}

async function saveOrder(orderData) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(orderData),
    });
  } catch (e) {
    console.warn('Supabase order save failed:', e.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SECRET_KEY || !IV_KEY) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const { amount, orderRef, items, customer } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const ref     = orderRef || `ORD-${Date.now()}`;
  const baseUrl = `https://${req.headers.host}`;

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
    const encrypted  = encrypt(JSON.stringify(paymentData));
    const hesabeRes  = await fetch(HESABE_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'accessCode': ACCESS_CODE },
      body:    JSON.stringify({ data: encrypted }),
    });
    const hesabeData = await hesabeRes.json();

    if (hesabeData?.status === 1 && hesabeData?.response) {
      return res.status(200).json({ paymentUrl: hesabeData.response });
    }
    return res.status(502).json({ error: 'Payment gateway error', details: hesabeData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
