/* ============================================================================
   seed.js —— 「播种」脚本：把网站原本写在 js/data.js 里的内容搬进数据库
   ----------------------------------------------------------------------------
   什么时候用它：
     第一次建库的时候跑一次就行。它会
       1) 建好 db/site.db 这个数据库文件
       2) 按照 db/schema.sql 把五张表建出来
       3) 把 js/data.js 里现有的文章 / 小诗 / 音乐 / 自我介绍 / 技能表导进去

   怎么跑：
       node db/seed.js             已经有数据就跳过（不会覆盖你后来改的东西）
       node db/seed.js --reset     清空所有表，重新导入一份干净的初始数据

   ▍为什么用「读 data.js」而不是把内容再抄一遍？
     抄一遍就会出现两份数据，改了一处忘了另一处 —— 这是最容易出乱子的做法。
     这里直接把 data.js 当成「初始数据的清单」读进来，只有一份来源。
     （data.js 里那句 window.SITE_DATA = SITE_DATA 就是留给这里读的）
   ========================================================================== */

/* node:sqlite 在 Node 22 上还标着「实验功能」，每次启动会打一行警告。
   功能是正常的，这行提示太吵，这里把它按掉。 */
process.emitWarning = function () {};

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* Node 自带 SQLite 是 22.5 版本才有的，版本太旧就给一句人话 */
let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  console.log('');
  console.log('  你的 Node.js 版本太旧了：' + process.version);
  console.log('  这个项目需要 Node 22.5 或更新的版本（因为要用它自带的数据库模块）。');
  console.log('');
  console.log('  解决办法：去 https://nodejs.org/ 下载 LTS 版重新安装。');
  console.log('');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');          /* my-site/ */
const DB_FILE = path.join(__dirname, 'site.db');  /* my-site/db/site.db */
const SCHEMA = path.join(__dirname, 'schema.sql');
const RESET = process.argv.indexOf('--reset') > -1;


/* ----------------------------------------------------------------------------
   1. 把 js/data.js 里的 SITE_DATA 读出来
   ----------------------------------------------------------------------------
   上一轮我特意在 data.js 末尾写了 window.SITE_DATA = SITE_DATA，
   就是为了让这里能用一个小沙箱把它跑一遍、把数据拿回来。
   （浏览器里 window 是浏览器的全局对象；这里我造一个假的给它用。）
   -------------------------------------------------------------------------- */
function loadSiteData() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');

  const sandbox = {
    window: {},
    /* 只转 warn / error，不转 log ——
       data.js 加载时会打一句「没检测到后端，使用本地模式」，
       那是浏览器里看的，跑 seed 的时候不需要，会干扰输出。 */
    console: { log: function () {}, warn: console.warn, error: console.error },
    /* data.js 里会读 localStorage，这里给个假的（它只是被定义，不会被真的调用） */
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    setTimeout: setTimeout
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const data = sandbox.window.SITE_DATA;
  if (!data) { throw new Error('没能从 js/data.js 里读到 SITE_DATA'); }
  return data;
}


/* ----------------------------------------------------------------------------
   2. 几个小工具：把 data.js 里的写法转成数据库能存的形式
   -------------------------------------------------------------------------- */

/* 数组 → 逗号分隔的字符串。数据库里标签就存成 'A,B,C' 这种一条。
   反过来（读取时）在前端 split(',') 就行。 */
function joinList(value) {
  if (Array.isArray(value)) {
    return value.map(function (v) { return String(v).trim(); })
                .filter(function (v) { return v; })
                .join(',');
  }
  return value === undefined || value === null ? '' : String(value);
}

/* 段落数组 或 多行字符串 → 统一的「段落之间空一行」的长字符串 */
function joinParagraphs(value) {
  if (Array.isArray(value)) {
    return value.map(function (s) { return String(s).trim(); })
                .filter(function (s) { return s; })
                .join('\n\n');
  }
  if (typeof value !== 'string') { return ''; }

  const lines = value.replace(/\r\n/g, '\n').split('\n');

  /* 去掉整体缩进（data.js 里正文是缩进着写的，不处理的话每行都带一堆空格） */
  let indent = Infinity;
  lines.forEach(function (line) {
    if (!line.trim()) { return; }
    const n = line.match(/^[ \t]*/)[0].length;
    if (n < indent) { indent = n; }
  });
  if (!isFinite(indent)) { indent = 0; }

  return lines
    .map(function (line) { return line.slice(indent).replace(/[ \t]+$/, ''); })
    .join('\n')
    .trim();
}

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}


