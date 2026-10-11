/* ==========================================================================
   check-cloud.js —— 云端建表体检
   --------------------------------------------------------------------------
   用法（在 my-site/ 目录下打开终端）：

     node db/check-cloud.js

   它做什么：
     读 js/config.js 里的 supabaseUrl / supabaseKey，挨张表去云端问一句
     「你在吗、里面有几行」，然后打印一张体检单。

   什么时候用：
     · 在 Supabase 后台 SQL Editor 跑完 supabase.sql 之后 —— 确认建成功了
     · 网站显示「暂时显示静态副本」的时候 —— 看看是不是表没建
     · 换了新项目 / 新钥匙之后 —— 确认配置没写错

   读到的都是「公开可读」的表（用 anon key），
   看不了 content 之外的私密数据，也不需要 service_role 钥匙。

   ▍体检单怎么读
     ✓ 表在（n 行）      —— 建好了，有 n 条数据
     · 表在（空）        —— 建好了，还没搬数据 —— 去跑 export-to-supabase.js
     ✗ 表不存在          —— supabase.sql 没跑、或跑出错了，回去重跑
     ⚠ 连不上            —— 网络问题 / 项目被暂停 / 配置写错，看下面的提示
   ========================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

/* ---------------- ① 读 js/config.js ----------------
   config.js 是给浏览器用的（window.SHUOSCAPE_CONFIG = …），
   Node 里没有 window，所以用 vm 造一个假 window 把它跑起来。 */
function readConfig() {
  const file = path.join(__dirname, '..', 'js', 'config.js');
  if (!fs.existsSync(file)) {
    console.error('找不到 js/config.js —— 请在 my-site/ 目录下运行本脚本');
    process.exit(1);
  }
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
  } catch (e) {
    console.error('js/config.js 读不出来：' + e.message);
    process.exit(1);
  }
  const c = (sandbox.window.SHUOSCAPE_CONFIG || {}).content || {};
  return {
    url: String(c.supabaseUrl || '').replace(/\/+$/, ''),
    key: String(c.supabaseKey || '')
  };
}

/* ---------------- ② 要检查的表 ----------------
   顺序有意义：前六张是内容表，后面是功能表。 */
const TABLES = [
  { name: 'articles',      what: '文章' },
  { name: 'poems',         what: '小诗' },
  { name: 'music',         what: '唱片' },
  { name: 'profile',       what: '自我介绍（全站一行）' },
  { name: 'skills',        what: '技能' },
  { name: 'comments',      what: '留言' },
  { name: 'en_materials',  what: '英语学习资料' },
  { name: 'study_progress', what: 'C 语言打卡进度' },
  { name: 'user_progress', what: '访客个人练习记录 ★ 新增' },
  { name: 'admins',        what: '管理员名单（应读不到，这是对的）' }
];

const cfg = readConfig();
if (!cfg.url || !cfg.key) {
  console.error('js/config.js 里没填 supabaseUrl / supabaseKey —— 先去填好再来体检');
  process.exit(1);
}

console.log('云端项目：' + cfg.url);
console.log('正在体检 ' + TABLES.length + ' 张表…\n');

(async function () {
  let missing = 0, empty = 0, okCount = 0, netErr = false;

  for (const t of TABLES) {
    let mark, note;
    try {
      const r = await fetch(cfg.url + '/rest/v1/' + t.name + '?select=*&limit=3', {
        headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key }
      });
      if (r.ok) {
        const rows = await r.json().catch(function () { return []; });
        if (rows.length) { mark = '✓'; note = t.what + '  （' + rows.length + '+ 行）'; okCount++; }
        else { mark = '·'; note = t.what + '  （空 —— 表建好了，还没搬数据）'; empty++; }
      } else {
        const body = await r.text().catch(function () { return ''; });
        if (/PGRST205|Could not find|does not exist/i.test(body)) {
          mark = '✗'; note = t.what + '  ← 表不存在！supabase.sql 没跑成功'; missing++;
        } else if (r.status === 401 || r.status === 403) {
          mark = '·'; note = t.what + '  （读不到 —— 多半是 RLS 正常拦截）';
        } else {
          mark = '✗'; note = t.what + '  ← HTTP ' + r.status + ' ' + body.slice(0, 90); missing++;
        }
      }
    } catch (e) {
      mark = '⚠'; note = t.what + '  ← 连不上：' + e.message; netErr = true;
    }
    console.log('  ' + mark + ' ' + t.name.padEnd(16) + note);
  }

  /* ---------------- ③ 结论 ---------------- */
  console.log('\n──────────────────────────────');
  if (netErr) {
    console.log('连不上云端。三种可能：');
    console.log('  1. 你的网络到不了 Supabase（换网络 / 关代理再试）');
    console.log('  2. Supabase 免费项目被自动暂停了（后台点 Restore 恢复）');
    console.log('  3. js/config.js 里的项目地址 / key 抄错了');
  } else if (missing) {
    console.log('有 ' + missing + ' 张表没建好。');
    console.log('  → Supabase 后台 → SQL Editor → 把 supabase.sql 整段粘进去 → Run');
    console.log('  → 跑完再执行一遍本脚本确认');
  } else {
    console.log('表都建好了 ✓');
    if (empty) {
      console.log('其中 ' + empty + ' 张是空的 —— 数据还没搬上去：');
      console.log('  node db/export-to-supabase.js --url ' + cfg.url + ' --key <service_role钥匙>');
    }
  }
})();
