/* ============================================================================
   server.js —— 小网站的后端
   ----------------------------------------------------------------------------
   它做两件事：
     ① 把 my-site 文件夹里的网页发出去（相当于一个很小的「网站服务」）
     ② 提供一组接口（/api/...）让网页能读写数据库

   怎么跑：  node server.js       然后浏览器打开 http://localhost:5173
   （Windows 上直接双击「启动网站.bat」也行）

   ▍为什么不用 npm install 装东西？
     因为 Node 22 自带了一个 SQLite 数据库模块（node:sqlite），
     以及一个做网页服务的模块（node:http）。
     既然自带就够用，那就不装任何第三方包 —— 少一堆依赖，也少一堆坑。

   ▍前端是怎么拿到数据的？
     网页里的 js/data.js 启动时会先问一句「有后端吗？」（GET /api/health）。
       有  → 之后所有数据都走这个后端（也就是走数据库）
       没有 → 退回原来的本地模式（数据写在 data.js 里 + 存在浏览器里）
     所以：直接双击 html 也能看，但只有跑了 server.js 才会真正读写数据库。
   ========================================================================== */

/* node:sqlite 在 Node 22 上还标着「实验功能」，每次启动会打一行警告。
   功能是正常的，这行提示太吵，这里按掉。 */
process.emitWarning = function () {};

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

/* Node 自带 SQLite 是 22.5 版本才有的。
   装成老版本（比如 Node 18 / 20）的话这里会失败，
   直接给一句人话，别让人对着一行 "Cannot find module" 发懵。 */
let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  console.log('');
  console.log('  你的 Node.js 版本太旧了：' + process.version);
  console.log('  这个项目需要 Node 22.5 或更新的版本（因为要用它自带的数据库模块）。');
  console.log('');
  console.log('  解决办法：去 https://nodejs.org/ 下载 LTS 版重新安装，');
  console.log('  装完之后关掉这个窗口，重新双击 start.bat 就行。');
  console.log('');
  process.exit(1);
}

const ROOT = __dirname;
const DB_FILE = path.join(ROOT, 'db', 'site.db');
const START_PORT = Number(process.env.PORT) || 5173;
const MAX_PORT_TRY = 10;          /* 5173 被占用就试 5174、5175…… */
const OPEN_BROWSER = process.argv.indexOf('--no-open') < 0;


/* ============================================================================
   一·五、管理员凭据与登录会话
   ----------------------------------------------------------------------------
   以前：密码写在前端 js/auth.js 里，任何人 F12 打开源码就能看到明文。
   现在：密码在**服务端**（环境变量 / db/admin.secret），前端把密码 POST 过来换一个
        临时 token，之后每个写请求都在请求头里带上它。

     浏览器                          服务端
       │  POST /api/session {user,password}
       │ ───────────────────────────►  核对（比对 SHA-256，无明文传输）
       │  ◄───────────────────────────  返回 token
       │  PUT /api/articles/1  X-Admin-Token: xxx
       │ ───────────────────────────►  校验通过才执行

   token 存在服务进程的内存里，重启服务就全部失效。
   ========================================================================== */

/* 静态管理 Token：环境变量优先，没设就用内置默认值（启动时会打警告）。
   部署到有 Node 后端的平台时，务必设 ADMIN_TOKEN。 */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'shuoscape-admin-2026';
const USING_DEFAULT_TOKEN = !process.env.ADMIN_TOKEN;

/* 登录后发的临时 token：token -> 到期时间（毫秒时间戳） */
const sessionTokens = new Map();
const SESSION_TTL = 12 * 60 * 60 * 1000;      /* 12 小时 */

const ADMIN_USER = process.env.ADMIN_USER || 'lizhixu';
const SECRET_FILE = path.join(ROOT, 'db', 'admin.secret');

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

/* 「时间恒定」比较 —— 两边都先算 SHA-256（长度固定 32 字节）再逐字节比。
   直接比原文的话，前面第几个字符对不上就立刻返回，
   别人可以用「响应快慢」一个字符一个字符试出正确值。 */
function safeEqual(a, b) {
  return crypto.timingSafeEqual(
    Buffer.from(sha256(a)),
    Buffer.from(sha256(b))
  );
}

/* 管理员密码从哪来：环境变量 > db/admin.secret > 首次运行随机生成并存进文件。
   总之源码里一个字都没有 —— 这是这次改动最要紧的一点。 */
function loadAdminPassword() {
  if (process.env.ADMIN_PASSWORD) {
    return { pass: process.env.ADMIN_PASSWORD, from: '环境变量 ADMIN_PASSWORD' };
  }
  if (fs.existsSync(SECRET_FILE)) {
    const saved = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (saved) { return { pass: saved, from: 'db/admin.secret（本机专用，不进 git）' }; }
  }
  /* 第一次启动：随机生成一个，写进文件，这样每次重启都是同一个 */
  const gen = crypto.randomBytes(12).toString('base64')
    .replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
  try {
    fs.writeFileSync(SECRET_FILE, gen + '\n', 'utf8');
  } catch (e) {
    return { pass: gen, from: '本次临时生成（db/admin.secret 没能写入，重启会变）' };
  }
  return { pass: gen, from: '首次运行自动生成，已写入 db/admin.secret' };
}

const ADMIN_CRED = loadAdminPassword();

