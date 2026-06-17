import crypto from 'crypto';

const SECRET_KEY = process.env.HESABE_SECRET_KEY;
const IV_KEY     = process.env.HESABE_IV_KEY;

function decrypt(data) {
  const key = Buffer.from(SECRET_KEY, 'utf8');
  const iv  = Buffer.from(IV_KEY,     'utf8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(data, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

export default function handler(req, res) {
  try {
    const raw = req.method === 'POST' ? req.body?.data : req.query?.data;

    if (!raw) {
      return res.redirect(302, '/payment-failed.html?reason=no_data');
    }

    const result = decrypt(raw);

    // status: 1 = success, 2 = failed, 3 = cancelled
    if (result?.status === 1) {
      const params = new URLSearchParams({
        ref:    result.orderReferenceNumber || '',
        amount: result.amount || '',
        txn:    result.paymentId || '',
      });
      return res.redirect(302, `/payment-success.html?${params}`);
    }

    return res.redirect(302, `/payment-failed.html?reason=${result?.status || 'unknown'}`);
  } catch (err) {
    return res.redirect(302, '/payment-failed.html?reason=error');
  }
}
