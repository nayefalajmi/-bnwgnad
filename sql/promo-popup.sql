-- ════════════════════════════════════════════════════════════════
--  بوب آب العروض (Promo Popup)
--
--  يستخدم جدول app_settings الموجود (مفتاح/قيمة) — لا حاجة لجدول جديد.
--  المفاتيح:
--    promo_enabled    : 'true' / 'false'  تفعيل/تعطيل البوب آب
--    promo_product_id : id المنتج المرتبط (نص، فارغ = بلا ربط)
--    promo_image_url  : رابط صورة العرض العام (مع ?t= لكسر الكاش)
--  الصورة تُرفع إلى باكت product-images في المجلد promos/ من لوحة التحكم.
--
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
--  (app_settings وRLS منشأة في sql/loyalty.sql — شغّله أولاً إن لزم.)
-- ════════════════════════════════════════════════════════════════

insert into app_settings (key, value) values
  ('promo_enabled',    'false'),
  ('promo_product_id', ''),
  ('promo_image_url',  '')
on conflict (key) do nothing;
