-- ==========================================================================
--  Shuoscape 内容上云 —— 建表 + 访问策略
--  --------------------------------------------------------------------
--  怎么用：Supabase 后台 → 左边 SQL Editor → 把这一段整段粘进去 → Run
--          执行一次即可；表已存在时不会重复创建（if not exists）
--
--  ★ 列名一律用 camelCase，和 js/data.js 里的字段名一字不差，
--    这样前端 CloudStore 可以直接读写，不用做任何字段映射。
--
--  ★ 权限的两条铁律（改之前先想清楚）：
--      1. 内容表（文章/小诗/唱片/资料/技能/学习资料）：谁都能读，
--         **只有 admins 表里登记过的管理员能写**（is_shuo_admin() 函数把关）
--      2. 留言表：谁都能看、谁都能写（游客留言是核心功能），但**不开放删除**
--         想删留言去后台 Table Editor 手动删，更安全
--      3. 个人记录表（user_progress）：**只有本人能读写自己那一行**，
--         别人（包括管理员）读不到 —— 游客的练习记录只属于他自己
--
--  ★ 整段可以反复执行：建表用 if not exists，策略先 drop 再 create，
--    已经建过的库再跑一遍只会补上缺的东西，不会丢数据。
-- ==========================================================================

-- 1. 文章表
create table if not exists public.articles (
  id          bigserial primary key,
  title       text not null,
  category    text,
  date        text,
  tags        text,
  series      text,
  cover       text,
  excerpt     text,
  content     text,
  createdAt   timestamptz not null default now()
);
create index if not exists articles_date_idx on public.articles (date desc);
create index if not exists articles_category_idx on public.articles (category);

-- 2. 小诗表
create table if not exists public.poems (
  id          bigserial primary key,
  title       text,
  date        text,
  text        text,
  createdAt   timestamptz not null default now()
);
create index if not exists poems_date_idx on public.poems (date desc);

-- 3. 唱片表
create table if not exists public.music (
  id          bigserial primary key,
  name        text not null,
  artist      text,
  note        text,
  duration    text,
  genre       text,
  src         text,
  url         text,
  sort        integer default 0
);

-- 4. 自我介绍表（全站只一行，id 固定 = 1）
create table if not exists public.profile (
  id               bigint primary key check (id = 1),
  siteName         text,
  siteEn           text,
  brandFirst       text,
  brandSecond      text,
  owner            text,
  slogan           text,
  city             text,
  email            text,
  github           text,
  blog             text,
  heroEyebrow      text,
  heroDesc         text,
  heroTags         text,
  intro            text,
  aboutParagraphs  text,
  keywords         text
);

-- 5. 技能表
create table if not exists public.skills (
  id      bigserial primary key,
  name    text not null,
  value   integer default 0,
  level   text default '在学',
  note    text,
  sort    integer default 0
);

-- 6. 留言表（游客可看可写，不可删）
create table if not exists public.comments (
  id          bigserial primary key,
  target      text        not null,              -- 留言挂在谁下面：article-3 / poem-7
  name        text        not null default '匿名',
  content     text        not null,
  createdAt   timestamptz not null default now(),
  parentId    bigint,                            -- 楼中楼：回复谁；空 = 顶层留言
  userEmail   text                               -- 留言人的登录邮箱（游客留言为空）
);
-- 老库补列：表已经建过的话，把新列补上（已有的话什么也不做）
alter table public.comments add column if not exists userEmail text;
create index if not exists comments_target_idx on public.comments (target);
create index if not exists comments_parent_idx on public.comments (parentId);
-- 两道小闸：名字别太长、内容别太长（server.js 端也有同样的限制）
--   外面包一层 do ... 是为了「再跑一次也不报错」——
--   PostgreSQL 没有 add constraint if not exists，重复添加会直接报 duplicate_object
do $$
begin
  alter table public.comments add constraint comments_name_len check (char_length(name) <= 24);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.comments add constraint comments_content_len check (char_length(content) <= 1000);
exception when duplicate_object then null;
end $$;

