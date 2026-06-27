-- ════════════════════════════════════════════════════════════════
--  بديل واجهة Database Webhook — Trigger مباشر عبر pg_net
--
--  استخدم هذا الملف إذا أعطتك واجهة Supabase ▸ Database ▸ Webhooks
--  الخطأ: "schema supabase_functions does not exist".
--  هذا التريغر يسوّي نفس عمل الـ webhook بالضبط: عند كل طلب تصبح
--  حالته 'new' يرسل طلب HTTP إلى /api/notify-telegram. نفس الدالة
--  notify-telegram.js تعمل بلا أي تعديل (تستقبل type/record/old_record).
--
--  الخطوات:
--   1) فعّل الامتداد pg_net:
--      Supabase ▸ Database ▸ Extensions ▸ ابحث "pg_net" ▸ Enable
--      (أو شغّل سطر create extension بالأسفل).
--   2) استبدل <WEBHOOK_SECRET> بنفس قيمة TELEGRAM_WEBHOOK_SECRET
--      التي وضعتها في Vercel.
--   3) شغّل هذا الملف كاملاً في: Supabase ▸ SQL Editor ▸ Run.
-- ════════════════════════════════════════════════════════════════

-- 1) امتداد pg_net (يوفّر net.http_post). آمن لو كان مفعّلاً مسبقاً.
create extension if not exists pg_net with schema extensions;

-- 2) دالة التريغر: ترسل إشعاراً فقط حين تصبح الحالة 'new'
--    (نقدي: INSERT بحالة new — بطاقة: UPDATE من pending_payment إلى new)
create or replace function public.notify_telegram_new_order()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, net
as $$
begin
  if NEW.status = 'new'
     and (TG_OP = 'INSERT' or (TG_OP = 'UPDATE' and OLD.status is distinct from 'new'))
  then
    perform net.http_post(
      url     := 'https://www.bnwgnad.com/api/notify-telegram',  -- النطاق النهائي (بدون www يعطي 308 redirect وpg_net لا يتبعه)
      headers := jsonb_build_object(
        'Content-Type',     'application/json',
        'x-webhook-secret', '<WEBHOOK_SECRET>'   -- ← نفس قيمة TELEGRAM_WEBHOOK_SECRET في Vercel
      ),
      body    := jsonb_build_object(
        'type',       TG_OP,
        'table',      'orders',
        'record',     to_jsonb(NEW),
        'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
      )
    );
  end if;
  return NEW;
end;
$$;

-- 3) ربط التريغر بجدول الطلبات
drop trigger if exists trg_notify_telegram on public.orders;
create trigger trg_notify_telegram
  after insert or update on public.orders
  for each row execute function public.notify_telegram_new_order();

-- ────────────────────────────────────────────────────────────────
--  ملاحظات:
--  - net.http_post غير متزامن (يضع الطلب في طابور ولا يبطّئ حفظ الطلب).
--  - لمراقبة آخر الطلبات الصادرة ونتائجها:
--      select * from net._http_response order by id desc limit 20;
--  - السر مخزّن داخل تعريف الدالة (يصله فقط من يملك صلاحية قاعدة
--    البيانات). للأمان الأعلى يمكن نقله إلى Supabase Vault لاحقاً.
-- ────────────────────────────────────────────────────────────────
