/* ════════════════════════════════════════════════════════════════
   المحاسب الذكي — يستقبل بيانات الطلبات من الفرونت (جلسة الأدمن
   المصادَقة)، يحسب المؤشرات بدقّة (موضوعي 100%)، ثم يطلب من Claude
   (claude-sonnet-4-6) كتابة تقرير سردي + توصيات بناءً على تلك الأرقام
   فقط. المفتاح ANTHROPIC_API_KEY سري (server-side).
   ملاحظة: استقبال الطلبات من الفرونت يجعل الدالة تعمل حتى بعد تفعيل
   RLS (لأن الفرونت المصادَق هو من يقرأ الطلبات، لا الدالة).
   ════════════════════════════════════════════════════════════════ */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

/* تمديد مهلة الدالة (توليد التقرير قد يستغرق وقتاً) */
export const config = { maxDuration: 60 };

const DAY = 86400000;
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const pct = (cur, prev) => (prev > 0 ? round3(((cur - prev) / prev) * 100) : null);

/* ── حساب المؤشرات لمجموعة طلبات ── */
function computeMetrics(list) {
  const completed = list.filter(o => o.status === 'completed');
  const revenue   = completed.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const avg       = completed.length ? revenue / completed.length : 0;

  const cashCount = completed.filter(o => o.payment_method === 'cash').length;
  const cardCount = completed.filter(o => o.payment_method === 'card').length;

  /* أكثر المنتجات مبيعاً (من الطلبات المكتملة) */
  const prodMap = {};
  completed.forEach(o => (Array.isArray(o.items) ? o.items : []).forEach(it => {
    if (!it || !it.name) return;
    if (!prodMap[it.name]) prodMap[it.name] = { qty: 0, rev: 0 };
    prodMap[it.name].qty += (it.qty || 1);
    prodMap[it.name].rev += (it.price || 0) * (it.qty || 1);
  }));
  const topProducts = Object.entries(prodMap)
    .map(([name, d]) => ({ name, qty: d.qty, revenue: round3(d.rev) }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  /* أكثر مناطق التوصيل (الجزء الأول من العنوان قبل الفاصلة) */
  const areaMap = {};
  list.forEach(o => {
    const area = String(o.address || '').split(/[،,]/)[0].trim();
    if (!area) return;
    areaMap[area] = (areaMap[area] || 0) + 1;
  });
  const topAreas = Object.entries(areaMap)
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  /* توزيع الحالات */
  const statusCounts = {};
  list.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  return {
    revenue:        round3(revenue),
    ordersTotal:    list.length,
    ordersCompleted:completed.length,
    avgOrderValue:  round3(avg),
    cashCount,
    cardCount,
    topProducts,
    topAreas,
    statusCounts,
  };
}

/* ── استدعاء Claude لكتابة التقرير السردي ── */
async function generateNarrative(report) {
  const system =
    'أنت محاسب ومحلّل أعمال خبير لمتجر "بن وقناد" (متجر قهوة وبن في الكويت). ' +
    'اكتب تقريراً مالياً وتحليلياً شاملاً بالعربية الفصحى بناءً على الأرقام المعطاة فقط.\n' +
    'قواعد صارمة:\n' +
    '- اعتمد 100% على الأرقام المعطاة. لا تخترع أي رقم أو معلومة غير موجودة في البيانات.\n' +
    '- العملة دائماً الدينار الكويتي (د.ك).\n' +
    '- نظّم التقرير بعناوين واضحة (استخدم ## للعناوين و- للنقاط).\n' +
    '- قارن الفترة الحالية بالفترة السابقة واذكر نسب التغيّر (هي معطاة في الحقل changes).\n' +
    '- اختم بقسم "## التوصيات" يحتوي توصيات محددة، كل توصية مدعومة برقم صريح من البيانات.\n' +
    '- إذا كانت البيانات قليلة أو صفرية، قُل ذلك بوضوح ولا تبالغ.\n' +
    '- لا تكتب جداول؛ التطبيق يعرض الجداول الرقمية. ركّز على التحليل السردي والتوصيات.';

  const user =
    'هذه بيانات المتجر للفترة المطلوبة (محسوبة من قاعدة البيانات). اكتب التقرير الكامل:\n\n' +
    '```json\n' + JSON.stringify(report, null, 2) + '\n```';

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Anthropic API error (${resp.status})`);
  }
  if (data.stop_reason === 'refusal') {
    throw new Error('تعذّر توليد التقرير (رفض النموذج).');
  }
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!text) throw new Error('رد فارغ من النموذج.');
  return text;
}

/* ── Handler ── */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY غير مضبوط في متغيرات البيئة في Vercel' });
  }

  const { period: periodIn = 'month', orders } = req.body || {};

  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'بيانات الطلبات (orders) مفقودة أو غير صحيحة' });
  }

  const days  = periodIn === 'week' ? 7 : periodIn === 'quarter' ? 90 : 30;
  const label = periodIn === 'week' ? 'أسبوعي (آخر 7 أيام)'
              : periodIn === 'quarter' ? 'ربع سنوي (آخر 90 يوماً)'
              : 'شهري (آخر 30 يوماً)';

  const now       = Date.now();
  const curStart  = now - days * DAY;
  const prevStart = now - 2 * days * DAY;

  const inRange = (o, a, b) => { const t = new Date(o.created_at).getTime(); return t >= a && t < b; };
  const curOrders  = orders.filter(o => inRange(o, curStart, now));
  const prevOrders = orders.filter(o => inRange(o, prevStart, curStart));

  const metrics     = computeMetrics(curOrders);
  const prevMetrics = computeMetrics(prevOrders);

  const changes = {
    revenuePct:         pct(metrics.revenue,         prevMetrics.revenue),
    ordersTotalPct:     pct(metrics.ordersTotal,     prevMetrics.ordersTotal),
    ordersCompletedPct: pct(metrics.ordersCompleted, prevMetrics.ordersCompleted),
    avgOrderValuePct:   pct(metrics.avgOrderValue,   prevMetrics.avgOrderValue),
  };

  const report = {
    period: periodIn,
    periodLabel: label,
    currency: 'KWD',
    current: metrics,
    previous: prevMetrics,
    changes,
  };

  try {
    const narrative = await generateNarrative(report);
    return res.status(200).json({ ...report, narrative, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Smart accountant failed:', err.message);
    return res.status(502).json({ error: err.message, ...report });
  }
}
