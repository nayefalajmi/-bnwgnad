-- ════════════════════════════════════════════════════════════════
--  منع إعادة استخدام كود الخصم من نفس الشخص + حفظ الإيميل والـ IP
--
--  - عمودان على orders: customer_email, customer_ip.
--  - دالة check_discount: تتحقق من صلاحية الكود، وتكشف إن كان الشخص
--    استخدمه سابقاً عبر تطابق (رقم الهاتف أو الإيميل أو الـ IP) في طلب
--    سابق بنفس الكود (عدا الطلبات الملغاة/المعلّقة الدفع).
--  - الأمان: الزائر لا يقرأ جدول orders مباشرة؛ الفحص يتم داخل الدالة
--    (SECURITY DEFINER) التي تتجاوز RLS بأمان وترجع نتيجة فقط.
--
--  ⚠️ شغّل هذا الملف قبل نشر الكود الجديد (لأن الإدراج يكتب العمودين).
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
-- ════════════════════════════════════════════════════════════════

alter table orders add column if not exists customer_email text;
alter table orders add column if not exists customer_ip    text;

-- فحص الكود + كشف إعادة الاستخدام لنفس الشخص (هاتف/إيميل/IP)
create or replace function check_discount(p_code text, p_phone text, p_email text, p_ip text)
returns table (ok boolean, used boolean, discount_type text, discount_value numeric)
language plpgsql security definer set search_path = public as $$
declare d_type text; d_value numeric; v_used boolean;
begin
  -- صلاحية الكود نفسه (نؤهّل الأعمدة باسم الجدول لتفادي تعارضها مع أعمدة الإخراج)
  select dc.discount_type, dc.discount_value into d_type, d_value
  from discount_codes dc
  where lower(dc.code) = lower(trim(p_code))
    and dc.active = true
    and (dc.expires_at is null or dc.expires_at > now())
    and (dc.max_uses  is null or dc.used_count < dc.max_uses)
  limit 1;

  if not found then
    return query select false, false, null::text, null::numeric;   -- كود غير صالح
    return;
  end if;

  -- هل استخدمه هذا الشخص سابقاً؟ (تطابق أي من الثلاثة)
  select exists(
    select 1 from orders o
    where lower(o.discount_code) = lower(trim(p_code))
      and coalesce(o.status,'') not in ('cancelled','pending_payment')
      and (
            (nullif(trim(p_phone),'') is not null and o.customer_phone = trim(p_phone))
         or (nullif(trim(p_email),'') is not null and lower(o.customer_email) = lower(trim(p_email)))
         or (nullif(trim(p_ip),'')    is not null and o.customer_ip = trim(p_ip))
      )
  ) into v_used;

  return query select true, v_used, d_type, d_value;
end; $$;

revoke execute on function check_discount(text, text, text, text) from public;
grant  execute on function check_discount(text, text, text, text) to anon, authenticated;