-- 7.（可选）学习打卡进度表：全站一行，存整份进度 JSON
create table if not exists public.study_progress (
  id   bigint primary key check (id = 1),
  key  text not null default 'owner',
  data text not null default '{}'
);

-- 8. 管理员名单：一张只有邮箱的表，**写策略全靠它把关**
--    ★ 谁是管理员在这里登记（一行一个邮箱）：
--        insert into public.admins (email) values ('你的邮箱@qq.com');
--    前端 js/config.js 的 adminEmails 只管「按钮显不显示」，
--    这张表才管「数据库让不让写」—— 两边填同一批邮箱。
create table if not exists public.admins (
  email      text primary key,
  createdAt  timestamptz not null default now()
);
alter table public.admins enable row level security;
-- admins 表本身不给任何策略：网页上谁也读不到、改不了，
-- 只有 Supabase 后台（service_role）能维护它 —— 名单不能泄露给前端。

-- 9. 英语学习资料表 —— 管理员共享 + 访客私人，两种资料混在一张表里
--    words 直接存 JSON 数组 [{en,zh}, …]，前端拿来就用，不用拆表
create table if not exists public.en_materials (
  id         text primary key,                    -- 前端生成的 'm' + 时间戳
  name       text not null,
  date       text,
  words      jsonb   not null default '[]',
  owner      text,                                 -- ★ 归属，见下面说明
  createdAt  timestamptz not null default now(),
  updatedAt  timestamptz not null default now()
);

-- ★ owner 这一列决定资料「谁能看到」（由 RLS 强制执行）：
--     owner 为空 / NULL  → 管理员上传的共享资料，所有人（包括没登录的）都能看到
--     owner = 某个邮箱   → 访客上传的私人资料，只有本人能看到
--   前端不需要自己过滤：RLS 会让每个账号只拿回「公共的 + 自己的」，
--   别人的私人资料在网络层面就取不到，不是靠前端藏起来。
alter table public.en_materials add column if not exists owner text;
create index if not exists en_materials_owner_idx on public.en_materials (owner);

-- ==========================================================================
--  行级安全（RLS）：这一节是「上云能不能安全用」的关键，顺序不能乱
-- ==========================================================================

alter table public.articles       enable row level security;
alter table public.poems          enable row level security;
alter table public.music          enable row level security;
alter table public.profile        enable row level security;
alter table public.skills         enable row level security;
alter table public.comments       enable row level security;
alter table public.study_progress enable row level security;
alter table public.en_materials   enable row level security;

