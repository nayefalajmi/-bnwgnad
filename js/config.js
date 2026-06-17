const SUPABASE_URL = 'https://ymopznkoddniibrxbeav.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6tFnUzqgHYp2Zu3Px4YAtw_QJLLWiOk';

// نحفظ الـ client فوق window.supabase حتى يراه كل الكود
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
