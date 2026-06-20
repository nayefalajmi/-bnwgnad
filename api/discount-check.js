/* ════════════════════════════════════════════════════════════════
   فحص كود الخصم + كشف إعادة الاستخدام (Vercel serverless / Node)
   - يجلب IP الزبون من ترويسة الطلب (x-forwarded-for).
   - يستدعي دالة check_discount في Supabase (SECURITY DEFINER).
   - يرجّع: { status: 'ok' | 'used' | 'invalid', ip, discount? }.
   ════════════════════════════════════════════════════════════════ */

const SB_HOST = 'ymopznkoddniibrxbeav.supabase.co';
const SB_KEY  = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

/* استخراج أول IP حقيقي من الترويسات */
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code = '', phone = '', email = '' } = req.body || {};
  const ip = clientIp(req);

  /* بلا كود: نرجّع IP فقط (يُستخدم لحفظه على الطلب) */
  if (!code || !String(code).trim()) {
    return res.status(200).json({ status: 'ok', ip });
  }

  try {
    const r = await fetch(`https://${SB_HOST}/rest/v1/rpc/check_discount`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
      body: JSON.stringify({ p_code: code, p_phone: phone || '', p_email: email || '', p_ip: ip || '' }),
    });
    const rows = await r.json();
    const row  = Array.isArray(rows) ? rows[0] : rows;

    if (!row || !row.ok)  return res.status(200).json({ status: 'invalid', ip });
    if (row.used)         return res.status(200).json({ status: 'used',    ip });
    return res.status(200).json({
      status: 'ok', ip,
      discount: { type: row.discount_type, value: parseFloat(row.discount_value) },
    });
  } catch (e) {
    /* تعذّر الفحص — لا نمنع العميل، نكتفي بإرجاع IP */
    return res.status(200).json({ status: 'error', ip, message: e.message });
  }
}