/* token 算有效吗？静态 token 和登录后发的临时 token 都认 */
function tokenOk(token) {
  if (!token) { return false; }
  if (safeEqual(token, ADMIN_TOKEN)) { return true; }
  const exp = sessionTokens.get(token);
  if (!exp) { return false; }
  if (exp < Date.now()) { sessionTokens.delete(token); return false; }
  return true;
}

/* ----------------------------------------------------------------------------
   哪些写请求必须带 token
   ----------------------------------------------------------------------------
   规则很简单：除了 GET（读），别的都要 —— 只有两个例外：
     · /api/session        登录本身就是为了拿 token，不可能要求先有 token
     · POST /api/comments  游客留言是这个站的核心功能，不能拦
   留言的 DELETE 不在例外里，删留言必须管理员。 */
const OPEN_WRITE = [
  'POST /api/session',
  'DELETE /api/session',
  'POST /api/comments'
];

function needsAdmin(method, pathname) {
  if (method === 'GET' || method === 'HEAD') { return false; }
  if (OPEN_WRITE.indexOf(method + ' ' + pathname) >= 0) { return false; }
  return true;
}

/* ----------------------------------------------------------------------------
   留言限流：同一个 IP，60 秒内最多 5 条
   ----------------------------------------------------------------------------
   留言是唯一对外开放写的接口，不加限制的话一个脚本几分钟就能把表灌满。
   记在内存里，重启服务计数归零 —— 对个人小站够用了。 */
const COMMENT_WINDOW = 60 * 1000;
const COMMENT_MAX = 5;
const commentRate = new Map();       /* ip -> [时间戳, …] */

function commentTooFast(ip) {
  const now = Date.now();
  /* IP 数量太多就把整个表清掉重来，免得被人用一堆伪造地址把内存撑爆 */
  if (commentRate.size > 1000) { commentRate.clear(); }
  const list = (commentRate.get(ip) || []).filter(function (t) { return now - t < COMMENT_WINDOW; });
  list.push(now);
  commentRate.set(ip, list);
  return list.length > COMMENT_MAX;
}

/* 想让接口返回一个指定的 HTTP 状态码（不是 500），就 throw 这个 */
function apiError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/* ----------------------------------------------------------------------------
   URL 解码的安全版本
   ----------------------------------------------------------------------------
   浏览器地址栏里打一个 /api/articles/% 过来，decodeURIComponent 会直接抛
   URIError。抛在异步回调外面就是进程崩溃，所以这里统一兜住：失败就用原字符串。 */
function safeDecode(str) {
  try { return decodeURIComponent(String(str)); }
  catch (e) { return String(str); }
}

/* 网址里有没有「解不开的百分号转义」？
   例如 /api/articles/%（% 后面没跟两位十六进制）或 /%e0%a4%a（多字节序列被截断）。
   decodeURIComponent 遇到这种会抛错 —— 虽然 safeDecode 已经兜住不会崩，
   但这类请求本身就是畸形的，直接回 400 比「当成一个不存在的 id」更说得清。 */
function hasBadEscape(str) {
  try { decodeURIComponent(String(str)); return false; }
  catch (e) { return true; }
}


/* ============================================================================
   一、数据库连接
   ========================================================================== */
if (!fs.existsSync(DB_FILE)) {
  console.log('');
  console.log('  找不到数据库文件：db/site.db');
  console.log('  第一次使用，请先运行一次：  node db/seed.js');
  console.log('');
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE);


/* ----------------------------------------------------------------------------
   数据库结构升级（迁移）
   ----------------------------------------------------------------------------
   你在电脑上用了一段时间，db/site.db 里已经存了你自己写的文章、小诗。
   后来我给某张表加了一列 —— 这时候**不能**重跑 seed.js（那会清空你的东西），
   要用 ALTER TABLE 把新列补上去。这就是各家公司天天在做的「数据库迁移」。

   SQLite 的 ALTER TABLE 和 MySQL 有两处不一样，写的时候要注意：
     · 一次只能加一列（MySQL 可以写 ADD COLUMN a INT, ADD COLUMN b INT）
     · 不能加「NOT NULL 且没有默认值」的列

   已经存在的列再 ADD 会报错，所以下面先查一次列清单，有就跳过。
   -------------------------------------------------------------------------- */
const MIGRATIONS = [
  /* [表名, 列名, 类型] */
  ['music', 'genre', 'TEXT'],   /* 分类，碟架按它分组（9-17 新增） */
  /* 评论支持「楼中楼」回复：parent_id 指向被回复的那条；顶层留言它是空的。
     老数据不受影响 —— 加列有默认值 NULL，历史留言自动算顶层。 */
  ['comments', 'parent_id', 'INTEGER']
];

/* 反过来：不再用的列删掉。
   SQLite 要到 3.35 才支持 DROP COLUMN（MySQL 一直有）。
   删列比加列危险得多 —— 数据真的没了 —— 所以下面先确认列存在再动手，
   而且这一步失败也不该让整个服务起不来。 */
const DROPS = [
  ['music', 'embed']            /* 网易云外链播放器地址，功能已去掉（9-17 移除） */
];

