/* ============================================================
   ОБЛАЧНАЯ СИНХРОНИЗАЦИЯ (Supabase) — вход с любого устройства
   ------------------------------------------------------------
   Пока поля пустые — сайт работает в локальном режиме (как раньше).
   Чтобы включить вход с ЛЮБОГО устройства, выполните 3 шага:

   1) Зарегистрируйтесь на https://supabase.com и создайте бесплатный
      проект (New project). Запомните пароль базы.

   2) Откройте в проекте «SQL Editor» → New query, вставьте и выполните:

      create table if not exists accounts (
        username     text primary key,
        password     text,
        admin        boolean default false,
        super        boolean default false,
        device       text,
        registered   bigint,
        last_device  text,
        last_login   bigint,
        progress     jsonb default '{}'::jsonb
      );
      alter table accounts enable row level security;
      create policy "public access" on accounts
        for all using (true) with check (true);

   3) В проекте откройте Settings → API и скопируйте сюда:
        • Project URL  →  window.SUPABASE_URL
        • anon public key  →  window.SUPABASE_KEY
      Затем сохраните файл и обновите сайт.
   ============================================================ */

window.SUPABASE_URL = 'https://ocrgpmlhtjghiamhbrhv.supabase.co';
window.SUPABASE_KEY = 'sb_publishable_7pMdJMn4QQdpPTTIZF2P-w_pNC0KSPc';