/* ----------------------------------------------------------------------------
   3. 建库 + 建表 + 导入
   -------------------------------------------------------------------------- */
function main() {
  const data = loadSiteData();
  const db = new DatabaseSync(DB_FILE);

  /* 3.1 建表。schema.sql 里全是 CREATE TABLE IF NOT EXISTS，
         所以跑多少次都不会把已有的表删掉。 */
  db.exec(fs.readFileSync(SCHEMA, 'utf8'));

  /* 3.2 已经有数据了？除非明确说了 --reset，否则不覆盖。
         这一条很重要：你后来在网页上写了新文章，再跑一次 seed
         不应该把你的新文章冲掉。 */
  const count = db.prepare('SELECT COUNT(*) AS n FROM articles').get().n;
  if (count > 0 && !RESET) {
    console.log('');
    console.log('  数据库里已经有 ' + count + ' 篇文章了，本次跳过导入（不会覆盖你的内容）。');
    console.log('  如果确实想恢复成初始数据，请运行：  node db/seed.js --reset');
    console.log('');
    db.close();
    return;
  }

  /* 3.3 --reset：先清空。注意 DELETE FROM 只删数据、不删表结构。
         这里包在事务里：要么全成功，要么全不动，不会出现「删了一半」的状态。 */
  db.exec('BEGIN');
  try {
    ['profile', 'skills', 'articles', 'poems', 'music'].forEach(function (t) {
      db.exec('DELETE FROM ' + t);
    });
    /* AUTOINCREMENT 的计数器也归零，这样 id 会从 1 重新开始 */
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('skills','articles','poems','music')");

    /* ---------- ① profile：只有一行，id 固定写 1 ---------- */
    const p = data.profile || {};
    db.prepare(`
      INSERT INTO profile (
        id, site_name, site_en, brand_first, brand_second, owner, slogan, city,
        email, github, blog, hero_eyebrow, hero_desc, hero_tags, intro,
        about_paragraphs, keywords
      ) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      text(p.siteName), text(p.siteEn), text(p.brandFirst), text(p.brandSecond),
      text(p.owner), text(p.slogan), text(p.city), text(p.email), text(p.github),
      text(p.blog), text(p.heroEyebrow), text(p.heroDesc), joinList(p.heroTags),
      text(p.intro), joinParagraphs(p.aboutParagraphs), joinList(p.keywords)
    );

    /* ---------- ② skills ---------- */
    const insSkill = db.prepare(
      'INSERT INTO skills (name, value, level, note, sort) VALUES (?,?,?,?,?)'
    );
    (p.skills || []).forEach(function (s, i) {
      insSkill.run(text(s.name), Number(s.value) || 0, text(s.level) || '在学', text(s.note), i);
    });

    /* ---------- ③ articles ---------- */
    const insArticle = db.prepare(`
      INSERT INTO articles (title, category, date, tags, series, cover, excerpt, content)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    (data.articles || []).forEach(function (a) {
      insArticle.run(
        text(a.title), text(a.category) || '随笔', text(a.date),
        joinList(a.tags), text(a.series), text(a.cover), text(a.excerpt),
        joinParagraphs(a.content)
      );
    });

    /* ---------- ④ poems ---------- */
    const insPoem = db.prepare('INSERT INTO poems (title, date, text) VALUES (?,?,?)');
    (data.poems || []).forEach(function (po) {
      insPoem.run(text(po.title), text(po.date), text(po.text));
    });

    /* ---------- ⑤ music ---------- */
    const insMusic = db.prepare(`
      INSERT INTO music (name, artist, note, duration, src, url, sort) VALUES (?,?,?,?,?,?,?)
    `);
    (data.music || []).forEach(function (m, i) {
      insMusic.run(
        text(m.name), text(m.artist), text(m.note), text(m.duration),
        text(m.src), text(m.url), i
      );
    });

    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');   /* 出错就整个撤销，不会留下半截数据 */
    db.close();
    throw e;
  }

  /* 3.4 报一下战果 */
  const n = function (t) { return db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n; };
  console.log('');
  console.log('  ✓ 数据库建好了：' + path.relative(ROOT, DB_FILE));
  console.log('');
  console.log('    表名        条数');
  console.log('    ----------  ----');
  console.log('    profile     ' + n('profile') + '   （自我介绍，只存一行）');
  console.log('    skills      ' + n('skills'));
  console.log('    articles    ' + n('articles'));
  console.log('    poems       ' + n('poems'));
  console.log('    music       ' + n('music'));
  console.log('');
  console.log('  下一步：运行  node server.js  把网站跑起来。');
  console.log('');

  db.close();
}

main();
