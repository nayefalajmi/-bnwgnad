-- ════════════════════════════════════════════════════════════════
--  منتجات "حصري بن وقناد" — أوصاف تسويقية + دمج متغيرات + فئة (id 1)
--
--  - يضيف فئة "حصري بن وقناد" (category_ids = 1) لكل منتج مع إبقاء فئته الأصلية.
--  - يضيف وصفاً تسويقياً احترافياً بالعربي لكل منتج.
--  - يدمج قهوة الفاخرة (600/900) وقهوة بن وقناد (600/900) كمتغيرات،
--    ويحذف العبوة المكرّرة.
--  - يعيد تسمية "خلطة المحل هيل وزعفران 120جرام" إلى "خلطة بن وقناد".
--  - يضيف منتجاً جديداً: قهوة الجنوبي الفاخرة 900جرام.
--
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
-- ════════════════════════════════════════════════════════════════

begin;

-- دالة مساعدة مصغّرة: إضافة الفئة 1 دون تكرار (تعبير مضمّن في كل تحديث)
-- category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end

-- ─────────── تمور / حلويات حصرية ───────────
update products set
  "Price" = 3.250,
  "Description" = 'تمرٌ فاخرٌ مُعتّقٌ بعنايةٍ، طريّ القوام غنيّ المذاق، يُقدَّم بلمسة بن وقناد الأصيلة ليكون رفيق فناجين القهوة ولحظات الكرم.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 74;   -- تمرية بن وقناد

update products set
  "Price" = 3.500,
  "Description" = 'حلوى الرنجينة الكويتية الأصيلة؛ تمرٌ معجونٌ بالطحين المحمّص والهيل بنكهةٍ دافئةٍ وقوامٍ ذائبٍ يعيد إليك أصالة المائدة الخليجية.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 81;   -- رنجينة بن وقناد

update products set
  "Price" = 3.000,
  "Description" = 'الشعثة بالأقِط على الطريقة الكويتية العريقة؛ مزيجٌ متجانسٌ من التمر والأقِط بنكهةٍ ريفيةٍ غنيةٍ وصنعةٍ بيتيةٍ بطابع بن وقناد.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 82;   -- شعثة اقط بن وقناد

update products set
  "Price" = 3.500,
  "Description" = 'صينية تمرية مُعدّة بإتقانٍ تجمع طراوة التمر ودفء الهيل في حجمٍ عمليٍّ يليق بضيافة العائلة والجلسات القصيرة.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 84;   -- صينية تمرية صغيرة

update products set
  "Price" = 5.500,
  "Description" = 'صينية تمرية وافرةٌ لموائد المناسبات والعزائم؛ تمرٌ فاخرٌ بنكهةٍ غنيةٍ وتقديمٍ أنيقٍ يكفي الجمع ويزيّن السفرة.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 85;   -- صينية تمرية كبيرة

update products set
  "Price" = 1.250,
  "Description" = 'دبس التمر الطبيعي الخالص، مُستخلصٌ من أجود أنواع التمر دون أي إضافات؛ حلاوةٌ طبيعيةٌ وقيمةٌ غذائيةٌ عاليةٌ لإفطارك وحلوياتك.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 20;   -- دبس تمر

-- ─────────── خلطات / شاي / بهارات حصرية ───────────
update products set
  "Name" = 'خلطة بن وقناد',
  "Price" = 1.500,
  "Description" = 'خلطة بن وقناد المميزة من الهيل والزعفران الفاخر؛ نكهةٌ عطريةٌ آسرةٌ ترتقي بقهوتك العربية وتمنحها لوناً ذهبياً ورائحةً لا تُقاوم.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 95;   -- (سابقاً: خلطة المحل هيل وزعفران 120جرام)

update products set
  "Price" = 2.500,
  "Description" = 'شاي كرك بن وقناد بخلطته السرية من الشاي الأحمر والبهارات العطرية؛ قوامٌ كثيفٌ ونكهةٌ دافئةٌ تعيد لك طعم الكرك الأصيل في كل كوب.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 109;  -- شاي كرك بن وقناد 500جرام

