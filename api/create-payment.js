import crypto from 'crypto';

const MERCHANT_CODE = '47340922';
const ACCESS_CODE   = '15dc3bd9-33b3-406c-b13b-edb3d056bc30';
const SECRET_KEY    = process.env.HESABE_SECRET_KEY;
const IV_KEY        = process.env.HESABE_IV_KEY;
const HESABE_URL    = 'https://checkout.hesabe.com/payment';

function encrypt(data) {
  const key = Buffer.from(SECRET_KEY, 'utf8');
  const iv  = Buffer.from(IV_KEY,     'utf8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SECRET_KEY || !IV_KEY) {
    return res.status(500).json({ error: 'Payment gateway not configured' });
  }

  const { amount, orderRef, items } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const baseUrl = `https://${req.headers.host}`;

  const paymentData = {
    merchantCode:        MERCHANT_CODE,
    amount:              parseFloat(amount).toFixed(3),
    paymentType:         0,
    responseUrl:         `${baseUrl}/api/payment-callback`,
    failureUrl:          `${baseUrl}/payment-failed.html`,
    version:             '2.0',
    orderReferenceNumber: orderRef || `ORD-${Date.now()}`,
    variable1:           JSON.stringify(items || []).slice(0, 100),
    variable2:           '',
    variable3:           '',
    variable4:           '',
    variable5:           '',
  };

  try {
    const encrypted = encrypt(JSON.stringify(paymentData));

    const hesabeRes = await fetch(HESABE_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'accessCode':   ACCESS_CODE,
      },
      body: JSON.stringify({ data: encrypted }),
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
