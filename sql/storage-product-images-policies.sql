-- ════════════════════════════════════════════════════════════════
--  إصلاح: رفع صور المنتجات يفشل بالخطأ
--    "new row violates row-level security policy"
--
--  السبب: جدول storage.objects عليه RLS مفعّل، وما فيه سياسة تسمح
--  لمفتاح anon بالرفع (INSERT) على باكت product-images.
--
--  الحل: سياسات تسمح بالقراءة/الرفع/التعديل/الحذف على هذا الباكت فقط.
--  شغّل هذا في Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run.
--
--  ⚠️ تنبيه أمني: "to public" تسمح لأي شخص يملك الـ anon key (وهو
--  مكشوف في كود الواجهة) برفع وحذف ملفات في هذا الباكت دون قيود.
--  مقبول لباكت صور منتجات عام، لكنه ليس آمناً لبيانات حساسة.
-- ════════════════════════════════════════════════════════════════

-- قراءة عامة (لعرض الصور)
drop policy if exists "product-images read"   on storage.objects;
create policy "product-images read"
  on storage.objects for select
  to public
  using ( bucket_id = 'product-images' );

-- رفع (INSERT)
drop policy if exists "product-images insert" on storage.objects;
create policy "product-images insert"
  on storage.objects for insert
  to public
  with check ( bucket_id = 'product-images' );

-- تعديل/استبدال (UPDATE / upsert)
drop policy if exists "product-images update" on storage.objects;
create policy "product-images update"
  on storage.objects for update
  to public
  using      ( bucket_id = 'product-images' )
  with check ( bucket_id = 'product-images' );

-- حذف (DELETE)
drop policy if exists "product-images delete" on storage.objects;
create policy "product-images delete"
  on storage.objects for delete
  to public
  using ( bucket_id = 'product-images' );
