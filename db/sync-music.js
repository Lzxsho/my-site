/* ============================================================================
   sync-music.js —— 只把 js/data.js 里的 music[] 同步进数据库
   ----------------------------------------------------------------------------
   什么时候用它：
     你在 js/data.js 里换了歌单（改歌名、换链接、加歌），想让网站立刻跟着变，
     但它又**只动 music 这一张表**。

   ▍和 seed.js --reset 的区别（这点很重要）
       node db/seed.js --reset      清空全部五张表，重新导入初始内容
                                    → 你自己在界面里写的文章、小诗、简介全没了
       node db/sync-music.js        只删 music 再按 data.js 重建
                                    → 文章 / 小诗 / 个人资料一律不动

     所以换歌单请优先用这个。别的表要重置，再用 --reset。

   怎么跑：
       node db/sync-music.js

   ▍还有一条更省事的路
     不改代码也行：直接在音乐页点那张碟的「✎」在界面上改，
     那种改法是直接写进数据库的，不经过 data.js，也就不存在「同步」这回事。
     data.js 适合放「长期歌单」，界面适合随手改。
   ========================================================================== */

/* node:sqlite 在 Node 22 上还标着「实验功能」，启动会打一行警告。
   功能是正常的，这行太吵，按掉。 */
process.emitWarning = function () {};

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* Node 自带 SQLite 是 22.5 才有的，版本太旧就给一句人话 */
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

/* 这个脚本在 db/ 里，往上一层才是项目根目录 */
const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'db', 'site.db');

/* ---------------------------------------------------------------------------
   1. 读出 js/data.js 里的 music[]
   ---------------------------------------------------------------------------
   不在 Node 里放一个假 window 是读不到的 —— data.js 最后有一句
   window.SITE_DATA = SITE_DATA，就是为了让别的文件（包括这里）能读到它。 */
function loadSiteData() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8');

  const sandbox = {
    window: {},
    console: console,
    /* data.js 会探一下 location 判断是不是 file://，
       再决定要不要去找后端。这里给它一个假的，让它老老实实走本地分支。 */
    location: { protocol: 'file:' },
    localStorage: {
      getItem: function () { return null; },
      setItem: function () {},
      removeItem: function () {}
    },
    setTimeout: setTimeout,
    fetch: function () { return Promise.reject(new Error('这里没有网络')); }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  const data = sandbox.window.SITE_DATA;
  if (!data) { throw new Error('没能从 js/data.js 里读到 SITE_DATA'); }
  return data;
}

/* ---------------------------------------------------------------------------
   2. 简单校验：别往数据库里塞 undefined
   ---------------------------------------------------------------------------
   空字符串存成 NULL 更干净 —— 页面上判断「有没有配」只要看真假就行，
   不用再区分 '' 和 null 两种情况。 */
function text(v) {
  if (v === null || v === undefined) { return null; }
  const s = String(v).trim();
  return s === '' ? null : s;
}

/* 表里缺哪列就补哪列。
   列清单用 PRAGMA table_info 拿（相当于 MySQL 的 SHOW COLUMNS FROM 表名），
   已经有了就跳过 —— 直接 ADD 会报「duplicate column name」。 */
function ensureColumns(db, wanted) {
  const cols = db.prepare('PRAGMA table_info(music)').all();
  if (!cols.length) { return; }        /* 表还没建，seed.js 会负责 */

  wanted.forEach(function (item) {
    const name = item[0];
    const type = item[1];
    const has = cols.some(function (c) { return c.name === name; });
    if (has) { return; }

    db.exec('ALTER TABLE music ADD COLUMN ' + name + ' ' + type);
    console.log('  music 表补上了 ' + name + ' 列');
  });
}

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('');
    console.log('  还没有数据库：db/site.db');
    console.log('  先跑一次：  node db/seed.js');
    console.log('');
    process.exit(1);
  }

  const data = loadSiteData();
  if (!Array.isArray(data.music)) {
    throw new Error('js/data.js 里的 music 不是一个数组，检查一下格式');
  }

  const db = new DatabaseSync(DB_FILE);

  /* 表结构可能还没跟上：新加的列是 server.js 启动时才会补的，
     但你可能先跑这个脚本、后起服务。自己检查一遍，
     免得「必须先启动一次服务才能同步歌单」这种别扭的依赖。
     加列用 ALTER TABLE，和 server.js 里那套迁移是同一个道理。 */
  ensureColumns(db, [
    ['genre', 'TEXT']    /* 分类，碟架按它分组（9-17 新增） */
  ]);

  const before = db.prepare('SELECT COUNT(*) AS n FROM music').get().n;

  /* 用事务包起来：要么六首都写进去，要么一条都不写。
     中途报错就 ROLLBACK，不会留下一个「删了一半」的碟架。 */
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM music').run();
    /* 顺手把自增计数器也归零，这样重建后 id 从 1 开始，好对数据 */
    db.exec("DELETE FROM sqlite_sequence WHERE name = 'music'");

    const insert = db.prepare(
      'INSERT INTO music (name, artist, note, duration, genre, src, url, sort) VALUES (?,?,?,?,?,?,?,?)'
    );
    data.music.forEach(function (m, i) {
      insert.run(
        text(m.name) || '未命名',
        text(m.artist), text(m.note), text(m.duration),
        text(m.genre), text(m.src), text(m.url), i
      );
    });
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }

  /* -------------------------------------------------------------------------
     3. 回读一遍，把结果打出来核对
     ------------------------------------------------------------------------- */
  const rows = db.prepare(
    'SELECT id, name, artist, duration, src FROM music ORDER BY sort ASC, id ASC'
  ).all();

  console.log('');
  console.log('  ▍碟架已更新：' + before + ' 张 → ' + rows.length + ' 张');
  console.log('');
  rows.forEach(function (r) {
    console.log('   ' + String(r.id).padStart(2) + '  ' + r.name + '  ·  ' + (r.artist || '') +
      '  [' + (r.genre || '未分类') + ']');
    console.log('       ' + r.duration + '   本地音频：' + (r.src || '（没配，只转不出声）'));
  });

  const others = db.prepare(`
    SELECT (SELECT COUNT(*) FROM articles) AS articles,
           (SELECT COUNT(*) FROM poems)    AS poems,
           (SELECT COUNT(*) FROM skills)   AS skills
  `).get();

  console.log('');
  console.log('  其它表没动：文章 ' + others.articles + ' 篇，小诗 ' +
              others.poems + ' 首，技能 ' + others.skills + ' 条');
  console.log('');
  console.log('  刷新浏览器就能看到新的碟架。');
  console.log('');
}

main();