-- 「他是管理员吗」：当前登录邮箱在不在 admins 表里。
--   security definer：函数用建表者的权限读 admins，
--   这样即使 admins 表对网页完全封闭，函数照样能查 —— 名单不泄露，判断照做。
create or replace function public.is_shuo_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- 内容表：任何人都能读（访客浏览）
drop policy if exists "articles_read"  on public.articles;
drop policy if exists "poems_read"     on public.poems;
drop policy if exists "music_read"     on public.music;
drop policy if exists "profile_read"   on public.profile;
drop policy if exists "skills_read"    on public.skills;
drop policy if exists "study_progress_read" on public.study_progress;
drop policy if exists "en_materials_read"   on public.en_materials;
create policy "articles_read" on public.articles  for select using (true);
create policy "poems_read"    on public.poems     for select using (true);
create policy "music_read"    on public.music     for select using (true);
create policy "profile_read"  on public.profile   for select using (true);
create policy "skills_read"   on public.skills    for select using (true);
create policy "study_progress_read" on public.study_progress for select using (true);
-- 学习资料的读权限 ★ 和别的表不一样 —— 不是「谁都能读」：
--   公共资料（owner 空）谁都能读；私人资料（owner = 邮箱）只有本人能读。
--   管理员也读不到别人的私人资料（和用户练习记录 user_progress 一样，隐私优先）。
create policy "en_materials_read"   on public.en_materials   for select using (
  coalesce(owner, '') = ''
  or lower(owner) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 内容表：**只有管理员**能增删改（admins 表 + is_shuo_admin() 把关）
--   ★ 为什么不用 auth.role() = 'authenticated'：
--     那等于「所有注册用户都能改全站内容」。现在注册是开放的，
--     写权限必须收窄到 admins 名单里的人 —— 普通注册用户只能留言。
--   ★ 一张表的 policy 名字不能重复，所以 insert/update/delete 各起一个名；
--     先 drop if exists 再 create，整段可以重复执行。
--   ⚠️ 2026-10-11 踩过的坑：下面这排 drop 必须和 create **同名**。
--     曾经写成 drop 旧名 *_write、create 新名 *_ins —— 旧库上 _ins 已经存在，
--     drop 掉的是不存在的 _write，create 一跑就报
--     「policy "articles_ins" ... already exists」整段卡死。
--     现在按 create 的名字逐个 drop，另留一行 *_write 兼容更老的残留。
drop policy if exists "articles_ins" on public.articles;
drop policy if exists "articles_upd" on public.articles;
drop policy if exists "articles_del" on public.articles;
drop policy if exists "articles_write" on public.articles;

drop policy if exists "poems_ins" on public.poems;
drop policy if exists "poems_upd" on public.poems;
drop policy if exists "poems_del" on public.poems;
drop policy if exists "poems_write"    on public.poems;

drop policy if exists "music_ins" on public.music;
drop policy if exists "music_upd" on public.music;
drop policy if exists "music_del" on public.music;
drop policy if exists "music_write"    on public.music;

drop policy if exists "profile_ins" on public.profile;
drop policy if exists "profile_upd" on public.profile;
drop policy if exists "profile_del" on public.profile;
drop policy if exists "profile_write"  on public.profile;

drop policy if exists "skills_ins" on public.skills;
drop policy if exists "skills_upd" on public.skills;
drop policy if exists "skills_del" on public.skills;
drop policy if exists "skills_write"   on public.skills;

drop policy if exists "study_progress_ins" on public.study_progress;
drop policy if exists "study_progress_upd" on public.study_progress;
drop policy if exists "study_progress_write" on public.study_progress;

drop policy if exists "en_materials_ins" on public.en_materials;
drop policy if exists "en_materials_upd" on public.en_materials;
drop policy if exists "en_materials_del" on public.en_materials;
drop policy if exists "en_materials_write"   on public.en_materials;

create policy "articles_ins" on public.articles for insert with check (public.is_shuo_admin());
create policy "articles_upd" on public.articles for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());
create policy "articles_del" on public.articles for delete using (public.is_shuo_admin());

create policy "poems_ins" on public.poems for insert with check (public.is_shuo_admin());
create policy "poems_upd" on public.poems for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());
create policy "poems_del" on public.poems for delete using (public.is_shuo_admin());

create policy "music_ins" on public.music for insert with check (public.is_shuo_admin());
create policy "music_upd" on public.music for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());
create policy "music_del" on public.music for delete using (public.is_shuo_admin());

create policy "profile_ins" on public.profile for insert with check (public.is_shuo_admin());
create policy "profile_upd" on public.profile for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());
create policy "profile_del" on public.profile for delete using (public.is_shuo_admin());

create policy "skills_ins" on public.skills for insert with check (public.is_shuo_admin());
create policy "skills_upd" on public.skills for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());
create policy "skills_del" on public.skills for delete using (public.is_shuo_admin());

create policy "study_progress_ins" on public.study_progress for insert with check (public.is_shuo_admin());
create policy "study_progress_upd" on public.study_progress for update using (public.is_shuo_admin()) with check (public.is_shuo_admin());

