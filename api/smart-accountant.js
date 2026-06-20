/* ════════════════════════════════════════════════════════════════
   المحاسب الذكي (streaming) — Vercel Edge Function
   يستقبل بيانات الطلبات من الفرونت، يحسب المؤشرات (موضوعي 100%)،
   ثم يبثّ تقرير Claude (claude-sonnet-4-6) كلمة كلمة عبر NDJSON:
     السطر 1: {"type":"meta", ...المؤشرات}
     ثم:      {"type":"delta","text":"..."} لكل دفعة نص
     النهاية: {"type":"done"}  أو  {"type":"error","error":"..."}
   ════════════════════════════════════════════════════════════════ */

export const config = { runtime: 'edge' };

const MODEL = 'claude-sonnet-4-6';
const DAY = 86400000;
const round3 = (n) => Math.round((n + Number.EPSILON) * 1000) / 1000;
const pct = (cur, prev) => (prev > 0 ? round3(((cur - prev) / prev) * 100) : null);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/* ── حساب المؤشرات لمجموعة طلبات ── */
function computeMetrics(list) {
  const completed = list.filter(o => o.status === 'completed');
  const revenue   = completed.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const avg       = completed.length ? revenue / completed.length : 0;

  const cashCount = completed.filter(o => o.payment_method === 'cash').length;
  const cardCount = completed.filter(o => o.payment_method === 'card').length;

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

  const statusCounts = {};
  list.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  return {
    revenue:         round3(revenue),
    ordersTotal:     list.length,
    ordersCompleted: completed.length,
    avgOrderValue:   round3(avg),
    cashCount,
    cardCount,
    topProducts,
    topAreas,
    statusCounts,
  };
}

