/* ==========================================================================
   export-to-supabase.js —— 把本机 db/site.db 的内容「全部」搬到 Supabase 云端
   --------------------------------------------------------------------------
   用法（在 my-site/ 目录下打开终端，或者双击 db/同步到云端.bat）：

     方式一（推荐，最省事）—— 用管理员账号登录：
       node db/export-to-supabase.js --email 2625407261@qq.com --password 你的密码

     方式二 —— 用 service_role 超级钥匙：
       node db/export-to-supabase.js --key eyJhbGciOi...

   ▍两种方式有什么区别？
     · 方式一：脚本拿你的账号去 Supabase Auth 换一张 token 再写数据。
       能不能写由 supabase.sql 里的 RLS 策略决定 —— 管理员在 admins 表里，放行。
       好处是不用去后台翻钥匙；坏处是密码要在这台电脑上输一次（不落盘）。
     · 方式二：service_role key 直接绕过 RLS，最硬。
       只在本机跑这个脚本时用，**绝不能**写进前端代码、也绝不能 push 到 GitHub。
       用完可以到 Supabase 后台 Rotate 换一把。

   脚本做的事（可重复执行，不会产生重复数据）：
     读 site.db 的 8 张表 → 逐张「先清空、再写入」→ 打印各表条数
       文章 articles / 小诗 poems / 唱片 music / 技能 skills
       自我介绍 profile / 留言 comments / 照片 photos / 合集 collections

   照片为什么一张一张写？
     每张大图 base64 约 300KB~1MB，10 张一起塞进一个请求体容易被网关拒收；
     逐条 POST 慢一点，但稳。缩略图和大图都一起上去。

   前置条件：
     1. Supabase 后台 SQL Editor 里已经跑过最新的 supabase.sql（表都建好了，
        包含 photos / collections 这两张）
     2. Node >= 22.5（用到内置的 node:sqlite）
     3. 这台电脑能连上 Supabase —— 直连不通也没关系：
        脚本会自动找本机代理（Clash / v2rayN 等），找不到就走 IPv4。
        建议：加速器开着跑，别关。
   ========================================================================== */
'use strict';

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const readline = require('node:readline');

/* ---------------- 交互式问一句（双击 .bat 时用） ----------------
   muted = true 时不回显（输密码用） */
function ask(question, muted) {
  return new Promise(function (resolve) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (muted) {
      rl.output.write(question);
      if (typeof rl._writeToOutput === 'function') {
        rl._writeToOutput = function () { /* 不回显 */ };
      }
      rl.question('', function (a) { rl.output.write('\n'); rl.close(); resolve(String(a || '').trim()); });
    } else {
      rl.question(question, function (a) { rl.close(); resolve(String(a || '').trim()); });
    }
  });
}

/* 命令行没给登录方式时，现场问（双击 bat 跑就是这个流程） */
async function askLoginIfNeeded() {
  if (args.key || (args.email && args.password)) { return; }
  if (!process.stdin.isTTY) {
    console.error('没有登录方式，也没法交互输入 —— 加上 --email 和 --password 再跑。');
    process.exit(1);
  }
  console.log('');
  console.log('要把本机数据同步到云端，先登录你的管理员账号。');
  console.log('（直接回车 = 用默认的 ' + '2625407261@qq.com' + '）');
  console.log('');
  const mail = await ask('邮箱：');
  args.email = mail || '2625407261@qq.com';
  args.password = await ask('密码（不显示）：', true);
  console.log('');
}

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
    email: get('email'),
    password: get('password'),
    only: get('only'),                     /* 可选：只导某一张表，调试用 */
    proxyHost: get('proxy-host'),          /* 可选：手动指定本机代理（找不到时用） */
    proxyPort: Number(get('proxy-port')) || 0
  };
}

const args = parseArgs();

/* 没填 --url 时，从 js/config.js 里把项目地址读出来（省得手抄） */
if (!args.url) {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
    const m = cfg.match(/supabaseUrl\s*:\s*['"]([^'"]+)['"]/);
    if (m) { args.url = m[1].replace(/\/+$/, ''); }
  } catch (e) { /* 读不到就算了，下面会提示 */ }
}

if (!args.url) {
  console.error('缺少项目地址：加 --url https://xxxx.supabase.co');
  process.exit(1);
}
/* 登录方式可以现在不给 —— 下面会现场问（双击 bat 时就是这个流程） */

const dbPath = path.join(__dirname, 'site.db');
let db;
try {
  db = new DatabaseSync(dbPath);
} catch (e) {
  console.error('打不开 ' + dbPath + '：' + e.message);
  process.exit(1);
}

