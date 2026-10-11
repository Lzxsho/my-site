/* ==========================================================================
   export-to-supabase.js —— 把本机 db/site.db 的内容搬到 Supabase 云端
   --------------------------------------------------------------------------
   用法（在 my-site/ 目录下打开终端）：

     node db/export-to-supabase.js --url https://xxxx.supabase.co --key <service_role_key>

   ★ --key 必须是 service_role 那把「超级钥匙」，不是 anon key ——
     因为脚本要清空并重写整张表，anon key 没有写权限。
     service_role key 只在本机跑这个脚本时用，**绝不能**写进前端代码、
     也绝不能 push 到 GitHub。用完可以到 Supabase 后台 Rotate 换一把。

   脚本做的事（可重复执行，不会产生重复数据）：
     读 site.db 六张表 → 逐张「先清空、再整批写入」→ 打印各表条数

   前置条件：
     1. Supabase 后台 SQL Editor 里已经跑过 supabase.sql（表都建好了）
     2. Node >= 22.5（用到内置的 node:sqlite）
   ========================================================================== */
'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

/* ---------------- 命令行参数 ---------------- */
function parseArgs() {
  const a = process.argv.slice(2);
  const get = function (k) {
    const i = a.indexOf('--' + k);
    return (i > -1 && a[i + 1]) ? a[i + 1] : '';
  };
  return {
    url: get('url').replace(/\/+$/, ''),   /* 末尾多余的斜杠去掉，免得拼出双斜杠 */
    key: get('key'),
    only: get('only')                      /* 可选：只导某一张表，调试用 */
  };
}

const args = parseArgs();
if (!args.url || !args.key) {
  console.error('用法：node db/export-to-supabase.js --url <Project URL> --key <service_role key>');
  console.error('例：node db/export-to-supabase.js --url https://abcdefgh.supabase.co --key eyJhbGciOi...');
  process.exit(1);
}

const dbPath = path.join(__dirname, 'site.db');
let db;
try {
  db = new DatabaseSync(dbPath);
} catch (e) {
  console.error('打不开 ' + dbPath + '：' + e.message);
  process.exit(1);
}

/* ---------------- 一次 REST 请求 ---------------- */
async function req(table, pathStr, opts) {
  const o = opts || {};
  const res = await fetch(args.url + '/rest/v1/' + table + pathStr, {
    method: o.method || 'GET',
    headers: {
      apikey: args.key,
      Authorization: 'Bearer ' + args.key,
      'Content-Type': 'application/json'
    },
    body: o.body !== undefined ? JSON.stringify(o.body) : undefined
  });

  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }

  if (!res.ok) {
    throw new Error(table + ' ' + (o.method || 'GET') + ' 失败：' + res.status + ' ' + raw.slice(0, 300));
  }
  return data;
}

/* ---------------- 整表导入：先清空，再整批写 ---------------- */
async function importTable(table, sql, rowMap) {
  if (args.only && args.only !== table) { return; }

  let rows;
  try {
    rows = db.prepare(sql).all().map(rowMap);
  } catch (e) {
    console.log('  ' + table + '：跳过（' + e.message + '）');
    return;
  }

  if (!rows.length) { console.log('  ' + table + '：0 条（跳过）'); return; }

  await req(table, '?id=gt.0', { method: 'DELETE' });   /* 清空 —— 保证可重复执行 */
  await req(table, '', { method: 'POST', body: rows }); /* 整批写入 */
  console.log('  ' + table + '：导入 ' + rows.length + ' 条');
}

/* ---------------- 主流程 ---------------- */
async function main() {
  console.log('开始导出 ' + dbPath + ' → ' + args.url);
  console.log('');

  /* 1. 文章 —— site.db 里 tags 是 "A,B" 字符串，云端也是，直接搬 */
  await importTable('articles', 'SELECT * FROM articles ORDER BY id', function (r) {
    return {
      title: r.title,
      category: r.category,
      date: r.date,
      tags: r.tags,
      series: r.series,
      cover: r.cover,
      excerpt: r.excerpt,
      content: r.content
    };
  });

  /* 2. 小诗 */
  await importTable('poems', 'SELECT * FROM poems ORDER BY id', function (r) {
    return { title: r.title, date: r.date, text: r.text };
  });

  /* 3. 唱片 —— 按 sort 排序，云端也按 sort 排 */
  await importTable('music', 'SELECT * FROM music ORDER BY sort, id', function (r) {
    return {
      name: r.name,
      artist: r.artist,
      note: r.note,
      duration: r.duration,
      genre: r.genre,
      src: r.src,
      url: r.url,
      sort: r.sort
    };
  });

  /* 4. 技能 */
  await importTable('skills', 'SELECT * FROM skills ORDER BY sort, id', function (r) {
    return { name: r.name, value: r.value, level: r.level, note: r.note, sort: r.sort };
  });

  /* 5. 自我介绍 —— site.db 里是 snake_case，云端是 camelCase，逐个字段对上 */
  if (!args.only || args.only === 'profile') {
    const prof = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    if (!prof) {
      console.log('  profile：0 条（跳过）');
    } else {
      await req('profile', '?id=gt.0', { method: 'DELETE' });
      await req('profile', '', {
        method: 'POST',
        body: {
          id: 1,
          siteName: prof.site_name,
          siteEn: prof.site_en,
          brandFirst: prof.brand_first,
          brandSecond: prof.brand_second,
          owner: prof.owner,
          slogan: prof.slogan,
          city: prof.city,
          email: prof.email,
          github: prof.github,
          blog: prof.blog,
          heroEyebrow: prof.hero_eyebrow,
          heroDesc: prof.hero_desc,
          heroTags: prof.hero_tags,
          intro: prof.intro,
          aboutParagraphs: prof.about_paragraphs,
          keywords: prof.keywords
        }
      });
      console.log('  profile：导入 1 条');
    }
  }

  /* 6. 留言 —— 有 parent_id（楼中楼）就一起搬 */
  await importTable('comments', 'SELECT * FROM comments ORDER BY id', function (r) {
    return {
      target: r.target,
      name: r.name,
      content: r.content,
      parentId: r.parent_id || null
    };
  });

  console.log('');
  console.log('完成。到 Supabase 后台 Table Editor 核对各表条数。');
  console.log('（再跑一遍不会重复 —— 每张表都是「先清空再写入」）');
}

main().catch(function (e) {
  console.error('');
  console.error('导出失败：' + e.message);
  console.error('');
  console.error('常见原因：');
  console.error('  · 403 / 401 → 用的是 anon key，要换成 service_role key');
  console.error('  · 42P01 表不存在 → supabase.sql 还没在 SQL Editor 里跑过');
  console.error('  · 42703 列不存在 → 云端表结构旧了，重跑一遍 supabase.sql');
  process.exit(1);
});
