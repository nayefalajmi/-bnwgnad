import https from 'https';

/* ════════════════════════════════════════════════════
   إشعارات تيليغرام للطلبات الجديدة
   يُستدعى من Supabase Database Webhook على جدول orders.
   يقرأ مستلمي الإشعار من telegram_chats (بمفتاح service_role)
   ويرسل لكل واحد رسالة عبر Telegram Bot API.
   ════════════════════════════════════════════════════ */

/* ── أسرار من بيئة Vercel ── */
const BOT_TOKEN      = process.env.TELEGRAM_BOT_TOKEN;        // توكن البوت من @BotFather
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;   // سر مشترك يحمي نقطة الـ webhook
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY; // لقراءة telegram_chats متجاوزاً RLS

/* ── Supabase (المضيف عام، مفتاح النشر عام مثل بقية الدوال) ── */
const SB_HOST = 'ymopznkoddniibrxbeav.supabase.co';
const SB_ANON = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

const TG_HOST = 'api.telegram.org';

/* ── طلب HTTPS عام ── */
function request(method, hostname, path, headers = {}, bodyStr = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method, headers: { ...headers } };
    if (bodyStr != null) opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('Request timeout after 15s')));
    if (bodyStr != null) req.write(bodyStr);
    req.end();
  });
}

/* ── أدوات ── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function payMethodLabel(m) {
  if (m === 'cash') return 'نقدي 💵';
  if (m === 'card') return 'بطاقة 💳';
  return m || '—';
}

/* يبني نص رسالة الطلب (HTML) */
function buildMessage(o) {
  const address = String(o.address || '').trim();
  const area    = address ? address.split(/[،,]/)[0].trim() : '—';
  const items   = Array.isArray(o.items) ? o.items : [];
  const lines   = items.length
    ? items.map(i => `• ${esc(i.name)} × ${esc(i.qty)}`).join('\n')
    : '—';
  const total   = parseFloat(o.total || 0).toFixed(3);

  return [
    '🛒 <b>طلب جديد!</b>',
    '',
    `🧾 رقم الطلب: <code>${esc(o.order_ref || '—')}</code>`,
    `👤 الزبون: ${esc(o.customer_name || '—')}`,
    `📞 الهاتف: ${esc(o.customer_phone || '—')}`,
    `📍 المنطقة: ${esc(area)}`,
    `🏠 العنوان: ${esc(address || '—')}`,
    `💰 المبلغ: <b>${esc(total)} د.ك</b>`,
    `💳 الدفع: ${esc(payMethodLabel(o.payment_method))}`,
    '',
    '🛍️ <b>المنتجات:</b>',
    lines,
  ].join('\n');
}

/* يقرأ معرّفات المحادثات المفعّلة من Supabase (service_role يتجاوز RLS) */
async function getActiveChats() {
  const res = await request(
    'GET', SB_HOST, '/rest/v1/telegram_chats?enabled=eq.true&select=chat_id',
    { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' }
  );
  if (res.status !== 200) throw new Error(`Supabase read failed (${res.status}): ${res.body}`);
  const rows = JSON.parse(res.body || '[]');
  return rows.map(r => r.chat_id).filter(Boolean);
}

/* يرسل رسالة لمحادثة واحدة */
async function sendTo(chatId, text) {
  const body = JSON.stringify({
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
  });
  return request('POST', TG_HOST, `/bot${BOT_TOKEN}/sendMessage`, { 'Content-Type': 'application/json' }, body);
}

/* يتحقق أن صاحب الطلب مستخدم مُصادق في Supabase (لزر التجربة من اللوحة) */
async function isAuthedUser(accessToken) {
  if (!accessToken) return false;
  try {
    const res = await request('GET', SB_HOST, '/auth/v1/user',
      { apikey: SB_ANON, Authorization: `Bearer ${accessToken}` });
    if (res.status !== 200) return false;
    const u = JSON.parse(res.body || '{}');
    return !!(u && u.id);
  } catch { return false; }
}

/* ════════════════════════════════════════════════════
   Handler
   ════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!BOT_TOKEN || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Telegram notifications not configured — check Vercel env vars' });
  }

  const body = req.body || {};

  /* ── وضع التجربة: من لوحة التحكم، يُصادق عليه عبر جلسة Supabase ── */
  if (body.test === true) {
    const auth  = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!(await isAuthedUser(token))) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const text = '✅ <b>تجربة إشعارات تيليغرام</b>\nالإعداد يعمل بنجاح — ستصلك إشعارات الطلبات الجديدة هنا.';
    try {
      let chats = [];
      if (body.chat_id) chats = [String(body.chat_id)];
      else chats = await getActiveChats();
      if (!chats.length) return res.status(400).json({ error: 'no_chats', message: 'لا توجد محادثات مفعّلة' });
      const results = await Promise.all(chats.map(c => sendTo(c, text)));
      const ok = results.filter(r => r.status === 200).length;
      return res.status(200).json({ sent: ok, total: chats.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  /* ── وضع الـ Webhook: استدعاء من Supabase عند تغيّر جدول orders ── */
  if (WEBHOOK_SECRET && req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const type   = body.type;                 // INSERT | UPDATE | DELETE
  const record = body.record || {};
  const old    = body.old_record || {};

  /* نُشعر فقط حين تصبح حالة الطلب 'new':
     - نقدي:  INSERT بحالة new
     - بطاقة: UPDATE من pending_payment إلى new
     وبهذا لا تتكرر الإشعارات. */
  const becameNew =
    record.status === 'new' &&
    (type === 'INSERT' || (type === 'UPDATE' && old.status !== 'new'));

  if (!becameNew) return res.status(200).json({ skipped: true });

  try {
    const chats = await getActiveChats();
    if (!chats.length) return res.status(200).json({ sent: 0, note: 'no active chats' });
    const text    = buildMessage(record);
    const results = await Promise.all(chats.map(c => sendTo(c, text)));
    const ok = results.filter(r => r.status === 200).length;
    return res.status(200).json({ sent: ok, total: chats.length });
  } catch (e) {
    console.warn('notify-telegram failed:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