update products set
  "Price" = 1.500,
  "Description" = 'هردة بن وقناد الأصيلة بلونها الذهبي ونكهتها العطرية الدافئة؛ تُضفي على أطباقك ومشروباتك لمسةً صحيةً ومذاقاً مميزاً.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 23;   -- هردة بن وقناد

-- ─────────── قهوة حصرية ───────────
-- دمج: قهوة الفاخرة (نُبقي id 113 ونحذف 112 المكرّر) — 600/900 كمتغيرات
update products set
  "Name" = 'قهوة الفاخرة',
  "Price" = 3.500,
  variants = '[{"label":"600 جرام","price":3.5},{"label":"900 جرام","price":4.0}]'::jsonb,
  "Description" = 'قهوة الفاخرة من بن وقناد؛ حبوبٌ منتقاةٌ ومحمّصةٌ بإتقانٍ مع لمسةٍ كرميةٍ من الهيل، لمذاقٍ عربيٍّ فاخرٍ متوازنٍ يليق بأرقى المجالس. متوفرة بحجمي 600 و900 جرام.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 113;
delete from products where id = 112;   -- قهوة الفاخرة 900جرام (مكرّر، دُمج كمتغيّر)

-- دمج: قهوة بن وقناد (نُبقي id 117 ونحذف 116 المكرّر) — 600/900 كمتغيرات
update products set
  "Name" = 'قهوة بن وقناد',
  "Price" = 3.000,
  variants = '[{"label":"600 جرام","price":3.0},{"label":"900 جرام","price":3.75}]'::jsonb,
  "Description" = 'قهوة بن وقناد الأصيلة؛ تحميصةٌ ذهبيةٌ خفيفةٌ بنكهةٍ عربيةٍ عريقةٍ وحضورٍ عطريٍّ يميّز فنجانك. متوفرة بحجمي 600 و900 جرام.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 117;
delete from products where id = 116;   -- قهوة بن وقناد 900جرام (مكرّر، دُمج كمتغيّر)

update products set
  "Price" = 4.500,
  "Description" = 'قهوة رسلان الفاخرة؛ تحميصةٌ متقنةٌ بنكهةٍ غنيةٍ وعمقٍ مميزٍ تمنح عشّاق القهوة العربية تجربةً أصيلةً في كل فنجان.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 122;  -- قهوة رسلان

update products set
  "Price" = 4.500,
  "Description" = 'قهوة عربية الكيف؛ خلطةٌ متوازنةٌ بنكهةٍ عربيةٍ أصيلةٍ ولمسةٍ من الهيل، رفيقُ جلسات الكيف والاسترخاء بامتياز.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 125;  -- قهوة عربية الكيف

update products set
  "Price" = 3.750,
  "Description" = 'قهوة رحيق اليمن؛ من أجود الحبوب اليمنية العريقة، بنكهةٍ عميقةٍ ورائحةٍ آسرةٍ تنقلك إلى أصالة القهوة اليمنية الأصيلة.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 121;  -- قهوة رحيق اليمن

update products set
  "Price" = 5.000,
  "Description" = 'قهوة سارة الفاخرة؛ تحميصةٌ ذهبيةٌ بنكهةٍ ناعمةٍ متوازنةٍ ولمسةٍ عطريةٍ راقية، خيارُ المجالس المميزة وضيافة الكرام.',
  category_ids = case when 1 = any(category_ids) then category_ids else array_append(category_ids,1) end
where id = 123;  -- قهوة سارة

-- ─────────── منتج جديد ───────────
insert into products ("Name", "Price", "Category", category_ids, "Available", "Description")
values (
  'قهوة الجنوبي الفاخرة 900جرام',
  4.000,
  'قهوة',
  array[1, 9],
  true,
  'قهوة الجنوبي الفاخرة؛ تحميصةٌ جنوبيةٌ أصيلةٌ بنكهةٍ قويةٍ وحضورٍ عطريٍّ غنيٍّ تمنح فنجانك طابعاً مميزاً وعبقاً لا يُنسى. عبوة 900 جرام.'
);

commit;
