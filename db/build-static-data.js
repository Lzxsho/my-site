/* ==========================================================================
   build-static-data.js —— 把本机数据库里的内容导出成「静态 JSON + 图片文件」
   --------------------------------------------------------------------------
   站点现在是纯静态的：所有内容都读仓库里的 data/*.json，不连任何云端。
   这个文件负责把 db/site.db（本机 sqlite）里的内容导出成那批 JSON ——
   第一次建这批文件、或者以后想「把数据库里的东西再倒一遍」时跑它。

   平时改内容不用跑它：直接用编辑器改 data/*.json 就行（那才是正式的数据源）。

   用法：  node db/build-static-data.js
   产出：  data/profile.json      自我介绍 + 技能
           data/articles.json    文章
           data/poems.json       小诗
           data/music.json       唱片
           data/photos.json      照片（只写路径，不写图片本体）
           data/collections.json 照片合集
           assets/photos/*.jpg        大图
           assets/photos/thumb/*.jpg  缩略图
   ========================================================================== */
'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DB = path.join(ROOT, 'db', 'site.db');
const DATA_DIR = path.join(ROOT, 'data');
const PHOTO_DIR = path.join(ROOT, 'assets', 'photos');
const THUMB_DIR = path.join(PHOTO_DIR, 'thumb');

/* 把 "a, b, c" 或 '["a","b"]' 统一成数组 */
function toList(v) {
  if (Array.isArray(v)) { return v.map((s) => String(s).trim()).filter(Boolean); }
  const s = String(v || '').trim();
  if (!s) { return []; }
  if (s.charAt(0) === '[') {
    try { const arr = JSON.parse(s); if (Array.isArray(arr)) { return arr.map(String).filter(Boolean); } } catch (e) { /* 不是合法 JSON 就按逗号切 */ }
  }
  return s.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
}

