-- ════════════════════════════════════════════════════════════════
--  تفعيل Row Level Security على جدولي orders و products
--
--  orders:   الإضافة (insert) متاحة للزوار (anon) — عشان يطلبون.
--            القراءة/التعديل/الحذف للمسجّلين (authenticated) فقط.
--  products: القراءة (select) متاحة للجميع — عشان يشوفون المنتجات.
--            الإضافة/التعديل/الحذف للمسجّلين (authenticated) فقط.
--
--  ⚠️ تحذير: لوحة التحكم (admin.html) تستخدم حالياً مفتاح anon العام،
--  وليست جلسة "authenticated". بعد تشغيل هذا، ستتوقف اللوحة عن قراءة
--  الطلبات وحفظ/حذف المنتجات حتى يتم تسجيل الدخول عبر Supabase Auth.
--  (انظر الشرح أسفل المحادثة.)
--
--  شغّله في: Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run.
-- ════════════════════════════════════════════════════════════════

-- ─────────────── ORDERS ───────────────
alter table orders enable row level security;

drop policy if exists "orders_insert_anon" on orders;
drop policy if exists "orders_select_auth" on orders;
drop policy if exists "orders_update_auth" on orders;
drop policy if exists "orders_delete_auth" on orders;

-- الزوار يقدرون ينشئون طلباً فقط
create policy "orders_insert_anon"
  on orders for insert
  to anon, authenticated
  with check (true);

-- القراءة للمسجّلين فقط (الأدمن)
create policy "orders_select_auth"
  on orders for select
  to authenticated
  using (true);

-- التعديل للمسجّلين فقط
create policy "orders_update_auth"
  on orders for update
  to authenticated
  using (true)
  with check (true);

-- الحذف للمسجّلين فقط
create policy "orders_delete_auth"
  on orders for delete
  to authenticated
  using (true);


-- ─────────────── PRODUCTS ───────────────
alter table products enable row level security;

drop policy if exists "products_select_all"  on products;
drop policy if exists "products_insert_auth"  on products;
drop policy if exists "products_update_auth"  on products;
drop policy if exists "products_delete_auth"  on products;

-- الجميع يشوفون المنتجات
create policy "products_select_all"
  on products for select
  to anon, authenticated
  using (true);

-- الإضافة للمسجّلين فقط
create policy "products_insert_auth"
  on products for insert
  to authenticated
  with check (true);

-- التعديل للمسجّلين فقط
create policy "products_update_auth"
  on products for update
  to authenticated
  using (true)
  with check (true);

-- الحذف للمسجّلين فقط
create policy "products_delete_auth"
  on products for delete
  to authenticated
  using (true);
