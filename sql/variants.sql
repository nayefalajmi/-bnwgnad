-- ════════════════════════════════════════════════════════════════
--  متغيرات المنتجات (variants) — أوزان/أحجام بأسعار مختلفة
--
--  - عمود variants (jsonb) على products: مصفوفة {label, price}.
--    مثال: [{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500}]
--  - المنتجات بدون variants تعمل كالعادة بالسعر الأساسي (Price).
--  - يحدّث 20 منتجاً بالمتغيرات المطلوبة.
--
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
-- ════════════════════════════════════════════════════════════════

alter table products add column if not exists variants jsonb;

-- ─────────── تحديث المنتجات ───────────
update products set variants = '[{"label":"100 جرام","price":1.600},{"label":"250 جرام","price":4.000},{"label":"500 جرام","price":8.000},{"label":"1 كيلو","price":16.000}]'::jsonb where "Name" = 'هيل أمريكي رقم 1';
update products set variants = '[{"label":"100 جرام","price":1.500},{"label":"250 جرام","price":3.750},{"label":"500 جرام","price":7.500},{"label":"1 كيلو","price":15.000}]'::jsonb where "Name" = 'هيل أمريكي رقم 2';
update products set variants = '[{"label":"100 جرام","price":1.400},{"label":"250 جرام","price":3.500},{"label":"500 جرام","price":7.000},{"label":"1 كيلو","price":14.000}]'::jsonb where "Name" = 'هيل أمريكي رقم 3';
update products set variants = '[{"label":"50 جرام","price":0.300}]'::jsonb where "Name" = 'شنه شيبه';
update products set variants = '[{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'قهوة نيباري ميسور رقم1';
update products set variants = '[{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'قهوة نيباري ميسور رقم2';
update products set variants = '[{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'قهوة نيباري ميسور رقم3';
update products set variants = '[{"label":"250 جرام","price":1.500},{"label":"500 جرام","price":3.000},{"label":"1 كيلو","price":6.000}]'::jsonb where "Name" = 'قهوة شمالي';
update products set variants = '[{"label":"250 جرام","price":1.500},{"label":"500 جرام","price":3.000},{"label":"1 كيلو","price":6.000}]'::jsonb where "Name" = 'قهوة تركية حب';
update products set variants = '[{"label":"250 جرام","price":1.130},{"label":"500 جرام","price":2.250},{"label":"1 كيلو","price":4.500}]'::jsonb where "Name" = 'قهوة هرري رقم2';
update products set variants = '[{"label":"250 جرام","price":1.750},{"label":"500 جرام","price":3.500},{"label":"1 كيلو","price":7.000}]'::jsonb where "Name" = 'قهوة برية';
update products set variants = '[{"label":"250 جرام","price":1.750},{"label":"500 جرام","price":3.500},{"label":"1 كيلو","price":7.000}]'::jsonb where "Name" = 'قهوة خولاني';
update products set variants = '[{"label":"100 جرام","price":0.700},{"label":"250 جرام","price":1.750},{"label":"500 جرام","price":3.500},{"label":"1 كيلو","price":7.000}]'::jsonb where "Name" = 'مسمار قرنفل فله';
update products set variants = '[{"label":"100 جرام","price":0.500},{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'زنجبيل مطحون فله';
update products set variants = '[{"label":"250 جرام","price":0.750},{"label":"500 جرام","price":1.500},{"label":"1 كيلو","price":3.000}]'::jsonb where "Name" = 'زبيب أسود';
update products set variants = '[{"label":"250 جرام","price":0.750},{"label":"500 جرام","price":1.500},{"label":"1 كيلو","price":3.000}]'::jsonb where "Name" = 'كشمش أبيض';
update products set variants = '[{"label":"100 جرام","price":0.500},{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'لوز حامض';
update products set variants = '[{"label":"100 جرام","price":0.500},{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'لوز ني';
update products set variants = '[{"label":"100 جرام","price":0.500},{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'فستق حامض';
update products set variants = '[{"label":"100 جرام","price":0.500},{"label":"250 جرام","price":1.250},{"label":"500 جرام","price":2.500},{"label":"1 كيلو","price":5.000}]'::jsonb where "Name" = 'فستق ني';