/* ── Handler (Edge) ── */
export default async function handler(req) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY غير مضبوط في متغيرات البيئة في Vercel' }, 500);
  }

  let body;
  try { body = await req.json(); } catch (_) { body = {}; }
  const { period: periodIn = 'month', orders, dataSource: dsIn = 'site', shop = null } = body;
  if (!Array.isArray(orders)) {
    return json({ error: 'بيانات الطلبات (orders) مفقودة أو غير صحيحة' }, 400);
  }
  const dataSource = ['site', 'shop', 'both'].includes(dsIn) ? dsIn : 'site';
  const needSite = dataSource === 'site' || dataSource === 'both';
  const needShop = dataSource === 'shop' || dataSource === 'both';
  if (needShop && (!shop || !shop.current)) {
    return json({ error: 'بيانات المحل مطلوبة لهذا المصدر لكنها مفقودة' }, 400);
  }

  const days  = periodIn === 'week' ? 7 : periodIn === 'quarter' ? 90 : 30;
  const label = periodIn === 'week' ? 'أسبوعي (آخر 7 أيام)'
              : periodIn === 'quarter' ? 'ربع سنوي (آخر 90 يوماً)'
              : 'شهري (آخر 30 يوماً)';

  const now       = Date.now();
  const curStart  = now - days * DAY;
  const prevStart = now - 2 * days * DAY;

  const inRange = (o, a, b) => { const t = new Date(o.created_at).getTime(); return t >= a && t < b; };
  const metrics     = computeMetrics(orders.filter(o => inRange(o, curStart, now)));
  const prevMetrics = computeMetrics(orders.filter(o => inRange(o, prevStart, curStart)));

  const changes = {
    revenuePct:         pct(metrics.revenue,         prevMetrics.revenue),
    ordersTotalPct:     pct(metrics.ordersTotal,     prevMetrics.ordersTotal),
    ordersCompletedPct: pct(metrics.ordersCompleted, prevMetrics.ordersCompleted),
    avgOrderValuePct:   pct(metrics.avgOrderValue,   prevMetrics.avgOrderValue),
  };

  /* مبيعات المحل (محسوبة في الفرونت من ملف CSV) — نعيدها كما هي في الـ meta */
  const shopMeta = needShop && shop
    ? { current: shop.current || {}, previous: shop.previous || {} }
    : null;

  const sourceLabel = dataSource === 'both' ? 'الموقع + المحل (مدموجان)'
                    : dataSource === 'shop' ? 'المحل فقط'
                    : 'الموقع فقط';

  /* الإجمالي المدموج (موقع + محل) عندما يكون المصدر "both" */
  const combined = dataSource === 'both' && shopMeta
    ? {
        revenue: round3((metrics.revenue || 0) + (shopMeta.current.netSales || 0)),
        siteRevenue: metrics.revenue || 0,
        shopNetSales: shopMeta.current.netSales || 0,
      }
    : null;

  const reportMeta = {
    type: 'meta',
    period: periodIn,
    periodLabel: label,
    currency: 'KWD',
    dataSource,
    sourceLabel,
    current: needSite ? metrics : {},
    previous: needSite ? prevMetrics : {},
    changes: needSite ? changes : {},
    shop: shopMeta,
    combined,
    generatedAt: new Date().toISOString(),
  };

  /* بناء الـ prompt */
  const promptData = { ...reportMeta }; delete promptData.type;
  const system =
    'أنت محاسب ومحلّل أعمال خبير لمتجر "بن وقناد" (متجر قهوة وبن في الكويت). ' +
    'اكتب تقريراً مالياً وتحليلياً شاملاً بالعربية الفصحى بناءً على الأرقام المعطاة فقط.\n' +
    'قواعد صارمة:\n' +
    '- اعتمد 100% على الأرقام المعطاة. لا تخترع أي رقم أو معلومة غير موجودة في البيانات.\n' +
    '- العملة دائماً الدينار الكويتي (د.ك).\n' +
    '- مصدر بيانات هذا التقرير: ' + sourceLabel + '. هناك مصدران ممكنان:\n' +
    '    • "الموقع" = الطلبات الإلكترونية (الحقل current/previous: إيرادات، طلبات، منتجات، مناطق).\n' +
    '    • "المحل" = مبيعات الفرع من ملف المحاسبة (الحقل shop: إجمالي البيع، المستردات، الخصومات، صافي المبيعات، تكلفة البضاعة، إجمالي الربح، الهامش).\n' +
    '- مهم جداً: عند ذكر أي رقم، وضّح مصدره صراحةً بكلمة بين قوسين: (موقع) أو (محل) أو (إجمالي).\n' +
    '- إن كان المصدر مدموجاً، قارن بين أداء الموقع والمحل، واذكر الإجمالي المدموج من الحقل combined.\n' +
    '- ملاحظة: أرقام التكلفة والربح والهامش متوفرة من المحل فقط (الموقع لا يحوي تكلفة بضاعة).\n' +
    '- نظّم التقرير بعناوين واضحة (استخدم ## للعناوين و- للنقاط).\n' +
    '- قارن الفترة الحالية بالفترة السابقة واذكر نسب التغيّر.\n' +
    '- اختم بقسم "## التوصيات" يحتوي توصيات محددة، كل توصية مدعومة برقم صريح من البيانات مع ذكر مصدره.\n' +
    '- إذا كانت البيانات قليلة أو صفرية، قُل ذلك بوضوح ولا تبالغ.\n' +
    '- لا تكتب جداول؛ التطبيق يعرض الجداول الرقمية. ركّز على التحليل السردي والتوصيات.';
  const user =
    'هذه بيانات "بن وقناد" للفترة المطلوبة (مصدرها: ' + sourceLabel + '). اكتب التقرير الكامل مع توضيح مصدر كل رقم:\n\n' +
    '```json\n' + JSON.stringify(promptData, null, 2) + '\n```';

  /* استدعاء Claude بوضع streaming */
  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 4000,
        stream:     true,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
  } catch (e) {
    return json({ error: 'تعذّر الاتصال بـ Claude: ' + e.message, ...reportMeta }, 502);
  }

  if (!upstream.ok || !upstream.body) {
    let details = '';
    try { details = (await upstream.json())?.error?.message || ''; } catch (_) {}
    return json({ error: details || `Anthropic API error (${upstream.status})`, ...reportMeta }, 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const line = (obj) => encoder.encode(JSON.stringify(obj) + '\n');

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(line(reportMeta));   // 1) المؤشرات أولاً
      const reader = upstream.body.getReader();
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n');
          buf = parts.pop();
          for (const raw of parts) {
            const t = raw.trim();
            if (!t.startsWith('data:')) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            let ev; try { ev = JSON.parse(payload); } catch (_) { continue; }
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
              controller.enqueue(line({ type: 'delta', text: ev.delta.text }));
            } else if (ev.type === 'message_delta' && ev.delta?.stop_reason === 'refusal') {
              controller.enqueue(line({ type: 'error', error: 'رفض النموذج توليد التقرير' }));
            }
          }
        }
        controller.enqueue(line({ type: 'done' }));
      } catch (e) {
        controller.enqueue(line({ type: 'error', error: e.message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type':     'text/plain; charset=utf-8',
      'cache-control':    'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
