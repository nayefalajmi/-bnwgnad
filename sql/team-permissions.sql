-- ════════════════════════════════════════════════════════════════
--  نظام صلاحيات الفريق
--
--  - جدول team_members: إيميل المستخدم + خريطة صلاحيات (jsonb) + تاريخ.
--  - المالك (bnwgnad@gmail.com) له صلاحيات كاملة ويدير صلاحيات الجميع.
--  - البايع (مستخدم عادي) يقرأ صفّه فقط ليعرف صلاحياته — لا يرى/يعدّل غيره.
--
--  مفاتيح الصلاحيات المستخدمة في الواجهة:
--    orders_view, orders_status, orders_delete,
--    products_view, products_edit, products_add, products_delete,
--    zones, categories, stats, accountant, banner, loyalty, discounts
--
--  ملاحظة: التحكم هنا على مستوى واجهة لوحة التحكم (إظهار/إخفاء الأقسام
--  والأزرار). أنشئ مستخدمي البايعين من Supabase ▸ Authentication ▸ Users.
--
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
-- ════════════════════════════════════════════════════════════════

create table if not exists team_members (
  email       text primary key,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now()
);

alter table team_members enable row level security;

drop policy if exists "team_owner_all"   on team_members;
drop policy if exists "team_self_select" on team_members;

-- المالك: تحكم كامل (قراءة/إضافة/تعديل/حذف) لكل الصفوف
create policy "team_owner_all" on team_members for all to authenticated
  using      (lower(auth.email()) = 'bnwgnad@gmail.com')
  with check (lower(auth.email()) = 'bnwgnad@gmail.com');

-- المستخدم العادي: يقرأ صفّه فقط
create policy "team_self_select" on team_members for select to authenticated
  using (lower(email) = lower(auth.email()));
