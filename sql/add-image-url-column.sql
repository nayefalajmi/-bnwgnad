-- ════════════════════════════════════════════════════════════════
--  إصلاح: إضافة/تعديل المنتجات يفشل برسالة خطأ عن رابط الصورة
--
--  السبب: جدول products لا يحتوي على عمود image_url، بينما لوحة
--  التحكم (admin.html) والمتجر (index.html) يعتمدان عليه عند الحفظ
--  والعرض. أي حفظ يرسل image_url فيفشل بالخطأ:
--    PGRST204 — Could not find the 'image_url' column of 'products'
--
--  الحل: إضافة العمود مرة واحدة.
--  شغّل هذا في Supabase Dashboard ▸ SQL Editor ▸ New query ▸ Run.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url text;

-- (اختياري) تأكيد أن العمود أُضيف:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'products' ORDER BY ordinal_position;