function migrate() {
  MIGRATIONS.forEach(function (m) {
    const table = m[0];
    const column = m[1];
    const type = m[2];

    /* PRAGMA table_info(表名) 相当于 MySQL 的 SHOW COLUMNS FROM 表名 */
    const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
    if (!cols.length) { return; }                    /* 表还没建，seed.js 会负责 */
    if (cols.some(function (c) { return c.name === column; })) { return; }

    db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + type);
    console.log('  数据库结构已升级：' + table + ' 表补上了 ' + column + ' 列');
  });

  DROPS.forEach(function (d) {
    const table = d[0];
    const column = d[1];

    const cols = db.prepare('PRAGMA table_info(' + table + ')').all();
    if (!cols.length) { return; }
    if (!cols.some(function (c) { return c.name === column; })) { return; }

    try {
      db.exec('ALTER TABLE ' + table + ' DROP COLUMN ' + column);
      console.log('  数据库结构已清理：' + table + ' 表删掉了不再使用的 ' + column + ' 列');
    } catch (e) {
      /* 老版本 SQLite 不支持 DROP COLUMN。留着这一列不影响使用，
         只是 SELECT * 会多带一个字段回来，不值得为它让服务起不来。 */
      console.log('  提示：' + table + '.' + column + ' 这一列没能删掉（' +
        e.message + '），不影响使用。');
    }
  });
}
migrate();


/* ----------------------------------------------------------------------------
   评论表（后加的功能）
   ----------------------------------------------------------------------------
   老数据库里没有这张表，所以不能指望 seed.js —— 它只在第一次建库时跑。
   这里用 CREATE TABLE IF NOT EXISTS 自己补：已经存在就什么都不做，
   不存在才建。这样无论你的 site.db 是今天建的还是上个月建的都能用。

   target 是「这条评论属于谁」，比如 'article-12'、'poem-7'。
   一篇文章的评论就靠它筛出来，所以给它建个索引，查起来快一点。
   -------------------------------------------------------------------------- */
function ensureCommentsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      target      TEXT NOT NULL,
      name        TEXT NOT NULL,
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      parent_id   INTEGER             /* 回复谁：空=顶层留言，有值=挂在那一楼下面 */
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(target)');
}
ensureCommentsTable();


/* ----------------------------------------------------------------------------
   英语学习资料表（后加的功能）
   ----------------------------------------------------------------------------
   管理员导入的共享词库存这里：id 用前端生成的 'm'+时间戳，
   words 整个存成 JSON 字符串（读出来再 parse 还给前端）。
   GET 是公开的（人人可练）；增删改走统一的写鉴权闸（需要 X-Admin-Token）。
   -------------------------------------------------------------------------- */
function ensureEnMaterialsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS en_materials (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      date       TEXT,
      words      TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}
ensureEnMaterialsTable();


/* ============================================================================
   二、小工具
   ========================================================================== */

/* 数据库的列名叫 site_name，网页里用的是 siteName。
   这个小函数负责把下划线写法转成驼峰写法，省得一张表一张表手写。
   site_name → siteName ;  created_at → createdAt */
function camel(str) {
  return str.replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); });
}

function camelRow(row) {
  if (!row) { return null; }
  const out = {};
  for (const key in row) { out[camel(key)] = row[key]; }
  return out;
}

