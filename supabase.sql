-- ==========================================================================
--  Shuoscape 留言表 —— 让「任何人打开网站都能看到同一批留言」
-- --------------------------------------------------------------------------
--  怎么用：Supabase 后台 → 左边 SQL Editor → 把这一段整段粘进去 → Run
--          跑完不用改代码，刷新网页就能看到留言框下面写着「留言存在云端」
-- ==========================================================================

-- 1. 表：一条留言一行
create table if not exists public.comments (
  id          bigserial primary key,
  target      text        not null,              -- 留言挂在谁下面：article-3 / poem-7
  name        text        not null default '匿名',
  content     text        not null,
  created_at  timestamptz not null default now()
);

-- 按 target 查得快一点
create index if not exists comments_target_idx on public.comments (target);

-- 2. 打开行级安全（不开的话下面几条规则不生效）
alter table public.comments enable row level security;

-- 3. 访问规则
--    · 谁都能看留言
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments
  for select using (true);

--    · 谁都能写（游客不用登录就能留言）
--      想防刷的话，给 content 加个长度限制就够了，见文件最后
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert with check (true);

--    · 删除：**不在这里开**。
--      开了就等于把 anon key 发给每个访客、同时允许他删任意一条留言 ——
--      绕过网页调一次 REST 接口，留言就全没了。
--      网页上那个 ✕ 现在只是提示你去后台删（见 js/comments.js 的 remove()）。
--      要去哪删：Supabase 后台 → Table Editor → comments 表 → 勾上那条 → Delete row。

-- 4. 两道小闸：名字别太长、内容别太长（Server 端也有同样的限制）
alter table public.comments add constraint comments_name_len check (char_length(name) <= 24);
alter table public.comments add constraint comments_content_len check (char_length(content) <= 1000);

-- 5.（可选）如果你确实想在网页上直接删，用服务角色密钥自己搭一层后端，
--    让删除请求先过你的服务器 —— 千万别把 service_role key 放进前端。
