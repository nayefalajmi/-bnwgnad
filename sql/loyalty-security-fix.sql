-- ════════════════════════════════════════════════════════════════
--  إصلاح أمني لنظام الولاء
--
--  المشكلة: Postgres يمنح EXECUTE لـ PUBLIC تلقائياً عند إنشاء أي دالة،
--  فكان الزائر (anon) قادراً على استدعاء award_loyalty ومنح نفسه نقاطاً.
--  الحل: نلغي صلاحية PUBLIC على award_loyalty ونُبقيها للأدمن فقط.
--
--  شغّله مرة واحدة في: Supabase Dashboard ▸ SQL Editor ▸ Run.
--  (إن شغّلت نسخة loyalty.sql المحدّثة بالكامل فلا حاجة لهذا الملف.)
-- ════════════════════════════════════════════════════════════════

revoke execute on function award_loyalty(text, int) from public;
revoke execute on function award_loyalty(text, int) from anon;
grant  execute on function award_loyalty(text, int) to authenticated;

-- تنظيف بيانات اختبار التحقق (هاتف وهمي مُنح 50 نقطة أثناء الفحص)
delete from loyalty_points where customer_phone = '99999999';