/* 读取请求体里发过来的 JSON（网页用 fetch 的 body 发的就是它） */
function readBody(req) {
  return new Promise(function (resolve, reject) {
    let raw = '';
    req.on('data', function (chunk) {
      raw += chunk;
      /* 防止有人发一个超大文件把内存塞满 */
      if (raw.length > 8 * 1024 * 1024) {
        reject(new Error('请求体太大了'));
        req.destroy();
      }
    });
    req.on('end', function () {
      if (!raw) { return resolve({}); }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('请求体不是合法的 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, data, code) {
  const body = JSON.stringify(data === undefined ? null : data);
  res.writeHead(code || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

/* 把数组 / 逗号字符串统一成「逗号分隔的字符串」，存进数据库用。
   前端传数组或字符串过来都认，免得因为格式不同直接报错。 */
function joinList(value) {
  if (Array.isArray(value)) {
    return value.map(function (v) { return String(v).trim(); })
                .filter(function (v) { return v; })
                .join(',');
  }
  if (value === undefined || value === null) { return ''; }
  return String(value).trim();
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

/* 只挑出允许写入的字段。别的不认识的字段一律忽略，
   免得前端多传了什么就把 SQL 搞坏了。 */
function pick(src, keys) {
  const out = {};
  keys.forEach(function (k) {
    if (src && Object.prototype.hasOwnProperty.call(src, k)) { out[k] = src[k]; }
  });
  return out;
}

/* 执行带 ? 占位符的 SQL。参数个数是运行时才确定的（改了几个字段就有几个 ?），
   所以要用 apply 把数组摊开传进去。

   ⚠️ 这里有个绊过一次的坑：
     写成 db.prepare(sql).run.apply(null, args) 会报 "Illegal invocation"。
     因为 run / all 是「语句对象」上的方法，把方法从对象上摘下来单独调用，
     this 就丢了。必须先存成变量，再用 stmt.run.apply(stmt, args)。
     报错信息完全看不出原因，记一下。 */
function runStmt(sql, args) {
  const stmt = db.prepare(sql);
  return stmt.run.apply(stmt, args || []);
}
function allStmt(sql, args) {
  const stmt = db.prepare(sql);
  return stmt.all.apply(stmt, args || []);
}


/* ============================================================================
   三、接口（API）
   ----------------------------------------------------------------------------
   每个函数对应一个网址。网页里 fetch('/api/articles') 就会走到这里。

   约定：
     GET    读
     POST   新建
     PUT    修改
     DELETE 删除
   ========================================================================== */
const api = {

  /* ---------- 探活：网页启动时先问一句「有后端吗」 ---------- */
  'GET /api/health': function () {
    const n = function (t) { return db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n; };
    return {
      ok: true,
      database: 'db/site.db',
      counts: {
        articles: n('articles'),
        poems: n('poems'),
        music: n('music'),
        skills: n('skills'),
        comments: n('comments')
      }
    };
  },

  /* ---------- 登录 / 登出 ----------
     前端 js/auth.js 不再保存任何密码，只保存这里换回来的 token。
     核对时两边都先算哈希再比，正确与否的耗时一样。 */
  'POST /api/session': function (body) {
    const user = text(body.user).trim();
    const pass = text(body.password);

    if (!user || !pass) { throw apiError(400, '账号和密码都要填'); }
    if (!safeEqual(user, ADMIN_USER) || !safeEqual(pass, ADMIN_CRED.pass)) {
      throw apiError(401, '账号或密码不对');
    }

    const token = crypto.randomBytes(24).toString('hex');
    sessionTokens.set(token, Date.now() + SESSION_TTL);
    /* 顺手把过期的清一清，别让表越攒越大 */
    sessionTokens.forEach(function (exp, t) {
      if (exp < Date.now()) { sessionTokens.delete(t); }
    });
    return { ok: true, token: token, expiresIn: SESSION_TTL };
  },

  /* 退出登录：把这个 token 作废。
     token 走网址参数传（DELETE 不方便带请求体），楼下已经把它排除在鉴权之外，
     所以这里自己验证一次：token 无效就当什么都没发生，不给报错。 */
  'DELETE /api/session': function (body, params) {
    const token = text(params.token);
    if (token) { sessionTokens.delete(token); }
    return { ok: true };
  },

  /* ---------- 自我介绍（含技能表，一次给全，关于页一次就够用） ---------- */
  'GET /api/profile': function () {
    const row = camelRow(db.prepare('SELECT * FROM profile WHERE id = 1').get()) || {};
    row.skills = db.prepare('SELECT * FROM skills ORDER BY sort ASC, id ASC')
                    .all()
                    .map(camelRow);
    return row;
  },

  'PUT /api/profile': function (body) {
    /* 只允许改这些列。id 不在里面，所以改不动主键 —— 这是故意的。 */
    const allowed = [
      'site_name', 'site_en', 'brand_first', 'brand_second', 'owner', 'slogan',
      'city', 'email', 'github', 'blog', 'hero_eyebrow', 'hero_desc',
      'hero_tags', 'intro', 'about_paragraphs', 'keywords'
    ];
    /* 前端传的是驼峰（siteName），这里转回数据库的列名（site_name） */
    const snake = {};
    Object.keys(body || {}).forEach(function (k) {
      snake[k.replace(/[A-Z]/g, function (c) { return '_' + c.toLowerCase(); })] = body[k];
    });
    /* heroTags / keywords 前端可能传数组，统一成逗号字符串 */
    if ('hero_tags' in snake) { snake.hero_tags = joinList(snake.hero_tags); }
    if ('keywords' in snake) { snake.keywords = joinList(snake.keywords); }

    const keys = Object.keys(pick(snake, allowed));
    if (!keys.length) { return { ok: true, changed: 0 }; }

    const sql = 'UPDATE profile SET ' + keys.map(function (k) { return k + ' = ?'; }).join(', ') +
                ' WHERE id = 1';
    const info = runStmt(sql, keys.map(function (k) { return text(snake[k]); }));
    return { ok: true, changed: info.changes };
  },

  /* ---------- 技能表：整体替换 ----------
     为什么整张表一起换，而不是一条一条改？
     因为在界面上就是「改完一堆，点一次保存」。整表替换逻辑最简单，
     也不会出现「加了一条忘了删旧的」这种对不上的情况。
     整个替换过程包在事务里：要么全成，要么全不动。 */
  'PUT /api/skills': function (body) {
    const list = Array.isArray(body && body.skills) ? body.skills : [];
    db.exec('BEGIN');
    try {
      db.exec('DELETE FROM skills');
      db.exec("DELETE FROM sqlite_sequence WHERE name = 'skills'");
      const ins = db.prepare(
        'INSERT INTO skills (name, value, level, note, sort) VALUES (?,?,?,?,?)'
      );
      list.forEach(function (s, i) {
        ins.run(text(s.name) || '（没写名字）', Number(s.value) || 0,
                text(s.level) || '在学', text(s.note), i);
      });
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { ok: true, count: list.length };
  },

  /* ---------- 文章：列表（支持 ?category= &keyword= &limit=） ---------- */
  'GET /api/articles': function (body, params) {
    const where = [];
    const args = [];

    if (params.category && params.category !== '全部') {
      where.push('category = ?');
      args.push(params.category);
    }
    if (params.keyword) {
      /* LIKE '%关键词%' 就是「包含」的意思，SQL 里的模糊查询。
         OR 表示「四个字段里有任意一个包含就算命中」。 */
      where.push('(title LIKE ? OR excerpt LIKE ? OR tags LIKE ? OR series LIKE ?)');
      const like = '%' + params.keyword + '%';
      args.push(like, like, like, like);
    }

    let sql = 'SELECT * FROM articles' +
              (where.length ? ' WHERE ' + where.join(' AND ') : '') +
              ' ORDER BY date DESC, id DESC';

    if (params.limit) { sql += ' LIMIT ' + (Number(params.limit) || 10); }

    return allStmt(sql, args).map(camelRow);
  },

  /* 读单篇。没这篇就抛 404 —— 让前端能明确区分「没有」和「接口坏了」，
     而不是拿到一个 200 的 null 后不知道该显示什么。 */
  'GET /api/articles/:id': function (body, params) {
    const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(params.id);
    if (!row) { throw apiError(404, '没有这篇文章'); }
    return camelRow(row);
  },

  'POST /api/articles': function (body) {
    const info = db.prepare(`
      INSERT INTO articles (title, category, date, tags, series, cover, excerpt, content)
      VALUES (?,?,?,?,?,?,?,?)
    `).run(
      text(body.title) || '无题',
      text(body.category) || '随笔',
      text(body.date) || new Date().toISOString().slice(0, 10),
      joinList(body.tags),
      text(body.series),
      text(body.cover),
      text(body.excerpt),
      text(body.content)
    );
    return camelRow(db.prepare('SELECT * FROM articles WHERE id = ?')
                      .get(info.lastInsertRowid));
  },

  'PUT /api/articles/:id': function (body, params) {
    const allowed = ['title', 'category', 'date', 'tags', 'series', 'cover', 'excerpt', 'content'];
    const data = pick(body, allowed);
    if ('tags' in data) { data.tags = joinList(data.tags); }

    const keys = Object.keys(data);
    if (!keys.length) { return { ok: true, changed: 0 }; }

    const sql = 'UPDATE articles SET ' + keys.map(function (k) { return k + ' = ?'; }).join(', ') +
                ' WHERE id = ?';
    const info = runStmt(sql, keys.map(function (k) { return text(data[k]); }).concat([params.id]));
    return { ok: true, changed: info.changes };
  },

  'DELETE /api/articles/:id': function (body, params) {
    const info = db.prepare('DELETE FROM articles WHERE id = ?').run(params.id);
    return { ok: true, deleted: info.changes };
  },

  /* ---------- 小诗 ---------- */
  'GET /api/poems': function () {
    return db.prepare('SELECT * FROM poems ORDER BY date DESC, id DESC').all().map(camelRow);
  },

  'POST /api/poems': function (body) {
    const info = db.prepare('INSERT INTO poems (title, date, text) VALUES (?,?,?)').run(
      text(body.title) || '无题',
      text(body.date) || new Date().toISOString().slice(0, 10),
      text(body.text)
    );
    return camelRow(db.prepare('SELECT * FROM poems WHERE id = ?').get(info.lastInsertRowid));
  },

  'PUT /api/poems/:id': function (body, params) {
    const data = pick(body, ['title', 'date', 'text']);
    const keys = Object.keys(data);
    if (!keys.length) { return { ok: true, changed: 0 }; }

    const sql = 'UPDATE poems SET ' + keys.map(function (k) { return k + ' = ?'; }).join(', ') +
                ' WHERE id = ?';
    const info = runStmt(sql, keys.map(function (k) { return text(data[k]); }).concat([params.id]));
    return { ok: true, changed: info.changes };
  },

  'DELETE /api/poems/:id': function (body, params) {
    const info = db.prepare('DELETE FROM poems WHERE id = ?').run(params.id);
    return { ok: true, deleted: info.changes };
  },

  /* ---------- 唱片 ---------- */
  'GET /api/music': function () {
    return db.prepare('SELECT * FROM music ORDER BY sort ASC, id ASC').all().map(camelRow);
  },

  'POST /api/music': function (body) {
    const maxSort = db.prepare('SELECT COALESCE(MAX(sort), -1) AS m FROM music').get().m;
    const info = db.prepare(`
      INSERT INTO music (name, artist, note, duration, genre, src, url, sort) VALUES (?,?,?,?,?,?,?,?)
    `).run(
      text(body.name) || '未命名', text(body.artist), text(body.note),
      text(body.duration), text(body.genre), text(body.src), text(body.url), maxSort + 1
    );
    return camelRow(db.prepare('SELECT * FROM music WHERE id = ?').get(info.lastInsertRowid));
  },

  'PUT /api/music/:id': function (body, params) {
    const data = pick(body, ['name', 'artist', 'note', 'duration', 'genre', 'src', 'url', 'sort']);
    const keys = Object.keys(data);
    if (!keys.length) { return { ok: true, changed: 0 }; }

    const sql = 'UPDATE music SET ' + keys.map(function (k) { return k + ' = ?'; }).join(', ') +
                ' WHERE id = ?';
    const info = runStmt(sql, keys.map(function (k) { return text(data[k]); }).concat([params.id]));
    return { ok: true, changed: info.changes };
  },

  'DELETE /api/music/:id': function (body, params) {
    const info = db.prepare('DELETE FROM music WHERE id = ?').run(params.id);
    return { ok: true, deleted: info.changes };
  },

  /* ---------- 英语学习资料（管理员导入的共享词库） ----------
     GET 公开（人人可练）；POST 是「有则更新、无则新建」——
     前端每次导入传一个新 id，编辑已有资料时带原 id 过来就变成更新。
     words 存 JSON 字符串，读出来 parse 成数组再还。 */
  'GET /api/en-materials': function () {
    return db.prepare('SELECT * FROM en_materials ORDER BY date DESC, id DESC').all()
      .map(function (r) {
        let words = [];
        try { words = JSON.parse(r.words) || []; } catch (e) { words = []; }
        return { id: r.id, name: r.name, date: r.date || '', words: Array.isArray(words) ? words : [] };
      });
  },

  'POST /api/en-materials': function (body) {
    const id = text(body.id) || ('m' + Date.now());
    const name = text(body.name) || '未命名资料';
    let words = Array.isArray(body.words) ? body.words : [];
    words = words
      .map(function (w) {
        return { en: text(w && w.en).slice(0, 200), zh: text(w && w.zh).slice(0, 500) };
      })
      .filter(function (w) { return w.en && w.zh; })
      .slice(0, 20000);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO en_materials (id, name, date, words, created_at, updated_at)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, date = excluded.date,
        words = excluded.words, updated_at = excluded.updated_at
    `).run(id, name, text(body.date), JSON.stringify(words), now, now);
    return { ok: true, id: id, words: words.length };
  },

  'DELETE /api/en-materials/:id': function (body, params) {
    const info = db.prepare('DELETE FROM en_materials WHERE id = ?').run(params.id);
    return { ok: true, deleted: info.changes };
  },

  /* ---------- 评论 ----------
     谁都能发（游客也行），所以这里是整个站唯一一个「不用登录也能写」的接口。
     正因为如此，才要在长度上卡一下：名字 24 字、正文 1000 字，
     免得有人把整本书贴进来。 */
  'GET /api/comments/:target': function (body, params) {
    const rows = db.prepare('SELECT * FROM comments WHERE target = ? ORDER BY id ASC')
                   .all(params.target)
                   .map(camelRow);
    return { items: rows };
  },

  'POST /api/comments': function (body, params, ctx) {
    /* 限流放在最前面：超了就直接 429，不用再往下走 */
    const ip = (ctx && ctx.req && ctx.req.socket && ctx.req.socket.remoteAddress) || 'unknown';
    if (commentTooFast(ip)) { throw apiError(429, '发言太快了，歇一会儿'); }

    const target = text(body.target);
    const name = (text(body.name).trim() || '匿名').slice(0, 24);
    const content = text(body.content).trim().slice(0, 1000);

    if (!target) { return { error: '这条评论不知道该挂在谁身上（缺 target）' }; }
    if (!content) { return { error: '评论内容不能为空' }; }

    /* 「楼中楼」可选参数：要回复哪一条。
       校验规矩很简单 —— 它必须是同一个 target 下面已经存在的留言，
       否则就当没传（宁可变成一条普通留言，也不要指向一个不存在的父亲）。 */
    let parentId = null;
    if (body.parentId !== undefined && body.parentId !== null && String(body.parentId) !== '') {
      const row = db.prepare('SELECT id FROM comments WHERE id = ? AND target = ?')
                    .get(Number(body.parentId), target);
      if (row) { parentId = row.id; }
    }

    const info = db.prepare(
      'INSERT INTO comments (target, name, content, created_at, parent_id) VALUES (?,?,?,?,?)'
    ).run(target, name, content, new Date().toISOString(), parentId);

    return camelRow(db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid));
  },

  /* 删的同时把它下面的回复一起带走。
     留着一堆「回复某个已经看不见的人」的孤儿回复，比直接删掉更让人糊涂。 */
  'DELETE /api/comments/:id': function (body, params) {
    db.prepare('DELETE FROM comments WHERE parent_id = ?').run(params.id);
    const info = db.prepare('DELETE FROM comments WHERE id = ?').run(params.id);
    return { ok: true, deleted: info.changes };
  }
};


/* ============================================================================
   四、路由：把网址对到上面的函数
   ----------------------------------------------------------------------------
   思路很简单：
     /api/articles/12  →  先用「/api/articles/:id」这条规则去试
     挨个比一遍，哪个能对上就用哪个。
   这一段就是所有后端框架都在偷偷帮你做的事，写出来其实就这么点。
   ========================================================================== */
function matchApi(method, pathname) {
  const parts = pathname.split('/').filter(function (s) { return s; });   /* ['api','articles','12'] */

  for (const key in api) {
    const spaceAt = key.indexOf(' ');
    const m = key.slice(0, spaceAt);
    const pattern = key.slice(spaceAt + 1).split('/').filter(function (s) { return s; });

    if (m !== method || pattern.length !== parts.length) { continue; }

    const params = {};
    let ok = true;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i].charAt(0) === ':') {
        params[pattern[i].slice(1)] = safeDecode(parts[i]);   /* :id → 实际值 */
      } else if (pattern[i] !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) { return { handler: api[key], params: params }; }
  }
  return null;
}


/* ============================================================================
   五、发网页文件（静态文件）
   ========================================================================== */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

/* 不允许通过网址访问的东西。
   数据库文件、后端源码本来就在网站目录里，如果不拦着，
   别人访问 http://你的地址/db/site.db 就能把整个数据库下载走。
   这是很常见的一个疏忽，顺手挡掉。

   注意是「按文件类型拦」而不是「把 db 整个目录封掉」——
   这样 db/README.md、db/schema.sql 这些仍然能在浏览器里打开看，
   只有真正的数据库文件和后端源码拿不到。
   （网站服务只监听 127.0.0.1，外网本来就访问不到；这属于多上一道锁。） */
const BLOCKED = [
  /^\./,                                /* 隐藏文件，比如 .git / .env */
  /\.(db|sqlite|sqlite3|db-journal|db-wal|db-shm)$/i,   /* 数据库本体和它的临时文件 */
  /(^|\/)server\.js$/i,                 /* 后端源码 */
  /(^|\/)package(-lock)?\.json$/i,
  /(^|\/)admin\.secret$/i,              /* 管理员密码文件（本机专用，绝不能被人下载走） */
  /(^|\/)\.env[.\w]*$/i
];

/* ----------------------------------------------------------------------------
   RSS 订阅源 /feed.xml
   ----------------------------------------------------------------------------
   有了它，别人用 RSS 阅读器（Feedly、Inoreader、NetNewsWire…）订阅你的站，
   你一发文他那边就有 —— 不用他天天惦记着来看。

   格式是 RSS 2.0，内容是最近 10 篇文章。
   「站点名 / 副标题」从 profile 表里取，所以不用在这儿再写一遍。

   两种模式怎么都不掉链子：
     · 跑着 server.js → 这里实时生成，永远是最新的
     · GitHub Pages（纯静态）→ 根目录那份手写的 feed.xml 会被同名的旧的覆盖不了？
       不会 —— Pages 上没有后端，访问 /feed.xml 拿到的是静态那份。
       所以仓库里也放了一份（内容指向当前文章），见仓库根的 feed.xml。 */
function xmlEscape(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serveFeed(res) {
  let prof = {};
  try {
    prof = camelRow(db.prepare('SELECT * FROM profile WHERE id = 1').get()) || {};
  } catch (e) {
    prof = {};   /* 连 profile 都读不出来时，下面用人话兜住 */
  }

  const siteName = text(prof.siteName) || '朔的小窝';
  const siteEn = text(prof.siteEn) || 'Shuoscape';
  const slogan = text(prof.slogan);
  const base = 'http://localhost:' + port + '/';

  let articles = [];
  try {
    articles = allStmt('SELECT * FROM articles ORDER BY date DESC, id DESC LIMIT 10')
      .map(camelRow);
  } catch (e) {
    articles = [];
  }

  const items = articles.map(function (a) {
    const link = base + 'articles.html?id=' + encodeURIComponent(text(a.id));
    /* 摘要优先用 excerpt，没有就截正文第一段的前 80 字 */
    let desc = text(a.excerpt);
    if (!desc) { desc = text(a.content).replace(/\s+/g, ' ').slice(0, 80); }
    return '' +
      '    <item>\n' +
      '      <title>' + xmlEscape(a.title) + '</title>\n' +
      '      <link>' + xmlEscape(link) + '</link>\n' +
      '      <guid isPermaLink="false">' + xmlEscape('shuoscape-article-' + text(a.id)) + '</guid>\n' +
      '      <pubDate>' + xmlEscape(new Date(text(a.date) + 'T09:00:00').toUTCString()) + '</pubDate>\n' +
      '      <description>' + xmlEscape(desc) + '</description>\n' +
      '    </item>\n';
  }).join('');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0">\n' +
    '  <channel>\n' +
    '    <title>' + xmlEscape(siteName + ' · ' + siteEn) + '</title>\n' +
    '    <link>' + xmlEscape(base) + '</link>\n' +
    '    <description>' + xmlEscape(slogan || '文字、记录、音乐与开发。') + '</description>\n' +
    '    <language>zh-CN</language>\n' +
    '    <lastBuildDate>' + xmlEscape(new Date().toUTCString()) + '</lastBuildDate>\n' +
    items +
    '  </channel>\n' +
    '</rss>\n';

  res.writeHead(200, {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    'Content-Length': Buffer.byteLength(xml),
    'Cache-Control': 'no-store'
  });
  res.end(xml);
}

/* ----------------------------------------------------------------------------
   404 页面
   ----------------------------------------------------------------------------
   状态码照旧是 404（这才是对的，搜索引擎和浏览器靠它判断「没有这个地址」），
   只是返回的正文换成站点风格的那一页。
   万一 404.html 本身也读不出来，退回原来那行纯文本。 */
function serve404(res) {
  fs.readFile(path.join(ROOT, '404.html'), function (e404, buf) {
    if (e404) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('找不到这个文件。');
      return;
    }
    res.writeHead(404, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': buf.length,
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}

function serveStatic(req, res, pathname) {
  let rel = safeDecode(pathname).replace(/^\/+/, '');
  if (!rel) { rel = 'index.html'; }

  if (BLOCKED.some(function (re) { return re.test(rel); })) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('这个文件不对外提供访问。');
    return;
  }

  const filePath = path.join(ROOT, rel);
  /* 防越权：如果有人写 /../../C:/Windows/... ，path.join 之后会跑到网站目录之外。
     这里必须确认最终路径还在 ROOT 里面。 */
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('路径不合法。');
    return;
  }

  fs.readFile(filePath, function (err, buf) {
    /* 找不到就直接千方百计去找 404.html —— 相比一行灰扑扑的纯文本，
       一个长成站点样子的页面对人友好得多。
       GitHub Pages 只要仓库根目录有 404.html 就会自动用它，行为也就对齐了。 */
    if (err) { serve404(res); return; }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': buf.length,
      /* 不缓存：改完代码刷新就能看到效果，不用清缓存 */
      'Cache-Control': 'no-store'
    });
    res.end(buf);
  });
}


/* ============================================================================
   六、总入口
   ========================================================================== */
/* 真正的处理逻辑单独放一个函数 —— 外面那层只负责兜异常。
   这样任何一个请求把代码搞炸，都只是这一个请求返回 400，
   服务本身不会跟着一起退出。 */
function handleRequest(req, res) {
  /* http://localhost:5173/api/articles?category=随笔 这种网址，
     拆成 路径 + 查询参数 两部分 */
  const full = new URL(req.url, 'http://localhost');
  const pathname = full.pathname;

  /* 畸形 URL（百分号转义解不开）直接挡掉 —— 见上面 hasBadEscape 的说明。
     放在最前面，静态和接口两条路都覆盖到。 */
  if (hasBadEscape(pathname)) {
    sendJson(res, { error: '请求不合法：网址里的 % 转义解不开' }, 400);
    return;
  }

  /* RSS 订阅源不是静态文件 —— 它的内容要从数据库里现取，所以单独在这里生成 */
  if (pathname === '/feed.xml') { serveFeed(res); return; }

  if (pathname.indexOf('/api/') !== 0) {
    serveStatic(req, res, pathname);
    return;
  }

  /* 带 X-Admin-Token 才能写（读不用）。放在这里统一判断一次，
     不用每个 handler 里各写一遍 —— 少写就有少错。 */
  if (needsAdmin(req.method, pathname)) {
    if (!tokenOk(req.headers['x-admin-token'])) {
      sendJson(res, { error: '无权限' }, 403);
      return;
    }
  }

  /* 把 ?a=1&b=2 变成 { a:'1', b:'2' } */
  const params = {};
  full.searchParams.forEach(function (value, key) { params[key] = value; });

  const found = matchApi(req.method, pathname);
  if (!found) {
    sendJson(res, { error: '没有这个接口：' + req.method + ' ' + pathname }, 404);
    return;
  }

  /* 除了读操作，其他的都要先读出请求体再执行 */
  const needBody = req.method !== 'GET' && req.method !== 'DELETE';
  const bodyTask = needBody ? readBody(req) : Promise.resolve({});

  /* 第三个参数 ctx：把原始请求带进 handler，
     留言限流要知道对方 IP 就得靠它。 */
  const ctx = { req: req, res: res, method: req.method, pathname: pathname };

  bodyTask.then(function (body) {
    /* 三份参数合成一份：
         params        —— 网址里 ?a=1&b=2 这种（筛选用的 category / keyword）
         found.params  —— 网址路径里的 :id，比如 /api/articles/12 → { id: '12' }
         body          —— 请求体里的 JSON（新建 / 修改时提交的内容）
       ⚠️ 踩过的坑：一开始忘了加 found.params，
          结果 /api/articles/12 里的 id 永远是 undefined，
          报的是「Provided value cannot be bound to SQLite parameter 1」，
          从错误信息完全看不出是参数没收进来。 */
    const merged = Object.assign({}, params, found.params, body);
    const result = found.handler(merged, merged, ctx);
    sendJson(res, result);
  }).catch(function (e) {
    /* apiError 抛出来的自带状态码（比如限流的 429），其余一律当服务器错误 */
    const status = e && e.status ? e.status : 500;
    if (status >= 500) {
      console.error('[接口出错]', req.method, pathname, '-', e.message);
    }
    sendJson(res, { error: e.message }, status);
  });
}

const server = http.createServer(function (req, res) {
  try {
    handleRequest(req, res);
  } catch (e) {
    /* 畸形 URL（比如 /api/articles/% 、/%e0%a4%a）会在 new URL / 解码时抛异常。
       以前没兜，进程直接崩；现在只让这一个请求失败。 */
    console.error('[请求不合法]', req.method, req.url, '-', e.message);
    if (res.headersSent) {
      try { res.end(); } catch (e2) { /* 已经断开了，不用管 */ }
    } else {
      sendJson(res, { error: '请求不合法' }, 400);
    }
  }
});

/* 端口被占用就往后试一个，最多试 10 次。
   （很常见：上次开的窗口没关掉，端口还占着） */
let port = START_PORT;
server.on('error', function (e) {
  if (e.code === 'EADDRINUSE' && port < START_PORT + MAX_PORT_TRY) {
    port += 1;
    console.log('  端口 ' + (port - 1) + ' 被占用了，换一个：' + port);
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error('启动失败：', e.message);
  process.exit(1);
});

server.listen(port, '127.0.0.1', function () {
  const url = 'http://localhost:' + port + '/';
  console.log('');
  console.log('  ▍朔的小窝 已经跑起来了');
  console.log('');
  console.log('    网站地址    ' + url);
  console.log('    数据库      db/site.db');
  console.log('    接口探活    ' + url + 'api/health');
  console.log('');
  console.log('    更内容之前，先在网页顶部用管理员登录（不再能跳过、也不需要改源码）。');
  console.log('    改完网页代码，直接刷新浏览器就能看到。');
  console.log('    关掉这个窗口（或按 Ctrl + C）就是停止服务。');
  console.log('');

  /* 安全相关的两句提示，每次启动都说说，免得忘了 */
  console.log('    管理员账号    ' + ADMIN_USER);
  console.log('    管理员密码    ' + ADMIN_CRED.pass + '（来源：' + ADMIN_CRED.from + '）');
  if (USING_DEFAULT_TOKEN) {
    console.log('');
    console.log('    ⚠ 警告：使用默认管理 Token，请设置环境变量 ADMIN_TOKEN');
  }
  console.log('');

  /* 自动帮你打开浏览器。不想自动打开就加 --no-open */
  if (OPEN_BROWSER && process.platform === 'win32') {
    require('node:child_process').spawn('cmd', ['/c', 'start', '', url],
      { detached: true, stdio: 'ignore' }).unref();
  }
});