/* 正文：数据库里存的是一整段（段落之间空行），原样写进 JSON */
function toParagraphs(v) {
  if (Array.isArray(v)) { return v.map(String); }
  return String(v || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

/* 数中文字数：中文按字算，英文按词算 */
function countWords(paragraphs) {
  const text = (paragraphs || []).join('');
  const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  return cn + en;
}

function writeJson(name, obj) {
  const file = path.join(DATA_DIR, name);
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  const size = (fs.statSync(file).size / 1024).toFixed(1);
  console.log('  ' + name.padEnd(20) + size + ' KB');
}

function main() {
  if (!fs.existsSync(DB)) {
    console.error('找不到数据库 ' + DB + '，先跑一次 start.bat 生成它');
    process.exit(1);
  }
  [DATA_DIR, PHOTO_DIR, THUMB_DIR].forEach(function (d) {
    if (!fs.existsSync(d)) { fs.mkdirSync(d, { recursive: true }); }
  });

  const db = new DatabaseSync(DB);
  console.log('导出到 data/ ：');

  /* ---------------- 自我介绍 ---------------- */
  const row = db.prepare('SELECT * FROM profile ORDER BY id LIMIT 1').get() || {};
  const skills = db.prepare('SELECT name,value,level,note FROM skills ORDER BY sort ASC, id ASC').all();
  const profile = {
    siteName: row.site_name || '朔的小窝',
    siteEn: row.site_en || 'Shuoscape',
    brandFirst: row.brand_first || 'Shuo',
    brandSecond: row.brand_second || 'scape',
    owner: row.owner || '',
    slogan: row.slogan || '',
    heroEyebrow: row.hero_eyebrow || '',
    heroDesc: row.hero_desc || '',
    heroTags: toList(row.hero_tags),
    intro: row.intro || '',
    city: row.city || '',
    email: row.email || '',
    github: row.github || '',
    blog: row.blog || '',
    avatar: 'assets/avatar.jpg',
    aboutParagraphs: toParagraphs(row.about_paragraphs),
    keywords: toList(row.keywords),
    skills: skills.map(function (s) {
      return { name: s.name, value: Number(s.value) || 0, level: s.level || '在学', note: s.note || '' };
    })
  };
  writeJson('profile.json', profile);

  /* ---------------- 文章 ---------------- */
  const articles = db.prepare('SELECT * FROM articles ORDER BY date DESC, id DESC').all()
    .map(function (a) {
      const content = toParagraphs(a.content);
      return {
        id: String(a.id),
        title: a.title || '无题',
        /* summary / excerpt 写两份：summary 是给人看的字段名，
           页面代码里一直用 excerpt，两个都留着，改哪边都不会踩空 */
        summary: a.excerpt || (content[0] || '').slice(0, 60),
        excerpt: a.excerpt || (content[0] || '').slice(0, 60),
        content: content,
        category: a.category || '随笔',
        tags: toList(a.tags),
        date: a.date || '',
        word_count: countWords(content),
        words: countWords(content),
        series: a.series || '',
        cover: a.cover || ''
      };
    });
  writeJson('articles.json', articles);

  /* ---------------- 小诗 ---------------- */
  const poems = db.prepare('SELECT * FROM poems ORDER BY date DESC, id DESC').all()
    .map(function (p) {
      const text = String(p.text || '');
      return {
        id: String(p.id),
        title: p.title || '无题',
        /* 同理：content 是新字段名，text 是页面代码一直在用的，两个都写 */
        content: text,
        text: text,
        date: p.date || ''
      };
    });
  writeJson('poems.json', poems);

  /* ---------------- 唱片 ---------------- */
  const music = db.prepare('SELECT * FROM music ORDER BY sort ASC, id ASC').all()
    .map(function (m, i) {
      const url = m.src || m.url || '';
      return {
        id: String(m.id),
        /* title / name、url / src、desc / note 同理各写一份，
           页面代码（js/music.js）认的是 name / src / note */
        title: m.name || '',
        name: m.name || '',
        artist: m.artist || '',
        duration: m.duration || '',
        url: url,
        src: url,
        cover: '',
        sort: typeof m.sort === 'number' ? m.sort : i,
        desc: m.note || '',
        note: m.note || '',
        genre: m.genre || ''
      };
    });
  writeJson('music.json', music);

  /* ---------------- 照片 + 合集 ---------------- */
  const cols = db.prepare('SELECT id,name,date,note FROM collections ORDER BY created_at ASC, id ASC').all();
  const colName = {};
  cols.forEach(function (c) { colName[c.id] = c.name; });

  const photos = db.prepare('SELECT id,name,date,`desc`,thumb,data,collection_id FROM photos ORDER BY created_at ASC, id ASC').all()
    .map(function (p) {
      const safe = String(p.name || p.id).replace(/[\\/:*?"<>|\s]+/g, '-');
      const file = safe + '.jpg';
      const dataUrl = String(p.data || '');
      const thumbUrl = String(p.thumb || '');

      /* 把 base64 还原成真正的图片文件（列表用缩略图，点开用大图） */
      ['full', 'thumb'].forEach(function (kind) {
        const raw = kind === 'full' ? dataUrl : (thumbUrl || dataUrl);
        const m = /^data:image\/(\w+);base64,(.*)$/s.exec(raw);
        if (!m) { return; }
        const buf = Buffer.from(m[2], 'base64');
        const dest = kind === 'full' ? path.join(PHOTO_DIR, file) : path.join(THUMB_DIR, file);
        fs.writeFileSync(dest, buf);
      });

      return {
        id: String(p.id),
        title: p.name || '',
        name: p.name || '',
        url: 'assets/photos/' + file,
        thumb: 'assets/photos/thumb/' + file,
        /* collection 存的是「合集的 id」（和 collections.json 的 id 对应）；
           collectionName 是给人看的名字，改起来一眼就知道这张属于哪一组 */
        collection: p.collection_id ? String(p.collection_id) : '',
        collectionName: colName[p.collection_id] || '',
        date: p.date || '',
        desc: p.desc || ''
      };
    });
  writeJson('photos.json', photos);

  writeJson('collections.json', cols.map(function (c) {
    return {
      id: String(c.id),
      name: c.name || '',
      date: c.date || '',
      note: c.note || '',
      /* 封面 = 这个合集里第一张照片的缩略图 */
      cover: (photos.find(function (p) { return p.collection === String(c.id); }) || {}).thumb || ''
    };
  }));

  console.log('\n完成：');
  console.log('  文章 ' + articles.length + ' 篇 · 小诗 ' + poems.length + ' 首 · 唱片 ' + music.length +
              ' 首 · 照片 ' + photos.length + ' 张 · 合集 ' + cols.length + ' 个');
}

main();