/* ---------------- 网络层：自动找一条能连上 Supabase 的路 ----------------
   ▍为什么需要它？
     Supabase 的服务器在国外。浏览器开着加速器能访问，但 Node 的 fetch
     默认不走系统代理 —— 于是出现「浏览器能开后台、脚本 fetch failed」的怪事。
     这里按固定顺序试：① 直连 ② 环境变量里的代理 ③ 本机常见代理端口
     （Clash 7890 / v2rayN 10809 之类）④ 强制 IPv4。哪条通用哪条。
   依赖：undici（package.json 里有，npm install 就装上）；没装也能跑，
     只是后两条路用不了，退化成原来的直连。 */

/* 选定的路线，找到一次就记住，后面所有请求都走它 */
let ROUTE = null;

function loadUndici() {
  try { return require('undici'); } catch (e) { return null; }
}

/* 环境变量里配的代理（只认 http/https 的，socks 交给客户端自己开混合端口） */
function envProxy() {
  const raw = process.env.HTTPS_PROXY || process.env.https_proxy ||
              process.env.HTTP_PROXY || process.env.http_proxy ||
              process.env.ALL_PROXY || process.env.all_proxy || '';
  const m = raw.match(/^https?:\/\/([^:/]+)(?::(\d+))?/i);
  return m ? { host: m[1], port: Number(m[2]) || 7890 } : null;
}

/* 本机这个端口上有没有程序在听（600ms 内连上就算有） */
function probePort(port) {
  return new Promise(function (resolve) {
    const s = net.connect({ host: '127.0.0.1', port: port });
    const done = function (ok) { s.removeAllListeners('error'); s.destroy(); resolve(ok); };
    s.setTimeout(600, function () { done(false); });
    s.on('connect', function () { done(true); });
    s.on('error', function () { done(false); });
  });
}

/* 国内常见的本地代理端口：Clash / Clash Verge / v2rayN / SSR / Surge 等 */
const COMMON_PROXY_PORTS = [7890, 7897, 10809, 10808, 1080, 8888, 8889, 33210, 4780];

async function findProxy() {
  /* 命令行手动指定的最优先 */
  if (args.proxyHost && args.proxyPort) {
    return { host: args.proxyHost, port: args.proxyPort, manual: true };
  }
  const env = envProxy();
  if (env) { return env; }
  for (let i = 0; i < COMMON_PROXY_PORTS.length; i += 1) {
    if (await probePort(COMMON_PROXY_PORTS[i])) {
      return { host: '127.0.0.1', port: COMMON_PROXY_PORTS[i], guessed: true };
    }
  }
  return null;
}

/* 算不算「没连上」—— 只有网络错误才值得换条路重试，401/404 这类不用 */
function isNetErr(e) {
  const code = (e && e.cause && e.cause.code) || (e && e.code) || '';
  if (code) {
    return /^(ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EHOSTUNREACH|ENETUNREACH|EAI_AGAIN|UND_ERR|CERT_|SSL|DEPTH_ZERO|UNABLE_TO_VERIFY)/.test(code);
  }
  return /fetch failed|network|socket|timeout/i.test((e && e.message) || '');
}

function netMsg(e) {
  const c = e && e.cause;
  return String((c && (c.code + ' ' + c.message)) || (e && e.message) || '未知网络错误').slice(0, 90);
}

function routeName(r) {
  return r.kind === 'proxy' ? '本机代理 ' + r.proxy.host + ':' + r.proxy.port
       : r.kind === 'v4' ? 'IPv4 直连'
       : '直连';
}

async function buildAttempts() {
  const list = [{ kind: 'direct' }];
  const undici = loadUndici();
  if (undici) {
    const proxy = await findProxy();
    if (proxy) { list.push({ kind: 'proxy', proxy: proxy }); }
    list.push({ kind: 'v4' });
  }
  return list;
}

/* 按 opts 发请求；单条路线 30 秒连不上就算失败，换下一条 */
function fetchVia(route, url, opts) {
  const o = Object.assign({}, opts);
  if (!o.signal) { o.signal = AbortSignal.timeout(30000); }
  if (route.kind === 'direct') { return fetch(url, o); }

  const undici = loadUndici();
  if (!undici) { return fetch(url, o); }
  const dispatcher = route.kind === 'proxy'
    ? new undici.ProxyAgent('http://' + route.proxy.host + ':' + route.proxy.port)
    : new undici.Agent({ connect: { family: 4 } });
  return undici.fetch(url, Object.assign(o, { dispatcher: dispatcher }));
}

async function smartFetch(url, opts) {
  const attempts = ROUTE ? [ROUTE] : await buildAttempts();
  let last = null;
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      const res = await fetchVia(attempts[i], url, opts);
      if (!ROUTE) {
        ROUTE = attempts[i];
        if (attempts[i].kind !== 'direct') {
          console.log('  （直连不通，改走' + routeName(attempts[i]) + ' —— 后面的请求都用这条路）');
        }
      }
      return res;
    } catch (e) {
      if (!isNetErr(e)) { throw e; }
      last = e;
      console.log('  ' + routeName(attempts[i]) + '不通：' + netMsg(e));
    }
  }
  throw new Error(
    '连不上 Supabase（' + attempts.map(routeName).join(' → ') + ' 都试过了）。' +
    '最后错误：' + netMsg(last) + '。' +
    '可以试试：开着加速器再跑一次（脚本会自动找代理）；' +
    '或者换个网络（比如手机热点）；或者把加速器的「本地端口」告诉我，我写死进去。');
}