-- 学习资料写权限：公共资料只有管理员能动，私人资料只有本人能动。
-- 下面这个条件三处复用，改的时候一起改。
create policy "en_materials_ins" on public.en_materials for insert with check (
  (coalesce(owner, '') = '' and public.is_shuo_admin())                       -- 管理员发共享资料
  or lower(owner) = lower(coalesce(auth.jwt() ->> 'email', ''))               -- 访客存自己的
);
create policy "en_materials_upd" on public.en_materials for update using (
  (coalesce(owner, '') = '' and public.is_shuo_admin())
  or lower(owner) = lower(coalesce(auth.jwt() ->> 'email', ''))
) with check (
  (coalesce(owner, '') = '' and public.is_shuo_admin())
  or lower(owner) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
create policy "en_materials_del" on public.en_materials for delete using (
  (coalesce(owner, '') = '' and public.is_shuo_admin())
  or lower(owner) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- 留言表：谁都能看、谁都能写（游客留言），但不开放删除
--   （网页上云端留言的 ✕ 按钮走 js/comments.js：提示去后台删，不直接调接口）
drop policy if exists "comments_read"   on public.comments;
drop policy if exists "comments_insert" on public.comments;
create policy "comments_read"   on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert with check (true);
--
-- ⚠️ 下面这两行**故意没有**：一旦放开，任何拿到 anon key 的人都能删光留言
-- create policy "comments_delete" on public.comments for delete using (true);
-- 要去哪删：Supabase 后台 → Table Editor → comments 表 → 勾上那条 → Delete row
-- 确实想在网页上删，就自己搭一层后端，让删除请求先过你的服务器 ——
-- 千万**不要**把 service_role key 放进前端。

-- ==========================================================================
--  10. 访客个人记录表 —— 登录用户的练习进度 / 错题本 / C 语言打卡
--  --------------------------------------------------------------------
--  一个人一行，主键就是登录邮箱（前端会话里现成就有，不用再查用户 id）。
--  data 里直接存整份 JSON（错题本、每日练习、没练完的一轮、C 语言打卡…），
--  前端读写一次搞定，不用为每种记录各开一张表。
--
--  ★ 权限：只有本人能看、能改自己那一行（JWT 里的邮箱 = 行的邮箱）。
--    管理员也读不到别人的进度 —— 这是隐私，故意的。
--  ★ 没登录的时候前端照旧存 localStorage，不影响使用；
--    登录后才会同步到这张表，换设备登录就能接着练。
--
--  ⚠️ 这一节是**故意重建**的：最早一版用 uuid 当主键，前端拿不到
--     （要多调一次 /auth/v1/user），改成邮箱主键。表刚上线没有数据，
--     drop 重建零成本 —— 以后**别**再整段重跑（会清掉大家的练习记录！），
--     改结构时改成 alter table 加列。
-- ==========================================================================
drop table if exists public.user_progress;
create table public.user_progress (
  email      text primary key,
  data       jsonb      not null default '{}',
  updatedAt  timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_read" on public.user_progress;
drop policy if exists "user_progress_ins"  on public.user_progress;
drop policy if exists "user_progress_upd"  on public.user_progress;

create policy "user_progress_read" on public.user_progress
  for select using (auth.jwt() ->> 'email' = email);
create policy "user_progress_ins" on public.user_progress
  for insert with check (auth.jwt() ->> 'email' = email);
create policy "user_progress_upd" on public.user_progress
  for update using (auth.jwt() ->> 'email' = email) with check (auth.jwt() ->> 'email' = email);

-- ⚠️ 故意没有 delete 策略：网页端删不掉

-- ==========================================================================
--  11. 登记管理员（已经按你 js/config.js 的 adminEmails 填好了，直接跑即可）
--  --------------------------------------------------------------------
--  on conflict do nothing：重复执行也不会报错、不会产生重复行。
--  要加管理员，照着下面再写一行换邮箱就行。
--
--  ★ 前端 js/config.js 的 adminEmails 和这张表必须是同一批邮箱：
--    前端那份只决定「按钮显不显示」，这张表才决定「数据库让不让写」。
--    两边不一致的表现是：按钮点得动，但保存时报错「new row violates
--    row-level security policy」—— 遇到就回来核对这两处。
-- ==========================================================================
insert into public.admins (email) values ('2625407261@qq.com') on conflict do nothing;
