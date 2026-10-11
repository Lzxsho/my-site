'use strict';

/* ==========================================================================
   export-to-datajs.js —— 把本机 db/site.db 的内容写回 js/data.js 的 SITE_DATA
   --------------------------------------------------------------------------
   为什么需要它：
     GitHub Pages 上没有后端，页面读的就是 js/data.js 里的 SITE_DATA。
     你平时在「本机服务」上网页里写的文章、改的资料都存进 db/site.db，
     Pages 上是看不到的。这个脚本把数据库内容导回 data.js ——
     然后 git 提交推送，Pages 上的内容就同步了。

   用法（在 my-site 目录下）：

     node db/export-to-datajs.js            导出全部
     node db/export-to-datajs.js --check    只对比，不写文件

   它只替换 SITE_DATA 里的四块内容（profile / articles / poems / music），
   分类雅称（columns）、学习页配置（study）这些手写配置原样保留。
   导完自动做语法检查，替换失败不会写坏文件。
   ========================================================================== */

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DB_FILE = path.join(ROOT, 'db', 'site.db');
const DATA_FILE = path.join(ROOT, 'js', 'data.js');
const CHECK_ONLY = process.argv.indexOf('--check') > -1;

/* ---------------- 小工具 ---------------- */
function camel(s) { return String(s).replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); }); }
function camelRow(row) {
  const out = {};
  for (const k in row) { out[camel(k)] = row[k]; }
  return out;
}
function str(v) { return (v === undefined || v === null) ? '' : String(v); }
function splitList(v) {
  return str(v).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

/* ---------------- 读库 ---------------- */
if (!fs.existsSync(DB_FILE)) {
  console.error('找不到 ' + DB_FILE + '，先跑 node db/seed.js 建库。');
  process.exit(1);
}
const db = new DatabaseSync(DB_FILE);

function all(sql) { return db.prepare(sql).all().map(camelRow); }

const profileRow = all('SELECT * FROM profile WHERE id = 1')[0] || {};
const skillRows = all('SELECT * FROM skills ORDER BY sort, id');
const articleRows = all('SELECT * FROM articles ORDER BY date DESC, id DESC');
const poemRows = all('SELECT * FROM poems ORDER BY date DESC, id DESC');
const musicRows = all('SELECT * FROM music ORDER BY sort, id');

/* ---------------- 组装成 SITE_DATA 的形状 ---------------- */
const exported = {
  profile: {
    siteName: str(profileRow.siteName),
    siteEn: str(profileRow.siteEn),
    brandFirst: str(profileRow.brandFirst),
    brandSecond: str(profileRow.brandSecond),
    owner: str(profileRow.owner),
    slogan: str(profileRow.slogan),
    heroEyebrow: str(profileRow.heroEyebrow),
    heroDesc: str(profileRow.heroDesc),
    heroTags: splitList(profileRow.heroTags),
    intro: str(profileRow.intro),
    city: str(profileRow.city),
    email: str(profileRow.email),
    github: str(profileRow.github),
    blog: str(profileRow.blog),
    aboutParagraphs: str(profileRow.aboutParagraphs).split('\n\n').filter(function (s) { return s.trim(); }),
    keywords: splitList(profileRow.keywords),
    skills: skillRows.map(function (s) {
      return {
        name: str(s.name),
        value: Number(s.value) || 0,
        level: str(s.level) || '在学',
        note: str(s.note)
      };
    })
  },

  articles: articleRows.map(function (a) {
    return {
      id: 'a' + a.id,
      title: str(a.title),
      category: str(a.category),
      date: str(a.date),
      tags: splitList(a.tags),
      series: str(a.series),
      cover: str(a.cover),
      excerpt: str(a.excerpt),
      content: str(a.content)
    };
  }),

  poems: poemRows.map(function (p) {
    return {
      id: 'p' + p.id,
      title: str(p.title),
      date: str(p.date),
      text: str(p.text)
    };
  }),

  music: musicRows.map(function (m) {
    return {
      id: 'm' + m.id,
      name: str(m.name),
      artist: str(m.artist),
      genre: str(m.genre),
      note: str(m.note),
      duration: str(m.duration),
      src: str(m.src)
    };
  })
};

/* ---------------- 和 data.js 里现有的 SITE_DATA 做对比 ---------------- */
const src = fs.readFileSync(DATA_FILE, 'utf8');
const segMatch = src.match(/const SITE_DATA = (\{[\s\S]*?\n\});/);
if (!segMatch) {
  console.error('在 js/data.js 里没找到 SITE_DATA 段（应该以「const SITE_DATA = {」开头）。');
  process.exit(1);
}

/* eslint-disable no-eval */
const current = eval('(' + segMatch[1] + ')');
/* eslint-enable no-eval */

function diffCount(kind, exportedList, currentList) {
  const a = JSON.stringify(exportedList);
  const b = JSON.stringify(currentList);
  return a === b;
}

const same = {
  profile: diffCount('profile', exported.profile, current.profile),
  articles: diffCount('articles', exported.articles, current.articles),
  poems: diffCount('poems', exported.poems, current.poems),
  music: diffCount('music', exported.music, current.music)
};

console.log('数据库里的内容：');
console.log('  文章 ' + exported.articles.length + ' 篇 / 小诗 ' + exported.poems.length +
            ' 首 / 唱片 ' + exported.music.length + ' 张 / 技能 ' + exported.profile.skills.length + ' 条');
console.log('');
console.log('和 js/data.js 对比：');
Object.keys(same).forEach(function (k) {
  console.log('  ' + k + '：' + (same[k] ? '一致' : '有差异，需要更新'));
});

if (Object.keys(same).every(function (k) { return same[k]; })) {
  console.log('\n全部一致，不用导出。');
  process.exit(0);
}

if (CHECK_ONLY) {
  console.log('\n（--check 只看不动。真导出请去掉 --check）');
  process.exit(0);
}

/* ---------------- 覆盖写回 ----------------
   只换这四块，columns / categories / study 等手写配置原样保留。 */
const merged = Object.assign({}, current, exported);

/* 序列化：JSON 格式本身就是合法的 JS 对象字面量，
   中文不会被转义，缩进 2 格，正好符合 data.js 的风格。 */
const newSeg = 'const SITE_DATA = ' + JSON.stringify(merged, null, 2) + ';';
const next = src.replace(segMatch[0], newSeg);

/* 写之前先做语法检查 —— new Function 只解析不执行，
   data.js 里的 window.xxx 赋值在函数体里是合法语法，直接过。 */
try {
  new Function(next);
} catch (e) {
  console.error('生成的代码语法检查没通过，已放弃写入（原文件未动）：' + e.message);
  process.exit(1);
}

fs.writeFileSync(DATA_FILE, next, 'utf8');
console.log('\n已写入 js/data.js。接下来：');
console.log('  1. git add js/data.js && git commit -m "同步内容" && git push');
console.log('  2. 等 GitHub Pages 自动更新（一两分钟），刷新页面就能看到');