/* ---------------- 登录拿 token（方式一） ----------------
   走 smartFetch —— 浏览器能开 Supabase 后台、Node 却连不上时，
   十有八九是加速器 / 代理的事：浏览器走了代理，Node 默认不走。
   smartFetch 会自动按「直连 → 本机代理 → 强制 IPv4」的顺序试，
   哪条路通了就用哪条，全程不用你配置。 */
async function login() {
  const anonKey = readAnonKey();
  const res = await smartFetch(args.url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: args.email, password: args.password })
  });
  const d = await res.json().catch(function () { return {}; });
  if (!res.ok || !d.access_token) {
    throw new Error('登录失败：' + (d.error_description || d.msg || res.status) +
      '（邮箱或密码不对，或者这个账号还没在 Supabase 注册）');
  }
  console.log('  已登录：' + (d.user && d.user.email ? d.user.email : args.email));
  return d.access_token;
}

/* 匿名 key 用来「敲门」（登录接口只认它），从 js/config.js 里读 */
function readAnonKey() {
  try {
    const cfg = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
    const m = cfg.match(/supabaseKey\s*:\s*['"]([^'"]+)['"]/);
    if (m) { return m[1]; }
  } catch (e) { /* 读不到就空着 */ }
  return '';
}

/* ---------------- 一次 REST 请求 ---------------- */
async function req(table, pathStr, opts) {
  const o = opts || {};
  const res = await smartFetch(args.url + '/rest/v1/' + table + pathStr, {
    method: o.method || 'GET',
    headers: {
      apikey: args.key || readAnonKey(),
      Authorization: 'Bearer ' + AUTH_TOKEN,
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

/* 当前写数据用的凭证：service_role key 优先，否则是登录后换来的 token */
let AUTH_TOKEN = args.key || '';

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
  await askLoginIfNeeded();
  if (!AUTH_TOKEN) { AUTH_TOKEN = await login(); }

  console.log('开始同步 ' + dbPath + ' → ' + args.url);
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

  /* 7. 照片合集 —— 先建合集，再导照片（照片里的 collection_id 指向它） */
  await importTable('collections', 'SELECT * FROM collections ORDER BY created_at, id', function (r) {
    return { id: r.id, name: r.name, date: r.date, note: r.note, cover: r.cover };
  });

  /* 8. 照片 —— 一张一张写（大图 base64 不小，整批塞一个请求容易被拒） */
  if (!args.only || args.only === 'photos') {
    let rows = [];
    try {
      rows = db.prepare('SELECT * FROM photos ORDER BY created_at, id').all();
    } catch (e) {
      console.log('  photos：跳过（' + e.message + '）');
    }
    if (!rows.length) {
      console.log('  photos：0 条（跳过）');
    } else {
      await req('photos', '?id=gt.0', { method: 'DELETE' });
      let ok = 0, bad = 0;
      for (let i = 0; i < rows.length; i += 1) {
        const r = rows[i];
        try {
          await req('photos', '', {
            method: 'POST',
            body: {
              id: r.id,
              name: r.name,
              date: r.date || '',
              photo_desc: r.desc || '',   /* 云端列名 photo_desc（desc 是保留字） */
              thumb: r.thumb || '',
              data: r.data || '',
              collection_id: r.collection_id || ''
            }
          });
          ok += 1;
          process.stdout.write('  photos：' + (i + 1) + ' / ' + rows.length + '\r');
        } catch (e) {
          bad += 1;
          console.log('  photos：第 ' + (i + 1) + ' 张失败 —— ' + e.message.slice(0, 160));
        }
      }
      console.log('  photos：导入 ' + ok + ' 条' + (bad ? '（失败 ' + bad + ' 条）' : ''));
    }
  }

  console.log('');
  console.log('完成。到 Supabase 后台 Table Editor 核对各表条数，');
  console.log('或者直接打开线上网页看一下照片页。');
  console.log('（再跑一遍不会重复 —— 每张表都是「先清空再写入」）');
}

main().catch(function (e) {
  console.error('');
  console.error('同步失败：' + e.message);
  console.error('');
  console.error('常见原因：');
  console.error('  · 401 / 403 → 账号不在 admins 表里（supabase.sql 第 8 节），或 key 用错了');
  console.error('  · 42P01 表不存在 → supabase.sql 还没在 SQL Editor 里跑过（要跑最新的那份）');
  console.error('  · 42703 列不存在（比如 photos 少了 collection_id）→ 云端表结构旧了，重跑 supabase.sql');
  console.error('  · 连不上 → 保持加速器开着（脚本会自动找本机代理），或换个网络（手机热点）');
  process.exit(1);
});
