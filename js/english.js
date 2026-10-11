/* ==========================================================================
   english.js —— 英语词汇复习（四个板块：知识点 / 词汇复习 / 错题本 / 学习资料）
   --------------------------------------------------------------------------
   ▍数据都存在哪儿
     自己的练习进度（全部在当前浏览器）：
       IndexedDB 'shuoscape-en' → materials   学习资料（自己导入的，不上传）
       localStorage：
         shuoscape_en_wrong      错题本：[{ key, en, zh, source, pend, total, last, mastered… }]
         shuoscape_en_daily      每日练习：{ '2026-10-10': { t: 练了几题, r: 答对几题 } }
         shuoscape_en_round      没练完的一轮（下次打开能接着练）
     所以换浏览器 / 换电脑记录不会跟过去 —— 侧栏的「导出学习备份」就是防这个。

     管理员导入的「共享资料」不一样：存进数据库（本机 server.js）或云端
     （Supabase 的 en_materials 表），走 js/data.js 的 SiteAPI，人人可练。

   ▍为什么要 IndexedDB
     以前资料存 localStorage，上限约 5MB —— 整本讲义导入经常超限，
     保存悄悄失败，刷新就「消失了」。IndexedDB 的容量是几百 MB 起步，
     同样的数据放进去就不存在这个问题。老数据会自动搬过来。

   ▍文件怎么变成词条
     .docx  浏览器里直接解压（DecompressionStream），抽出 word/document.xml 的文字
     .pdf   调 pdf.js（首次需联网从 CDN 拉一次），只认「可选择的文字」，扫描件不行
     .txt / .md  直接按行读
     每行认一种分隔符（Tab / = / ：/ - 等），左边英文右边中文，会自动纠正方向。
     等你发来正式模板以后，改 parseLine() 这一个函数就能对上格式。

   ▍谁能改什么
     导入资料：**所有人都可以** ——
       · 管理员导入 → 存进数据库 / 云端，所有人共享练习
       · 普通用户 / 未登录导入 → 只存自己浏览器，不上传
     编辑 / 删除「共享资料」→ 管理员；编辑 / 删除「自己本地的资料」→ 本人即可
     练习、标掌握是「自己的进度」→ 不用登录。
   ========================================================================== */

/* --------------------------------------------------------------------------
   EnIDB —— IndexedDB 的两个小读写（key-value 用法，够用了）
   -------------------------------------------------------------------------- */
const EnIDB = {
  _p: null,

  open() {
    if (this._p) { return this._p; }
    this._p = new Promise(function (resolve) {
      let done = false;
      try {
        const req = indexedDB.open('shuoscape-en', 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore('kv');
        };
        req.onsuccess = function () { done = true; resolve(req.result); };
        req.onerror = function () { resolve(null); };       /* 打不开 → 降级 */
        req.onblocked = function () { resolve(null); };
        /* 有的环境（隐私模式）既不报错也不响应，3 秒后不再等 */
        setTimeout(function () { if (!done) { resolve(null); } }, 3000);
      } catch (e) { resolve(null); }
    });
    return this._p;
  },

  get(key) {
    return this.open().then(function (db) {
      if (!db) { return null; }
      return new Promise(function (resolve) {
        try {
          const rq = db.transaction('kv', 'readonly').objectStore('kv').get(key);
          rq.onsuccess = function () { resolve(rq.value === undefined ? null : rq.value); };
          rq.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  },

  set(key, val) {
    return this.open().then(function (db) {
      if (!db) { return Promise.reject(new Error('IndexedDB 打不开')); }
      return new Promise(function (resolve, reject) {
        try {
          const tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(val, key);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { reject(tx.error || new Error('IndexedDB 写入失败')); };
          tx.onabort = function () { reject(tx.error || new Error('IndexedDB 写入被中断')); };
        } catch (e) { reject(e); }
      });
    });
  }
};

/* ==========================================================================
   一、EnStore —— 存储层
   ========================================================================== */

const EnStore = {
  KEY_WRONG: 'shuoscape_en_wrong',
  KEY_DAILY: 'shuoscape_en_daily',
  KEY_ROUND: 'shuoscape_en_round',

  materials: [],   /* 我导入的资料（本机 IndexedDB，不上传） */
  remote: [],      /* 管理员共享的资料（数据库 / 云端拉下来的） */
  wrong: [],       /* 错题记录 */
  daily: {},       /* 每日练习量 */
  round: null,     /* 未完成的这一轮 */

  /* 两份资料合在一起的完整列表（练习、统计、列表都用它） */
  allMats() { return this.remote.concat(this.materials); },

  load() {
    try { this.wrong      = JSON.parse(localStorage.getItem(this.KEY_WRONG) || '[]'); } catch (e) { this.wrong = []; }
    try { this.daily      = JSON.parse(localStorage.getItem(this.KEY_DAILY) || '{}'); } catch (e) { this.daily = {}; }
    try { this.round      = JSON.parse(localStorage.getItem(this.KEY_ROUND) || 'null'); } catch (e) { this.round = null; }
    if (!Array.isArray(this.wrong))     { this.wrong = []; }

    /* 资料走 IndexedDB，是异步的 —— 读完页面会自己再刷一遍 */
    this.materials = [];
    return this.loadMats();
  },

  /* 从 IndexedDB 读资料；一份没有时看看 localStorage 里有没有老数据，搬过来 */
  loadMats() {
    const self = this;
    return EnIDB.get('materials').then(function (list) {
      if (Array.isArray(list) && list.length) {
        self.materials = list;
      } else {
        let old = [];
        try { old = JSON.parse(localStorage.getItem('shuoscape_en_materials') || '[]') || []; } catch (e) { old = []; }
        if (Array.isArray(old) && old.length) {
          self.materials = old;
          EnIDB.set('materials', old).catch(function () { /* 搬不动就先留在原地 */ });
        }
      }
      if (!Array.isArray(self.materials)) { self.materials = []; }
    }).catch(function () { self.materials = []; });
  },

  saveMats() {
    const self = this;
    return EnIDB.set('materials', this.materials).catch(function () {
      /* IndexedDB 也满了 / 被禁了：试一次 localStorage 小兜底，再不行就明说 */
      try {
        localStorage.setItem('shuoscape_en_materials', JSON.stringify(self.materials));
        App.toast('资料太大，浏览器的高级存储放不下 —— 已用备用空间，建议先导出一份备份');
      } catch (e) {
        App.toast('浏览器存不下这份资料 —— 先导出一份备份，或拆小一点再导入');
      }
    });
  },

  saveWrong() { try { localStorage.setItem(this.KEY_WRONG, JSON.stringify(this.wrong)); } catch (e) { /* 忽略 */ } },
  saveDaily() { try { localStorage.setItem(this.KEY_DAILY, JSON.stringify(this.daily)); } catch (e) { /* 忽略 */ } },
  saveRound() { try { localStorage.setItem(this.KEY_ROUND, JSON.stringify(this.round)); } catch (e) { /* 忽略 */ } },

  /* 英文那侧怎么算「同一个词」：去大小写、去空格和标点 */
  normEn(s) {
    return String(s || '').toLowerCase()
      .replace(/[\s.,。、;；:：!！?？'"’“”()（）\-—–_·…]/g, '');
  },
  /* 中文那侧：去空格和标点再比 */
  normZh(s) {
    return String(s || '').toLowerCase()
      .replace(/[\s.,。、;；:：!！?？'"’“”()（）\-—–_·…]/g, '');
  },
  wordKey(en) { return this.normEn(en); },

  /* 词库总量：同一个英文词多份资料都有，只算一个 */
  totalWords() {
    const seen = {};
    let n = 0;
    this.allMats().forEach(function (m) {
      (m.words || []).forEach(function (w) {
        const k = EnStore.wordKey(w.en);
        if (!k || seen[k]) { return; }
        seen[k] = 1;
        n += 1;
      });
    });
    return n;
  },

  /* 错题本里「待巩固」的条数（有任何一个方向没过关就算） */
  pendingCount() {
    return this.wrong.filter(function (r) { return !r.mastered; }).length;
  },

  /* 今天练了多少：{ t: 总题数, r: 答对 } */
  todayStats() {
    return this.daily[App.today()] || { t: 0, r: 0 };
  },

  /* 一次练习答题的结果记账。
     outcome：'right' 答对 / 'wrong' 答错 / 'skip' 跳过（未作答） / 'reveal' 看答案
     dir：'en2zh' 英译汉 / 'zh2en' 汉译英 */
  recordAnswer(word, dir, outcome, sourceName) {
    /* 每日统计 */
    const t = App.today();
    if (!this.daily[t]) { this.daily[t] = { t: 0, r: 0 }; }
    this.daily[t].t += 1;
    if (outcome === 'right') { this.daily[t].r += 1; }
    this.saveDaily();

    /* 错题本：只有「没答对」才记进去 */
    if (outcome !== 'right') {
      const key = this.wordKey(word.en);
      let rec = null;
      for (let i = 0; i < this.wrong.length; i++) {
        if (this.wrong[i].key === key) { rec = this.wrong[i]; break; }
      }
      if (!rec) {
        rec = { key: key, en: word.en, zh: word.zh, source: sourceName || '',
                pend: {}, total: 0, last: '', lastDir: '', mastered: false, add: t };
        this.wrong.push(rec);
      }
      rec.en = word.en;
      rec.zh = word.zh;
      if (sourceName) { rec.source = sourceName; }
      rec.pend[dir] = true;      /* 这个方向没过关 */
      rec.total += 1;            /* 累计待巩固次数 */
      rec.last = outcome;
      rec.lastDir = dir;
      rec.mastered = false;
      this.saveWrong();
      return;
    }

    /* 答对了：如果这道题正在待巩固，把当前这个方向划掉；
       两个方向都过了，自动归入已掌握。 */
    const key2 = this.wordKey(word.en);
    for (let j = 0; j < this.wrong.length; j++) {
      const r = this.wrong[j];
      if (r.key !== key2 || r.mastered) { continue; }
      if (r.pend[dir]) { delete r.pend[dir]; }
      r.last = 'right';
      r.lastDir = dir;
      const still = Object.keys(r.pend).length > 0;
      r.mastered = !still;
      this.saveWrong();
      return;
    }
  }
};

/* ==========================================================================
   二、EnParse —— 文件 → 文字 → 词条
   ========================================================================== */

const EnParse = {

  hasCJK(s) { return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(String(s || '')); },
  hasEN(s)  { return /[A-Za-z]/.test(String(s || '')); },

  /* ------------------------------------------------------------------
     干扰词：页眉、页脚、水印、机构名这类混在正文里的字。
     解析前会先把它们整段抹掉，免得被当成词条的一部分。
     默认带的是「小蓝人专升本」那批资料上的水印，
     以后换了别的讲义，在导入框的「要忽略的字」里改就行。
     ------------------------------------------------------------------ */
  NOISE_DEFAULT: ['小蓝人', '专升本', '内部资料', '请勿外传', '全程班', '版权所有', '小蓝书'],
  noiseWords: [],

  setNoise(list) {
    this.noiseWords = String(list || '')
      .split(/[,，、;；\s]+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
  },

  stripNoise(s) {
    let out = String(s || '');
    const words = this.noiseWords.length ? this.noiseWords : this.NOISE_DEFAULT;
    words.forEach(function (w) { out = out.split(w).join(''); });
    return out
      .replace(/第\s*\d+\s*页/g, '')
      .replace(/\bpage\s*\d+\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  },

  /* 第一个 / 最后一个汉字（含中文标点）的位置 —— 切分就靠它 */
  CJK_CHAR: /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef\u201c\u201d\u2018\u2019]/,
  cjkIndex(s, from) {
    for (let i = from || 0; i < s.length; i++) {
      if (this.CJK_CHAR.test(s.charAt(i))) { return i; }
    }
    return -1;
  },
  lastCJK(s) {
    for (let i = s.length - 1; i >= 0; i--) {
      if (this.CJK_CHAR.test(s.charAt(i))) { return i; }
    }
    return -1;
  },

  /* ---------- 入口：一个 File 对象 → 纯文字 ---------- */
  async fileToText(file) {
    const name = file.name.toLowerCase();

    if (/\.(txt|md|csv)$/.test(name)) {
      return new TextDecoder('utf-8').decode(await file.arrayBuffer());
    }

    if (/\.docx$/.test(name)) {
      const buf = await file.arrayBuffer();
      return await EnParse.docxToText(buf);
    }

    if (/\.pdf$/.test(name)) {
      const buf = await file.arrayBuffer();
      return await EnParse.pdfToText(buf);
    }

    if (/\.doc$/.test(name)) {
      throw new Error('老版 .doc 打不开 —— 请先用 Word 另存为 .docx 再导入');
    }

    throw new Error('先支持 .docx / .pdf / .txt / .md，这个文件类型还不认识');
  },

  /* ---------- .docx：不引外部库，浏览器自己解压 ----------
     docx 其实是个 zip 包，词条一般在 word/document.xml 里。
     zip 的解压用浏览器自带的 DecompressionStream（2023 年后的浏览器都有）。 */
  async docxToText(buf) {
    const u8 = new Uint8Array(buf);

    /* 1. 从文件末尾找 zip 的目录头（PK\x05\x06） */
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
      if (u8[i] === 0x50 && u8[i + 1] === 0x4b && u8[i + 2] === 0x05 && u8[i + 3] === 0x06) { eocd = i; break; }
    }
    if (eocd < 0) { throw new Error('这个 .docx 像是坏的（没找到 zip 目录）'); }

    const dv = new DataView(buf);
    const count = dv.getUint16(eocd + 10, true);
    let ptr = dv.getUint32(eocd + 16, true);

    /* 2. 遍历目录，找到 word/document.xml 的位置和大小 */
    let target = null;
    for (let n = 0; n < count; n++) {
      if (!(u8[ptr] === 0x50 && u8[ptr + 1] === 0x4b && u8[ptr + 2] === 0x01 && u8[ptr + 3] === 0x02)) { break; }
      const method   = dv.getUint16(ptr + 10, true);
      const compSize = dv.getUint32(ptr + 20, true);
      const nameLen  = dv.getUint16(ptr + 28, true);
      const extraLen = dv.getUint16(ptr + 30, true);
      const cmtLen   = dv.getUint16(ptr + 32, true);
      const lho      = dv.getUint32(ptr + 42, true);
      const name = new TextDecoder().decode(u8.subarray(ptr + 46, ptr + 46 + nameLen));

      if (name === 'word/document.xml') {
        const lNameLen = dv.getUint16(lho + 26, true);
        const lExtraLen = dv.getUint16(lho + 28, true);
        target = { method: method, start: lho + 30 + lNameLen + lExtraLen, size: compSize };
      }
      ptr += 46 + nameLen + extraLen + cmtLen;
    }
    if (!target) { throw new Error('这个 .docx 里没有正文（word/document.xml）'); }

    /* 3. 解压 */
    const raw = u8.subarray(target.start, target.start + target.size);
    let xmlBytes = raw;
    if (target.method === 8) {
      if (typeof DecompressionStream === 'undefined') {
        throw new Error('这个浏览器不支持在线解压，换个新点的浏览器，或存成 .txt 导入');
      }
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      xmlBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (target.method !== 0) {
      throw new Error('这个 .docx 的压缩方式不支持');
    }

    /* 4. XML → 文字。
       顺序有讲究：先把「单元格里最后一个段落结束」吞掉（不然它会先换行，
       把制表符挤到下一行去，词条就断成两截了），再统一发换行和制表符。 */
    let xml = new TextDecoder('utf-8').decode(xmlBytes);
    xml = xml
      .replace(/>\s+</g, '><')            /* 标签之间的缩进换行不是正文，先压掉 */
      .replace(/<\/w:p>\s*<\/w:tc>/gi, '</w:tc>')
      .replace(/<w:tab[^>]*\/>/gi, '\t')
      .replace(/<w:br[^>]*\/>/gi, '\n')
      .replace(/<\/w:p>/gi, '\n')
      .replace(/<\/w:tc>/gi, '\t')
      .replace(/<\/w:tr>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    return EnParse.decodeEntities(xml);
  },

  decodeEntities(s) {
    return String(s || '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g,
        function (m, d) { return String.fromCharCode(Number(d)); });
  },

  /* ---------- .pdf：pdf.js（CDN，首次要联网） ---------- */
  async pdfToText(buf) {
    const lib = await EnParse.loadPdfJs();
    const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
    const lines = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();

      /* 把同一条水平线上的文字块拼成一行（y 差 2px 以内算同一行） */
      const rows = [];
      tc.items.forEach(function (it) {
        const y = Math.round(it.transform[5] / 2) * 2;
        let row = null;
        for (let i = 0; i < rows.length; i++) {
          if (Math.abs(rows[i].y - y) <= 1) { row = rows[i]; break; }
        }
        if (!row) { row = { y: y, items: [] }; rows.push(row); }
        row.items.push(it);
      });
      rows.sort(function (a, b) { return b.y - a.y; });
      rows.forEach(function (row) {
        row.items.sort(function (a, b) { return a.transform[4] - b.transform[4]; });
        let line = '';
        row.items.forEach(function (it) {
          line += it.str;
          if (it.hasEOL) { line += '\t'; }   /* 表格类 PDF 靠列间换行分隔 */
        });
        if (line.trim()) { lines.push(line); }
      });
    }
    return lines.join('\n');
  },

  /* PDF 解析库 pdf.js 从哪儿来：
     先找 vendor/ 里那份（已经下好了，断网、传到 GitHub Pages 上都能用），
     万一那份没跟着上传，再依次试三个 CDN。 */
  PDFJS_SOURCES: [
    ['vendor/pdf.min.js', 'vendor/pdf.worker.min.js'],
    ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
     'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
    ['https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
     'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'],
    ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
     'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js']
  ],

  loadPdfJs() {
    if (window.pdfjsLib) { return Promise.resolve(window.pdfjsLib); }
    if (this._pdfjsTask) { return this._pdfjsTask; }

    const loadScript = function (src) {
      return new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = src;
        s.onload = function () { resolve(); };
        s.onerror = function () { reject(new Error('加载失败：' + src)); };
        document.head.appendChild(s);
      });
    };

    const sources = this.PDFJS_SOURCES;
    const attempt = function (i) {
      if (i >= sources.length) {
        return Promise.reject(new Error('PDF 解析库加载不上：本地 vendor/ 里没有，网也连不通。' +
          '可以先把内容粘成 txt 导入，或把 vendor/pdf.min.js 和 pdf.worker.min.js 放回站点目录。'));
      }
      return loadScript(sources[i][0]).then(function () {
        if (!window.pdfjsLib) { throw new Error('没拿到 pdfjsLib'); }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = sources[i][1];
        return window.pdfjsLib;
      }).catch(function () { return attempt(i + 1); });
    };

    this._pdfjsTask = attempt(0);
    return this._pdfjsTask;
  },

  /* ---------- 文字 → 词条 ----------
     认的就是讲义最常见的这种排版：
         1. be known as 被称为；以……而闻名
         39. give sb. some advice about doing sth.给某人一些关于做某事的建议
     英文和中文之间 有空格 / 没空格 / 用等号 / 用冒号 都认 ——
     关键是「汉字从哪儿开始」：汉字出现之前是英文，之后是中文释义。
     中文写前面（放弃 abandon）也能认；水印、页眉这些干扰词先抹掉再切。 */
  parseLine(line) {
    let s = EnParse.stripNoise(line);
    if (!s) { return null; }

    /* 行号 / 项目符号：1.  （1）  •  ① */
    s = s.replace(
      /^\s*(?:[•·*▪◆◦]\s*|\d{1,3}\s*[.、)．]\s*|[（(]\d{1,3}[)）]\s*|[①②③④⑤⑥⑦⑧⑨⑩]\s*)/,
      ''
    ).trim();
    if (!s) { return null; }
    /* 一条词条必须带英文字母 —— 纯数字 / 纯中文的行（页眉、水印）直接丢掉 */
    if (!EnParse.hasEN(s)) { return null; }

    const cjk = EnParse.cjkIndex(s, 0);
    let en = '', zh = '';

    if (cjk > 0) {
      /* 英文在前：第一个汉字就是分界线 */
      en = s.slice(0, cjk);
      zh = s.slice(cjk);
    } else if (cjk === 0) {
      /* 中文在前：最后一个汉字之后才是英文 */
      const last = EnParse.lastCJK(s);
      if (last >= s.length - 1) { return null; }
      zh = s.slice(0, last + 1);
      en = s.slice(last + 1);
    } else {
      /* 整行都没有汉字 —— 多半是标题或页眉，不是词条 */
      return null;
    }

    /* 把两边多余的分隔符收拾干净：
       "look forward to = " → "look forward to"；"：取得进步" → "取得进步"。
       单个句点留着（do sth. 这种缩写本来就该有点），两三个点以上的省略号才处理。 */
    en = en.trim().replace(/[\s\u3000]+$/, '')
      .replace(/[=＝:：\-—–~～、,，;；/｜|]+$/, '')
      .replace(/\.{2,}$/, '')
      .trim();
    zh = zh.trim().replace(/^[=＝:：\-—–~～.、,，;；/｜|\s\u3000]+/, '')
      .replace(/[\s\u3000]+$/, '')
      .trim();

    /* "the capital of ……的省会" 这种：省略号属于中文那边的占位，挪过去读着顺 */
    const dots = en.match(/…+$/);
    if (dots) {
      en = en.slice(0, -dots[0].length).trim();
      zh = dots[0] + zh;
    }

    if (!en || !zh) { return null; }
    if (!EnParse.hasEN(en)) { return null; }
    if (!EnParse.hasCJK(zh)) { return null; }
    /* 长成一大段的，说明这行没切开，宁可不要 */
    if (en.length > 80 || zh.length > 120) { return null; }

    return { en: en, zh: zh };
  },

  /* 整段文字 → 词条。ex 版本额外给出「读了几行、哪些行没认出来」，
     导入失败时可以直接把原文摆出来给用户看，不用猜。 */
  pairsFromTextEx(text) {
    const out = [];
    const seen = {};
    let lines = 0;
    const skipped = [];

    String(text || '').split(/\r?\n/).forEach(function (line) {
      const raw = String(line || '').trim();
      if (!raw) { return; }
      lines++;
      const p = EnParse.parseLine(raw);
      if (!p) {
        if (skipped.length < 8 && EnParse.hasEN(raw)) { skipped.push(raw.slice(0, 60)); }
        return;
      }
      const k = EnStore.wordKey(p.en) + '::' + EnStore.normZh(p.zh);
      if (seen[k]) { return; }
      seen[k] = 1;
      out.push(p);
    });

    return { words: out, lines: lines, skipped: skipped };
  },

  pairsFromText(text) {
    return EnParse.pairsFromTextEx(text).words;
  }
};

/* ==========================================================================
   三、EnPage —— 界面
   ========================================================================== */

const EnPage = {

  state: {
    /* 默认打开第一个板块：知识点 */
    tab: 'notes',
    /* 练习设置 */
    mode: 'en2zh',
    picked: {},                 /* 资料勾选：{ 资料id: true } */
    /* 正在进行的这一轮 */
    quiz: null,                 /* { queue, idx, total, right, phase } */
    wrongState: 'pending',      /* 错题本页签 */
    editingId: null,            /* 正在编辑的资料 */
    openNotes: {},              /* 知识点：哪些条目是展开的 */
    noteGroup: 'all'            /* 知识点：当前看哪一组（all = 全部） */
  },

  /* ------------------------------------------------------------------
     显示 / 隐藏：这里用 hidden 属性（App.show 只清 style，
     清不掉 HTML 里写死的 hidden，练习区会一直藏着）
     ------------------------------------------------------------------ */
  vis(node, show) {
    if (node) { node.hidden = !show; }
  },

  /* ------------------------------------------------------------------
     启动
     ------------------------------------------------------------------ */
  init() {
    EnStore.load();
    this.restorePick();
    this.bindTabs();
    this.bindSetup();
    this.bindQuiz();
    this.bindWrong();
    this.bindMaterials();
    this.bindNotes();
    this.renderAll();
    this.loadShared();

    /* 从学习页 / 其他板块跳过来时，直接打开对应板块：english.html#materials */
    const hash = (window.location.hash || '').replace('#', '');
    if (['vocab', 'wrong', 'materials', 'notes'].indexOf(hash) >= 0) {
      this.switchTab(hash);
    }
    /* 没练完的一轮，顶上给条提示 */
    this.renderResume();
  },

  /* ------------------------------------------------------------------
     拉管理员共享的资料（数据库 / 云端）。
     本地模式没有共享这回事 —— 跳过；拉失败不打扰页面，安静跳过。
     ------------------------------------------------------------------ */
  loadShared() {
    if (typeof SiteAPI === 'undefined' || !SiteAPI.whenReady) { return; }
    const self = this;
    SiteAPI.whenReady().then(function () {
      if (SiteAPI.mode === 'local') { return; }
      return SiteAPI.getEnMaterials().then(function (list) {
        EnStore.remote = Array.isArray(list) ? list : [];
        self.renderAll();
        self.watchShared();      /* 挂上「管理员那边更新了，自动跟上」 */
      });
    }).catch(function () { /* 没共享资料 / 没登录管理员，都当没有 */ });
  },

  /* ------------------------------------------------------------------
     管理员那边一上传新资料，其他人的页面自动跟上
     ------------------------------------------------------------------
     两套补充触发，覆盖常见场景：
       ① 每 3 分钟看一眼（页面开着、人在刷题时也能收到）
       ② 切走再切回来（浏览器这时才准许我们联网，检查一下最划算）
     只有「真的不一样了」才刷新界面 —— 否则每几秒重画一次列表，
     正在填的东西会被吓跑。 */
  watchShared() {
    if (this._watching) { return; }
    this._watching = true;
    if (typeof SiteAPI === 'undefined' || SiteAPI.mode === 'local') { return; }

    const self = this;
    const GAP = 30 * 1000;       /* 两次检查至少隔 30 秒，别把接口打爆 */
    let last = Date.now();

    const check = function (force) {
      if (document.visibilityState === 'hidden' && !force) { return; }
      const now = Date.now();
      if (!force && now - last < GAP) { return; }
      last = now;

      SiteAPI.getEnMaterials().then(function (list) {
        const next = Array.isArray(list) ? list : [];
        const before = EnStore.remote.map(function (m) { return m.id; }).join(',');
        const after = next.map(function (m) { return m.id; }).join(',');

        if (before === after) { return; }      /* 没变化就不动界面 */

        const old = EnStore.remote.length;
        EnStore.remote = next;
        self.renderAll();

        /* 告诉使用者一句：资料变了，不用他自己盯着 */
        const delta = next.length - old;
        if (delta > 0) {
          App.toast('管理员上传了 ' + delta + ' 份新资料，已经加进来了');
        } else if (delta < 0) {
          App.toast('共享资料少了 ' + Math.abs(delta) + ' 份（管理员删掉或改名了）');
        } else {
          App.toast('共享资料有更新');
        }
      }).catch(function () { /* 断网就等下一轮 */ });
    };

    /* ① 定时；② 切回前台时补一次 */
    this._timer = setInterval(function () { check(false); }, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') { check(false); }
    });
  },

  /* 这台机器上能不能「存共享」（管理员 + 有 db / 云端后端） */
  canShare() {
    return typeof Auth !== 'undefined' && Auth.isAdmin() &&
           typeof SiteAPI !== 'undefined' && SiteAPI.whenReady &&
           SiteAPI.mode !== 'local';
  },

  renderAll() {
    this.renderStats();
    this.renderPick();
    this.renderWrong();
    this.renderMaterials();
  },

  /* ------------------------------------------------------------------
     板块切换
     ------------------------------------------------------------------ */
  bindTabs() {
    const self = this;
    App.qsa('.en-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.switchTab(btn.getAttribute('data-tab'));
      });
    });
  },

  switchTab(name) {
    this.state.tab = name;
    App.qsa('.en-tab').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-tab') === name);
    });
    App.qsa('.en-panel').forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'panel-' + name);
    });
    if (window.location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  },

  /* ------------------------------------------------------------------
     三块统计（词库总量 / 待巩固错题 / 今日已练习）
     ------------------------------------------------------------------ */
  renderStats() {
    const box = App.qs('[data-en-stats]');
    if (!box) { return; }

    const total = EnStore.totalWords();
    const pending = EnStore.pendingCount();
    const today = EnStore.todayStats();
    const pct = today.t ? Math.round((today.r / today.t) * 100) : 0;

    box.innerHTML =
      '<div class="en-stat">' +
        '<span class="en-stat__icon">▤</span>' +
        '<span class="en-stat__label">词库总量</span>' +
        '<span class="en-stat__num"><b>' + total + '</b> 词汇</span>' +
      '</div>' +
      '<div class="en-stat en-stat--warm">' +
        '<span class="en-stat__icon">⚑</span>' +
        '<span class="en-stat__label">待巩固错题</span>' +
        '<span class="en-stat__num"><b>' + pending + '</b> 道</span>' +
      '</div>' +
      '<div class="en-stat en-stat--cool">' +
        '<span class="en-stat__icon">✓</span>' +
        '<span class="en-stat__label">今日已练习</span>' +
        '<span class="en-stat__num"><b>' + today.t + '</b> 道 ' + (today.t ? '正确 ' + pct + '%' : '') + '</span>' +
      '</div>';

    /* 页签上的小数字 */
    const wc = App.qs('[data-wrong-count]');
    if (wc) { wc.textContent = pending; }
    const mc = App.qs('[data-material-count]');
    if (mc) { mc.textContent = EnStore.allMats().length; }
  },

  /* ------------------------------------------------------------------
     练习设置：筛选 + 勾选资料 + 方式
     ------------------------------------------------------------------ */
  bindSetup() {
    const self = this;

    App.qsa('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.qsa('[data-mode]').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        self.state.mode = btn.getAttribute('data-mode');
      });
    });

    ['setupSearch', 'setupDateFrom', 'setupDateTo'].forEach(function (id) {
      const el = App.qs('#' + id);
      if (el) { el.addEventListener('input', function () { self.renderPick(); }); }
    });
    App.qsa('[data-filter-reset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ['setupSearch', 'setupDateFrom', 'setupDateTo', 'matSearch', 'matDateFrom', 'matDateTo']
          .forEach(function (id) { const el = App.qs('#' + id); if (el) { el.value = ''; } });
        self.renderPick();
        self.renderMaterials();
      });
    });

    const pickAll = App.qs('[data-pick-all]');
    if (pickAll) {
      pickAll.addEventListener('click', function () {
        self.filteredMaterials().forEach(function (m) { self.state.picked[m.id] = true; });
        self.renderPick();
      });
    }
    const pickNone = App.qs('[data-pick-none]');
    if (pickNone) {
      pickNone.addEventListener('click', function () {
        self.state.picked = {};
        self.renderPick();
      });
    }

    const start = App.qs('[data-start]');
    if (start) { start.addEventListener('click', function () { self.startSetupQuiz(); }); }
  },

  /* 筛选后的资料列表（练习设置和资料页共用一套筛选逻辑） */
  dateInRange(dateStr, fromId, toId) {
    const from = (App.qs('#' + fromId) || {}).value || '';
    const to = (App.qs('#' + toId) || {}).value || '';
    const d = String(dateStr || '');
    if (from && d && d < from) { return false; }
    if (to && d && d > to) { return false; }
    return true;
  },

  filteredMaterials() {
    const kw = ((App.qs('#setupSearch') || {}).value || '').trim().toLowerCase();
    return EnStore.allMats().filter(function (m) {
      if (kw && String(m.name || '').toLowerCase().indexOf(kw) < 0) { return false; }
      return EnPage.dateInRange(m.date, 'setupDateFrom', 'setupDateTo');
    });
  },

  /* 记住上次勾了哪几份（存在浏览器，刷新还在） */
  restorePick() {
    try {
      const saved = JSON.parse(localStorage.getItem('shuoscape_en_pick') || '{}');
      const ids = {};
      EnStore.allMats().forEach(function (m) { ids[m.id] = 1; });
      Object.keys(saved).forEach(function (k) { if (ids[k]) { EnPage.state.picked[k] = true; } });
    } catch (e) { /* 忽略 */ }
  },
  savePick() {
    try { localStorage.setItem('shuoscape_en_pick', JSON.stringify(this.state.picked)); } catch (e) { /* 忽略 */ }
  },

  renderPick() {
    const box = App.qs('[data-pick-list]');
    if (!box) { return; }
    const self = this;
    const mats = this.filteredMaterials();

    if (!EnStore.allMats().length) {
      box.innerHTML = '<div class="en-empty">词库还空着 —— 去「学习资料」导入一份，或点上面手动新建。</div>';
    } else if (!mats.length) {
      box.innerHTML = '<div class="en-empty">没有符合筛选的资料，改改关键词或日期。</div>';
    } else {
      box.innerHTML = mats.map(function (m) {
        const on = self.state.picked[m.id] ? ' is-on' : '';
        const checked = on ? ' checked' : '';
        return '' +
          '<label class="en-pick-card' + on + '" data-pid="' + App.escape(m.id) + '">' +
            '<input type="checkbox"' + checked + '>' +
            '<span class="en-pick-card__box"></span>' +
            '<span class="en-pick-card__icon">▤</span>' +
            '<span class="en-pick-card__name">' + App.escape(m.name) + '</span>' +
            '<span class="en-pick-card__meta">' + App.escape(m.date || '—') + ' · 学习</span>' +
            '<span class="en-pick-card__num">' + (m.words || []).length + ' 个词条</span>' +
          '</label>';
      }).join('');

      /* 勾选走 checkbox 的 change（label 会自动转发点击，别再在卡片上叠一层
         click，否则一次点击会被当成两次，勾了又马上取消） */
      App.qsa('input[type="checkbox"]', box).forEach(function (input) {
        input.addEventListener('change', function () {
          const card = input.closest('[data-pid]');
          if (!card) { return; }
          const id = card.getAttribute('data-pid');
          if (input.checked) { self.state.picked[id] = true; }
          else { delete self.state.picked[id]; }
          self.savePick();
          card.classList.toggle('is-on', input.checked);
          self.renderPickSummary();
        });
      });
    }

    this.renderPickSummary();
  },

  /* 底下一行小结 + 「准备好了吗」的题数（勾选变化时只刷这里，不动列表） */
  renderPickSummary() {
    const self = this;
    let words = 0;
    const seen = {};
    EnStore.allMats().forEach(function (m) {
      if (!self.state.picked[m.id]) { return; }
      (m.words || []).forEach(function (w) {
        const k = EnStore.wordKey(w.en);
        if (!k || seen[k]) { return; }
        seen[k] = 1;
        words += 1;
      });
    });
    const pickN = Object.keys(this.state.picked).filter(function (k) { return self.state.picked[k]; }).length;
    const summary = App.qs('[data-pick-summary]');
    if (summary) { summary.textContent = '已选 ' + pickN + ' 份资料，共 ' + words + ' 个词条'; }

    const countSel = App.qs('#quizCount');
    const want = countSel && countSel.value !== 'all' ? Number(countSel.value) : 0;
    const willDo = want ? Math.min(want, words) : words;
    const desc = App.qs('[data-ready-desc]');
    if (desc) {
      desc.textContent = willDo
        ? '本轮将练习 ' + willDo + ' 道题，答错的内容会进入错题本。'
        : '先在上面挑一份资料。';
    }
    if (countSel) {
      countSel.removeEventListener('change', this._onCount);
      this._onCount = function () { self.renderPick(); };
      countSel.addEventListener('change', this._onCount);
    }
  },

  /* 从勾选的资料里收词条 */
  collectedWords() {
    const seen = {};
    const out = [];
    const self = this;
    EnStore.allMats().forEach(function (m) {
      if (!self.state.picked[m.id]) { return; }
      (m.words || []).forEach(function (w) {
        const k = EnStore.wordKey(w.en);
        if (!k || seen[k]) { return; }
        seen[k] = 1;
        out.push({ en: w.en, zh: w.zh, source: m.name });
      });
    });
    return out;
  },

  /* ------------------------------------------------------------------
     练习进行中
     ------------------------------------------------------------------ */
  bindQuiz() {
    const self = this;
    const on = function (sel, fn) {
      const el = App.qs(sel);
      if (el) { el.addEventListener('click', fn); }
    };

    on('[data-start]', function () { self.startSetupQuiz(); });
    on('[data-quiz-check]', function () { self.checkAnswer(); });
    on('[data-quiz-reveal]', function () { self.revealAnswer('reveal'); });
    on('[data-quiz-skip]', function () { self.revealAnswer('skip'); });
    on('[data-quiz-next]', function () { self.nextQuestion(); });
    on('[data-quiz-quit]', function () { self.quitQuiz(); });
    on('[data-result-again]', function () { self.againQuiz(); });
    on('[data-result-done]', function () { self.finishQuiz(); });

    const input = App.qs('#quizInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (self.state.quiz && self.state.quiz.phase === 'typing') { self.checkAnswer(); }
          else { self.nextQuestion(); }
        }
      });
    }
  },

  /* 把一批词条变成一轮练习（随机 / 混合在这里定死，续练才不会变卦） */
  buildQueue(words, mode, count, random) {
    const list = words.slice();
    if (random) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = list[i]; list[i] = list[j]; list[j] = t;
      }
    }
    const q = list.slice(0, count > 0 ? count : list.length).map(function (w) {
      return {
        en: w.en, zh: w.zh, source: w.source || '',
        dir: mode === 'mix' ? (Math.random() < 0.5 ? 'en2zh' : 'zh2en') : mode
      };
    });
    return q;
  },

  startSetupQuiz() {
    const words = this.collectedWords();
    if (!words.length) { App.toast('先挑一份资料再开始'); return; }

    const sel = App.qs('#quizCount');
    const count = sel && sel.value !== 'all' ? Number(sel.value) : 0;
    const random = App.qs('#quizRandom') ? App.qs('#quizRandom').checked : true;

    this.state.quiz = {
      queue: this.buildQueue(words, this.state.mode, count, random),
      idx: 0, total: 0, right: 0, phase: 'typing'
    };
    this.state.quiz.total = this.state.quiz.queue.length;
    EnStore.round = { queue: this.state.quiz.queue, idx: 0, total: this.state.quiz.total, right: 0 };
    EnStore.saveRound();
    this.renderResume();
    this.showQuiz();
  },

  /* 上一轮没练完：接着来 */
  resumeQuiz() {
    const r = EnStore.round;
    if (!r || !r.queue || r.idx >= r.queue.length) { EnStore.round = null; EnStore.saveRound(); this.renderResume(); return; }
    this.state.quiz = { queue: r.queue, idx: r.idx, total: r.total, right: r.right, phase: 'typing' };
    this.showQuiz();
  },

  dropRound() {
    EnStore.round = null;
    EnStore.saveRound();
    this.renderResume();
    App.toast('那一轮先放着了，随时重新开一轮');
  },

  showQuiz() {
    this.vis(App.qs('[data-setup]'), false);
    this.vis(App.qs('[data-result]'), false);
    this.vis(App.qs('[data-quiz]'), true);
    this.renderQuestion();
  },

  renderQuestion() {
    const q = this.state.quiz;
    if (!q) { return; }
    const item = q.queue[q.idx];

    App.qs('[data-quiz-idx]').textContent = q.idx + 1;
    App.qs('[data-quiz-total]').textContent = q.total;
    App.qs('[data-quiz-bar]').style.width = Math.round((q.idx / Math.max(1, q.total)) * 100) + '%';
    App.qs('[data-quiz-dir]').textContent = item.dir === 'en2zh' ? '英译汉' : '汉译英';
    App.qs('[data-quiz-ask]').textContent = item.dir === 'en2zh' ? item.en : item.zh;
    App.qs('[data-quiz-tip]').textContent = item.dir === 'en2zh' ? '写出它的中文释义' : '写出它的英文';

    const input = App.qs('#quizInput');
    input.value = '';
    input.placeholder = item.dir === 'en2zh' ? '输入中文释义后回车' : '输入英文后回车';

    this.vis(App.qs('[data-quiz-feed]'), false);
    App.qs('[data-quiz-truth]').hidden = true;
    App.qs('[data-quiz-next]').hidden = true;
    q.phase = 'typing';

    const self = this;
    App.qsa('[data-quiz-reveal], [data-quiz-skip]').forEach(function (b) { self.vis(b, true); });
    input.focus();
  },

  /* 比对答案：中文按 、/；/， 等拆成多个说法，对上任意一个就算对 */
  answerIsCorrect(item, input) {
    const raw = String(input || '').trim();
    if (!raw) { return false; }
    if (item.dir === 'en2zh') {
      const want = EnStore.normZh(item.zh);
      const got = EnStore.normZh(raw);
      if (got === want) { return true; }
      /* 多个释义：对上其中一个即可 */
      const variants = String(item.zh).split(/[；;，,、/／]/).map(function (v) { return EnStore.normZh(v); }).filter(function (v) { return v; });
      return variants.indexOf(got) >= 0;
    }
    return EnStore.normEn(raw) === EnStore.wordKey(item.en);
  },

  checkAnswer() {
    const q = this.state.quiz;
    if (!q || q.phase !== 'typing') { return; }
    const item = q.queue[q.idx];
    const input = App.qs('#quizInput').value;

    if (!input.trim()) { App.toast('先写点什么，或点「跳过」'); return; }

    if (this.answerIsCorrect(item, input)) {
      EnStore.recordAnswer(item, item.dir, 'right', item.source);
      q.right += 1;
      q.phase = 'done-auto';
      this.showFeed('right', item, '');
      setTimeout(function () {
        if (EnPage.state.quiz && EnPage.state.quiz.phase === 'done-auto') { EnPage.nextQuestion(); }
      }, 750);
    } else {
      EnStore.recordAnswer(item, item.dir, 'wrong', item.source);
      q.phase = 'done';
      this.showFeed('wrong', item, input);
    }
    this.renderStats();
    this.renderWrong();
  },

  revealAnswer(outcome) {
    const q = this.state.quiz;
    if (!q || q.phase !== 'typing') { return; }
    const item = q.queue[q.idx];
    EnStore.recordAnswer(item, item.dir, outcome, item.source);
    q.phase = 'done';
    this.showFeed(outcome, item, '');
    this.renderStats();
    this.renderWrong();
  },

  showFeed(kind, item, input) {
    const feed = App.qs('[data-quiz-feed]');
    const verdict = App.qs('[data-quiz-verdict]');
    const truth = App.qs('[data-quiz-truth]');
    const next = App.qs('[data-quiz-next]');

    this.vis(App.qs('[data-quiz-feed]'), true);
    truth.hidden = kind === 'right';
    next.hidden = kind === 'right';    /* 答对自动进下一题 */

    if (kind === 'right') {
      verdict.textContent = '✓ 答对了，继续保持';
      verdict.className = 'en-quiz__verdict is-good';
    } else {
      const label = kind === 'wrong' ? '✗ 这个还没记住，已记入错题本'
                  : kind === 'reveal' ? '✗ 看了答案 —— 已按待巩固记入错题本'
                  : '✗ 跳过了 —— 已按未作答记入错题本';
      verdict.textContent = label;
      verdict.className = 'en-quiz__verdict is-bad';
      truth.textContent = item.en + '　' + item.zh + (item.source ? '　·　来自「' + item.source + '」' : '');
      if (kind === 'wrong' && input) {
        truth.textContent = '你写的是「' + input.trim() + '」。正确：' + item.en + '　' + item.zh;
      }
    }

    App.qsa('[data-quiz-reveal], [data-quiz-skip]').forEach(function (b) { EnPage.vis(b, false); });
    const btn = App.qs('[data-quiz-check]');
    if (btn) { btn.disabled = kind !== 'right'; }
    if (kind !== 'right') {
      const n = App.qs('[data-quiz-next]');
      if (n) { n.focus(); }
    }
  },

  nextQuestion() {
    const q = this.state.quiz;
    if (!q) { return; }
    const btn = App.qs('[data-quiz-check]');
    if (btn) { btn.disabled = false; }

    q.idx += 1;
    if (q.idx >= q.queue.length) {
      /* 练完了 */
      EnStore.round = null;
      EnStore.saveRound();
      this.renderResume();
      this.vis(App.qs('[data-quiz]'), false);
      App.qs('[data-result-total]').textContent = q.queue.length;
      App.qs('[data-result-right]').textContent = q.right;
      App.qs('[data-result-wrong]').textContent = q.queue.length - q.right;
      this.vis(App.qs('[data-result]'), true);
      this.state.lastSetup = { mode: this.state.mode };
      return;
    }
    /* 存一下进度，中途关页也能续 */
    EnStore.round = { queue: q.queue, idx: q.idx, total: q.total, right: q.right };
    EnStore.saveRound();
    this.renderQuestion();
  },

  quitQuiz() {
    const q = this.state.quiz;
    if (!q) { return; }
    if (q.idx < q.queue.length) {
      /* 没练完的留在「未完成」里，下次可以续 */
      EnStore.round = { queue: q.queue, idx: q.idx, total: q.total, right: q.right };
      EnStore.saveRound();
    }
    this.state.quiz = null;
    this.vis(App.qs('[data-quiz]'), false);
    this.vis(App.qs('[data-setup]'), true);
    this.renderResume();
    this.renderPick();
  },

  againQuiz() {
    this.vis(App.qs('[data-result]'), false);
    this.vis(App.qs('[data-setup]'), true);
  },

  finishQuiz() {
    this.vis(App.qs('[data-result]'), false);
    this.vis(App.qs('[data-setup]'), true);
    this.state.quiz = null;
    this.renderAll();
  },

  /* ------------------------------------------------------------------
     顶上那条「还有一轮没练完」
     ------------------------------------------------------------------ */
  renderResume() {
    const bar = App.qs('[data-en-resume]');
    if (!bar) { return; }
    const r = EnStore.round;
    const has = !!(r && r.queue && r.idx < r.queue.length);
    bar.hidden = !has;
    if (has) {
      App.qs('[data-resume-text]').textContent =
        '你还有一轮未完成的练习 · ' + (r.idx + 1) + ' / ' + r.queue.length;
      const self = this;
      App.qs('[data-resume-go]').onclick = function () { self.resumeQuiz(); };
      App.qs('[data-resume-drop]').onclick = function () { self.dropRound(); };
    }
  },

  /* ------------------------------------------------------------------
     板块二：错题本
     ------------------------------------------------------------------ */
  bindWrong() {
    const self = this;
    App.qsa('[data-wrong-tabs] .en-wtab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.qsa('[data-wrong-tabs] .en-wtab').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        self.state.wrongState = btn.getAttribute('data-state');
        self.renderWrong();
      });
    });

    ['wrongSearch', 'wrongDir'].forEach(function (id) {
      const el = App.qs('#' + id);
      if (el) { el.addEventListener('input', function () { self.renderWrong(); }); }
    });

    const drill = App.qs('[data-wrong-drill]');
    if (drill) {
      drill.addEventListener('click', function () { self.drillWrong(); });
    }
  },

  renderWrong() {
    const box = App.qs('[data-wrong-list]');
    if (!box) { return; }
    const self = this;
    const st = this.state.wrongState;
    const kw = ((App.qs('#wrongSearch') || {}).value || '').trim().toLowerCase();
    const dirSel = ((App.qs('#wrongDir') || {}).value || 'all');

    let rows = EnStore.wrong.filter(function (r) {
      if (st === 'pending' && r.mastered) { return false; }
      if (st === 'mastered' && !r.mastered) { return false; }
      if (dirSel !== 'all' && !r.pend[dirSel] && r.lastDir !== dirSel && !(st === 'all')) { return false; }
      if (dirSel !== 'all' && st === 'pending' && !r.pend[dirSel]) { return false; }
      if (kw &&
          String(r.en || '').toLowerCase().indexOf(kw) < 0 &&
          String(r.zh || '').toLowerCase().indexOf(kw) < 0) { return false; }
      return true;
    });
    rows.sort(function (a, b) { return (b.add || '') < (a.add || '') ? -1 : 1; });

    const total = App.qs('[data-wrong-total]');
    if (total) {
      total.textContent = rows.length + ' 道题';
    }
    const pendN = App.qs('[data-wrong-pending]');
    if (pendN) { pendN.textContent = EnStore.pendingCount(); }
    const head = App.qs('[data-wrong-head]');
    if (head) { head.style.display = rows.length ? '' : 'none'; }

    if (!rows.length) {
      box.innerHTML = '<div class="en-empty">' +
        (st === 'pending' ? '暂时没有待巩固的错题 —— 保持住！'
          : st === 'mastered' ? '还没有掌握记录 —— 答对错题后会自动归到这里'
          : '还没记过错题 —— 去练一轮吧') + '</div>';
      return;
    }

    box.innerHTML = rows.map(function (r) {
      const dirs = [];
      if (r.pend.en2zh || r.lastDir === 'en2zh') { dirs.push('英译汉'); }
      if (r.pend.zh2en || r.lastDir === 'zh2en') { dirs.push('汉译英'); }
      const dirTxt = dirs.length ? dirs.join(' / ') : '—';
      const lastTxt = r.last === 'wrong' ? '答错'
                    : r.last === 'skip' ? '未作答'
                    : r.last === 'reveal' ? '查看答案'
                    : r.last === 'right' ? '答对 ✓' : '—';
      const stateBadge = r.mastered
        ? '<span class="en-badge en-badge--ok">已掌握</span>'
        : '<span class="en-badge en-badge--warn">待巩固</span>';

      return '' +
        '<div class="en-row' + (r.mastered ? ' is-mastered' : '') + '">' +
          '<span class="en-row__word"><b>' + App.escape(r.en) + '</b><i>' + App.escape(r.zh) + '</i></span>' +
          '<span class="en-row__src">' + App.escape(r.source || '—') +
            '<i class="en-tag">' + App.escape(dirTxt) + '</i></span>' +
          '<span class="en-row__rec">' + stateBadge +
            '<i>累计 ' + r.total + ' 次待巩固<br>上次：' + App.escape(lastTxt) + '</i></span>' +
          '<span class="en-row__ops">' +
            (r.mastered
              ? '<button class="btn btn--sm" type="button" data-wrong-revert="' + App.escape(r.key) + '">恢复待巩固</button>'
              : '<button class="btn btn--sm" type="button" data-wrong-master="' + App.escape(r.key) + '">标记掌握</button>') +
          '</span>' +
        '</div>';
    }).join('');

    App.qsa('[data-wrong-master]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-wrong-master');
        EnStore.wrong.forEach(function (r) {
          if (r.key === key) { r.pend = {}; r.mastered = true; }
        });
        EnStore.saveWrong();
        self.renderWrong();
        self.renderStats();
        App.toast('已标记掌握');
      });
    });
    App.qsa('[data-wrong-revert]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-wrong-revert');
        EnStore.wrong.forEach(function (r) {
          if (r.key === key) { r.mastered = false; r.pend = { en2zh: true, zh2en: true }; }
        });
        EnStore.saveWrong();
        self.renderWrong();
        self.renderStats();
        App.toast('放回待巩固了');
      });
    });
  },

  /* 重练错题：把所有待巩固的捞出来来一轮 */
  drillWrong() {
    const pend = EnStore.wrong.filter(function (r) { return !r.mastered; });
    if (!pend.length) { App.toast('没有待巩固的错题，先练一轮新的吧'); return; }
    const words = pend.map(function (r) {
      return { en: r.en, zh: r.zh, source: r.source };
    });
    const queue = this.buildQueue(words, 'mix', 0, true).map(function (item) {
      /* 方向按记录里「哪个方向没过关」来 */
      const rec = pend.filter(function (r) { return EnStore.wordKey(r.en) === EnStore.wordKey(item.en); })[0];
      if (rec) {
        if (rec.pend.en2zh && !rec.pend.zh2en) { item.dir = 'en2zh'; }
        else if (rec.pend.zh2en && !rec.pend.en2zh) { item.dir = 'zh2en'; }
      }
      return item;
    });

    this.state.quiz = { queue: queue, idx: 0, total: queue.length, right: 0, phase: 'typing' };
    EnStore.round = { queue: queue, idx: 0, total: queue.length, right: 0 };
    EnStore.saveRound();
    this.switchTab('vocab');
    this.renderResume();
    this.showQuiz();
  },

  /* ------------------------------------------------------------------
     板块三：学习资料
     ------------------------------------------------------------------ */
  bindMaterials() {
    const self = this;

    ['matSearch', 'matDateFrom', 'matDateTo'].forEach(function (id) {
      const el = App.qs('#' + id);
      if (el) { el.addEventListener('input', function () { self.renderMaterials(); }); }
    });

    /* 导入入口：点按钮 → 弹出「导入」对话框（文件选择框就摆在里面，看得见）
       以前是点一下直接唤起系统的文件窗口，有的浏览器反应慢，
       看上去就像「点了没反应」，所以改成先弹一个明确的框。
       ★ 导入对所有人开放：
         管理员导入 → 存数据库 / 云端，人人共享；
         普通用户导入 → 只存自己浏览器（IndexedDB），不上传。 */
    const imp = App.qs('[data-import]');
    if (imp) { imp.addEventListener('click', function () { self.openImportDialog(); }); }

    const newBtn = App.qs('[data-newmat]');
    if (newBtn) {
      newBtn.addEventListener('click', function () { self.openEditor(null); });
    }

    const exp = App.qs('[data-export]');
    if (exp) { exp.addEventListener('click', function () { self.exportBackup(); }); }

    const res = App.qs('[data-restore]');
    if (res) { res.addEventListener('click', function () { self.restoreBackup(); }); }
  },

  filteredMatList() {
    const kw = ((App.qs('#matSearch') || {}).value || '').trim().toLowerCase();
    const self = this;
    return EnStore.allMats().filter(function (m) {
      if (kw && String(m.name || '').toLowerCase().indexOf(kw) < 0) { return false; }
      return self.dateInRange(m.date, 'matDateFrom', 'matDateTo');
    });
  },

  renderMaterials() {
    const box = App.qs('[data-mat-list]');
    if (!box) { return; }
    const self = this;
    const rows = this.filteredMatList();

    const shown = App.qs('[data-mat-shown]');
    if (shown) { shown.textContent = rows.length + ' 份'; }
    const head = App.qs('[data-mat-head]');
    if (head) { head.style.display = rows.length ? '' : 'none'; }

    if (!rows.length) {
      box.innerHTML = '<div class="en-empty">' +
        (EnStore.allMats().length ? '没有符合筛选的资料。' : '还没有资料 —— 点右上角「导入学习资料」，或先手动新建一份。') +
        '</div>';
      return;
    }

    box.innerHTML = rows.map(function (m) {
      const isCloud = m.store === 'cloud';
      /* 共享资料只有管理员能改；本地资料谁导入的谁随便改 */
      const adminAttr = isCloud ? ' data-admin-only' : '';
      return '' +
        '<div class="en-row en-row--mat">' +
          '<span class="en-row__file"><i class="en-row__ficon">▤</i>' + App.escape(m.name) +
            '<i class="en-row__tag' + (isCloud ? ' en-row__tag--cloud' : '') + '">' + (isCloud ? '共享' : '本地') + '</i></span>' +
          '<span class="en-row__date">' + App.escape(m.date || '—') + '</span>' +
          '<span class="en-row__count">' + (m.words || []).length + '</span>' +
          '<span class="en-row__ops">' +
            '<button class="icon-mini" type="button" title="查看" data-mat-view="' + App.escape(m.id) + '">👁</button>' +
            '<button class="icon-mini" type="button" title="编辑"' + adminAttr + ' data-mat-edit="' + App.escape(m.id) + '">✎</button>' +
            '<button class="icon-mini" type="button" title="删除"' + adminAttr + ' data-mat-del="' + App.escape(m.id) + '">🗑</button>' +
          '</span>' +
        '</div>';
    }).join('');

    App.qsa('[data-mat-view]', box).forEach(function (btn) {
      btn.addEventListener('click', function () { self.openViewer(btn.getAttribute('data-mat-view')); });
    });
    App.qsa('[data-mat-edit]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const id = btn.getAttribute('data-mat-edit');
        /* 自己导入的本地资料：谁都能改，不用登录
           共享资料（管理员传上去的）：要先过一遍登录门槛 */
        const m = self.findMat(id);
        if (m && m.store === 'cloud' && !Auth.gate()) { return; }
        self.openEditor(id);
      });
    });
    App.qsa('[data-mat-del]', box).forEach(function (btn) {
      btn.addEventListener('click', function () { self.deleteMaterial(btn.getAttribute('data-mat-del')); });
    });
  },

  /* ------------------------------------------------------------------
     板块一：知识点（课堂笔记）
     ------------------------------------------------------------------
     数据在 js/notes-data.js 里（从三份 PDF 抽出来的纯文字），
     所以这一块不联网、不用上传任何文件，点开就有。 */
  bindNotes() {
    const self = this;
    const search = App.qs('#noteSearch');
    if (search) {
      search.addEventListener('input', function () { self.renderNotes(); });
    }
    const reset = App.qs('[data-note-reset]');
    if (reset) {
      reset.addEventListener('click', function () {
        if (search) { search.value = ''; }
        self.state.noteGroup = 'all';
        self.renderNotes();
      });
    }
    /* 分组筛选：点小圆片切换（全部 / 第 1–14 课 / …） */
    const chips = App.qs('[data-note-langs]');
    if (chips) {
      chips.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-lang]');
        if (!chip) { return; }
        self.state.noteGroup = chip.getAttribute('data-lang');
        self.renderNotes();
      });
    }
    /* 一键展开 / 收起（跳转阅读页模式下不再需要，按钮已从页面移除；
       这里保留空判断，老页面上万一还留着按钮也不会报错） */
    const expand = App.qs('[data-note-expand]');
    if (expand) { expand.hidden = true; }
    const collapse = App.qs('[data-note-collapse]');
    if (collapse) { collapse.hidden = true; }
    this.renderNotes();
  },

  /* 把关键词在正文里标出来。先转义再标，免得内容里的尖括号被当成标签 */
  mark(text, kw) {
    const safe = App.escape(text);
    if (!kw) { return safe; }
    const k = App.escape(kw);
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return safe.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
  },

  renderNotes() {
    const box = App.qs('[data-note-groups]');
    if (!box) { return; }
    const self = this;
    const groups = (window.NOTES_DATA || {}).groups || [];
    const kw = (((App.qs('#noteSearch') || {}).value) || '').trim();
    const lang = this.state.noteGroup || 'all';

    /* 分组筛选的小圆片：全部 + 每一组笔记（名字直接取自数据） */
    const chipBox = App.qs('[data-note-langs]');
    if (chipBox) {
      const defs = [{ id: 'all', name: '全部' }].concat(groups.map(function (g) {
        return { id: g.id, name: g.title };
      }));
      chipBox.innerHTML = defs.map(function (d) {
        const on = d.id === lang ? ' is-active' : '';
        return '<button class="en-lang-chip' + on + '" type="button" data-lang="' +
          App.escape(d.id) + '">' + App.escape(d.name) + '</button>';
      }).join('');
    }

    /* 顶部概览：一共有几组、几条 */
    let allCount = 0;
    groups.forEach(function (g) { allCount += (g.items || []).length; });
    const summary = App.qs('[data-note-summary]');
    if (summary) {
      summary.innerHTML = groups.map(function (g) {
        return '' +
          '<div class="en-nsum">' +
            '<b>' + (g.items || []).length + '</b>' +
            '<span>' + App.escape(g.title) + '</span>' +
            '<i>' + App.escape(g.file || '') + '</i>' +
          '</div>';
      }).join('');
    }
    /* 标签上的条数 */
    const tabCount = App.qs('[data-note-tab-count]');
    if (tabCount) { tabCount.textContent = allCount; }

    if (!groups.length) {
      box.innerHTML = '<div class="en-empty">还没有知识点 —— 数据文件 js/notes-data.js 没加载到。</div>';
      return;
    }

    const lower = kw.toLowerCase();
    let total = 0;

    box.innerHTML = groups.map(function (g) {
      /* 分组筛选：不匹配的整组跳过 */
      if (lang !== 'all' && g.id !== lang) { return ''; }
      /* 搜的时候只留命中的条目；没搜就全显示 */
      const items = (g.items || []).filter(function (it) {
        if (!lower) { return true; }
        return it.title.toLowerCase().indexOf(lower) >= 0 ||
               it.body.toLowerCase().indexOf(lower) >= 0;
      });
      if (!items.length) { return ''; }
      total += items.length;

      return '' +
        '<div class="en-ngroup">' +
          '<div class="en-ngroup__head">' +
            '<b><i class="en-lang en-lang--en">EN</i>' + App.escape(g.title) + '</b>' +
            '<span>' + items.length + ' 条 · 来自 ' + App.escape(g.file || '') + '</span>' +
          '</div>' +
          '<div class="en-ngroup__list">' +
            items.map(function (it) {
              /* 点一条 → 跳独立阅读页 note.html?id=…：
                 宽版面 + 大字号，比在列表里挤一行展开读起来舒服得多。
                 搜索到的关键词高亮照旧。 */
              return '' +
                '<a class="en-note" data-note="' + App.escape(it.id) + '" ' +
                   'href="note.html?id=' + encodeURIComponent(it.id) + '">' +
                  '<span class="en-note__head">' +
                    '<span class="en-note__title">' + self.mark(it.title, kw) + '</span>' +
                    '<span class="en-note__meta">' + it.chars + ' 字</span>' +
                    '<span class="en-note__chev" aria-hidden="true">→</span>' +
                  '</span>' +
                '</a>';
            }).join('') +
          '</div>' +
        '</div>';
    }).join('');

    const stat = App.qs('[data-note-stat]');
    if (stat) {
      stat.textContent = kw
        ? '找到 ' + total + ' 条含「' + kw + '」的知识点'
        : '共 ' + total + ' 条知识点，点一条进入沉浸阅读';
    }
  },

  /* ---------- 导入对话框 ----------
     把「选文件 / 拖文件 / 粘贴文字」三条路都摆在同一个框里，
     点了按钮马上就有东西出现，不用猜系统文件窗口什么时候弹出来。 */
  openImportDialog() {
    const modal = App.qs('#enModal');
    const body = App.qs('[data-modal-body]', modal);
    const self = this;

    body.innerHTML =
      '<div class="modal__content en-import">' +
        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">IMPORT</div>' +
          '<h3 class="editor-head__title">导入学习资料</h3>' +
          '<p class="editor-head__sub">' +
            'Word（.docx）、PDF、纯文本（.txt / .md / .csv）都行；也可以把内容直接粘进来。' +
          '</p>' +
        '</div>' +

        '<div class="en-drop" data-drop>' +
          '<input type="file" id="enPickFile" class="en-drop__input" ' +
                 'accept=".docx,.pdf,.txt,.md,.csv">' +
          '<label class="en-drop__label" for="enPickFile">' +
            '<span class="en-drop__icon">⬆</span>' +
            '<b>点这里选一个文件</b>' +
            '<span>也可以把文件拖进这块区域</span>' +
          '</label>' +
        '</div>' +

        '<p class="en-import__msg" data-imp-msg hidden></p>' +

        '<div class="en-import__noise">' +
          '<label for="enNoise">要忽略的字（页眉 / 水印，逗号分开）</label>' +
          '<input type="text" id="enNoise" placeholder="小蓝人,专升本,内部资料,请勿外传">' +
        '</div>' +

        '<div class="en-import__or"><span>或者直接粘贴</span></div>' +
        '<textarea class="en-import__paste" data-imp-paste rows="4" ' +
          'placeholder="每行一条：英文 + 中文。用空格、制表符、等号或冒号分开都认&#10;例：look forward to = 期待；盼望"></textarea>' +

        '<div class="modal__foot">' +
          '<button class="en-link" type="button" data-imp-tpl>下载导入模板</button>' +
          '<span class="en-import__gap"></span>' +
          '<button class="btn" type="button" data-cancel>取消</button>' +
          '<button class="btn btn--primary" type="button" data-imp-go>从粘贴内容导入</button>' +
        '</div>' +
      '</div>';

    const msg = App.qs('[data-imp-msg]', body);
    const fileEl = App.qs('#enPickFile', body);
    const pasteEl = App.qs('[data-imp-paste]', body);
    const noiseEl = App.qs('#enNoise', body);

    /* 每次读之前，把「要忽略的字」交给解析器 */
    const applyNoise = function () {
      EnParse.setNoise(noiseEl ? noiseEl.value : '');
    };
    if (noiseEl) { noiseEl.addEventListener('input', applyNoise); }

    const say = function (text, bad) {
      if (!msg) { return; }
      msg.hidden = false;
      msg.className = 'en-import__msg' + (bad ? ' is-bad' : '');
      msg.textContent = text;
    };

    /* 选文件 */
    if (fileEl) {
      fileEl.addEventListener('change', function () {
        const f = fileEl.files[0];
        fileEl.value = '';
        if (f) { applyNoise(); self.readIntoEditor(f, say); }
      });
    }

    /* 拖文件进来 */
    const drop = App.qs('[data-drop]', body);
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) {
          e.preventDefault();
          drop.classList.remove('is-over');
        });
      });
      drop.addEventListener('drop', function (e) {
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) { applyNoise(); self.readIntoEditor(f, say); }
      });
    }

    /* 粘贴内容直接导入 */
    const go = App.qs('[data-imp-go]', body);
    if (go) {
      go.addEventListener('click', function () {
        const raw = (pasteEl.value || '').trim();
        if (!raw) { say('先把要导入的内容粘进去', true); return; }
        applyNoise();
        const res = EnParse.pairsFromTextEx(raw);
        if (!res.words.length) {
          say('没认出词条 —— 每行要能分出「英文 + 中文」两截。' +
            (res.skipped.length ? '没认出来的行：\n' + res.skipped.slice(0, 3).join('\n') : ''), true);
          return;
        }
        const words = res.words;
        self.openEditor(null, {
          id: 'm' + Date.now(), name: '粘贴导入 ' + App.today(), date: App.today(), words: words
        });
      });
    }

    /* 模板：下载一个示范文件，照着填就行 */
    const tpl = App.qs('[data-imp-tpl]', body);
    if (tpl) {
      tpl.addEventListener('click', function () { self.downloadTemplate(); });
    }

    this.bindModal(modal);
    modal.classList.add('is-open');
  },

  /* 读一个文件 → 认词条 → 进核对表。出错也写在这个框里，不靠一闪而过的提示 */
  async readIntoEditor(file, say) {
    say('正在读取「' + file.name + '」…');
    try {
      const text = await EnParse.fileToText(file);
      const res = EnParse.pairsFromTextEx(text);
      if (!res.words.length) {
        let tip = '这份文件里没认出词条（一共读到 ' + res.lines + ' 行）。';
        if (res.skipped.length) {
          tip += '没认出来的行长这样：\n' + res.skipped.slice(0, 3).join('\n');
        } else {
          tip += '如果 PDF 是扫描出来的图片版就认不出来，得是能选中文字的那种；' +
                 '也可以把内容复制出来粘到下面的框里。';
        }
        say(tip, true);
        return;
      }
      const words = res.words;
      say('认出 ' + words.length + ' 个词条（共 ' + res.lines + ' 行），核对一下就能保存');
      const mat = {
        id: 'm' + Date.now(),
        name: file.name.replace(/\.(docx|pdf|txt|md|csv)$/i, '') || file.name,
        date: App.today(),
        words: words
      };
      this.openEditor(null, mat);
    } catch (err) {
      say(err.message || '这个文件读不出来，换个格式试试（.docx / .txt 最稳）', true);
    }
  },

  downloadTemplate() {
    const sample = [
      '# 每行一条，英文在前、中文在后，中间用空格 / 制表符 / 等号 / 冒号分开都行',
      '# 井号开头的行会被忽略',
      'look forward to = 期待；盼望',
      'pay attention to = 注意；留心',
      'as time went on\t随着时间的流逝',
      'take part in  参加',
      'make progress：取得进步'
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/plain; charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '词汇导入模板.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    App.toast('模板已下载，照着填完再导入');
  },

  /* ---------- 导入一个文件（保留给以后别的地方直接调用） ---------- */
  async importFile(file) {
    /* 谁都能导 —— 管理员存的进云端给所有人练，其他人存在自己这台电脑上 */
    const self = this;
    App.toast('正在读取「' + file.name + '」…');
    try {
      const text = await EnParse.fileToText(file);
      const words = EnParse.pairsFromText(text);
      if (!words.length) {
        App.toast('没认出词条 —— 每行要能分出「英文 + 中文」两截');
        return;
      }
      const mat = {
        id: 'm' + Date.now(),
        name: file.name.replace(/\.(docx|pdf|txt|md|csv)$/i, '') || file.name,
        date: App.today(),
        words: words
      };
      App.toast('认出 ' + words.length + ' 个词条，核对一下再保存');
      self.openEditor(null, mat);
    } catch (err) {
      App.toast(err.message || '这个文件读不出来');
    }
  },

  /* ---------- 查看 / 编辑 / 删除 ---------- */
  findMat(id) {
    const all = EnStore.allMats();
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === id) { return all[i]; }
    }
    return null;
  },

  openViewer(id) {
    const m = this.findMat(id);
    if (!m) { return; }
    const modal = App.qs('#enModal');
    const body = App.qs('[data-modal-body]', modal);

    const rows = (m.words || []).map(function (w, i) {
      return '<div class="en-view-row"><i>' + (i + 1) + '</i><b>' + App.escape(w.en) + '</b><span>' + App.escape(w.zh) + '</span></div>';
    }).join('');

    body.innerHTML =
      '<div class="modal__content">' +
        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">MATERIAL</div>' +
          '<h3 class="editor-head__title">' + App.escape(m.name) + '</h3>' +
          '<p class="editor-head__sub">' + App.escape(m.date || '') + ' · 共 ' + (m.words || []).length + ' 个词条</p>' +
        '</div>' +
        '<div class="en-view-list">' + (rows || '<div class="en-empty">这份资料没有词条</div>') + '</div>' +
        '<div class="modal__foot">' +
          '<button class="btn" type="button" data-cancel>关闭</button>' +
        '</div>' +
      '</div>';

    this.bindModal(modal);
    modal.classList.add('is-open');
  },

  /* draft 不为空 = 导入后第一次核对保存；否则是编辑已有资料 */
  openEditor(id, draft) {
    const modal = App.qs('#enModal');
    const body = App.qs('[data-modal-body]', modal);
    const self = this;

    const mat = draft ? draft : this.findMat(id);
    if (!mat) {
      /* 手动新建：起一个空壳 */
      const today = App.today();
      this.state.editing = { id: null, name: '', date: today, words: [{ en: '', zh: '' }] };
    } else {
      this.state.editing = JSON.parse(JSON.stringify(mat));   /* 深拷贝，改一半取消也不伤原数据 */
    }
    if (id) { this.state.editingId = id; } else { this.state.editingId = null; }

    body.innerHTML =
      '<div class="modal__content en-editor">' +
        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">' + (draft ? 'IMPORT' : 'EDIT') + '</div>' +
          '<h3 class="editor-head__title">' + (draft ? '核对导入的词条' : (id ? '编辑学习资料' : '新建学习资料')) + '</h3>' +
          '<p class="editor-head__sub">' +
            (this.canShare() ? '你以管理员身份操作 —— 保存后存进' + (SiteAPI.isCloud() ? '云端' : '数据库') + '，所有人都能拿来练。'
              : '保存后只存在这台电脑的浏览器里（IndexedDB），不会上传；管理员导入的资料才会共享给所有人。') +
          '</p>' +
        '</div>' +
        '<div class="en-editor__meta">' +
          '<div class="field"><label for="matName">文件名称</label>' +
            '<input id="matName" type="text" placeholder="固定搭配1" value="' + App.escape(this.state.editing.name) + '"></div>' +
          '<div class="field"><label for="matDate">学习日期</label>' +
            '<input id="matDate" type="date" value="' + App.escape(this.state.editing.date || '') + '"></div>' +
        '</div>' +
        '<p class="en-editor__count">当前 <b data-edit-count>0</b> 个词条。保存前请核对中英文是否对应，可直接编辑、删除或新增。</p>' +
        '<div class="en-editor__list" data-edit-list></div>' +
        '<button class="en-link" type="button" data-edit-add>＋ 添加一条词汇</button>' +
        '<div class="modal__foot">' +
          '<button class="btn" type="button" data-cancel>取消</button>' +
          '<button class="btn btn--primary" type="button" data-ok>保存</button>' +
        '</div>' +
      '</div>';

    const renderRows = function () {
      const list = App.qs('[data-edit-list]', body);
      list.innerHTML = self.state.editing.words.map(function (w, i) {
        return '' +
          '<div class="en-edit-row" data-ei="' + i + '">' +
            '<i>' + (i + 1) + '</i>' +
            '<input type="text" placeholder="英文" value="' + App.escape(w.en) + '" data-f="en">' +
            '<input type="text" placeholder="中文释义" value="' + App.escape(w.zh) + '" data-f="zh">' +
            '<button class="icon-mini" type="button" title="删除这条" data-del>✕</button>' +
          '</div>';
      }).join('');
      const c = App.qs('[data-edit-count]', body);
      if (c) { c.textContent = self.state.editing.words.length; }

      App.qsa('.en-edit-row', list).forEach(function (row) {
        const i = Number(row.getAttribute('data-ei'));
        App.qsa('input[data-f]', row).forEach(function (inp) {
          inp.addEventListener('input', function () {
            self.state.editing.words[i][inp.getAttribute('data-f')] = inp.value;
          });
        });
        const del = App.qs('[data-del]', row);
        if (del) {
          del.addEventListener('click', function () {
            self.state.editing.words.splice(i, 1);
            renderRows();
          });
        }
      });
      list.scrollTop = list.scrollTop;   /* 保持滚动位置 */
    };
    renderRows();

    const add = App.qs('[data-edit-add]', body);
    if (add) {
      add.addEventListener('click', function () {
        self.state.editing.words.push({ en: '', zh: '' });
        renderRows();
        const rows2 = App.qsa('.en-edit-row', App.qs('[data-edit-list]', body));
        if (rows2.length) {
          const last = rows2[rows2.length - 1];
          const inp = App.qs('input[data-f="en"]', last);
          if (inp) { inp.focus(); }
        }
      });
    }

    this.bindModal(modal, function () {
      const name = (App.qs('#matName').value || '').trim();
      if (!name) { App.toast('先给资料起个名字'); return false; }
      const words = self.state.editing.words
        .map(function (w) { return { en: (w.en || '').trim(), zh: (w.zh || '').trim() }; })
        .filter(function (w) { return w.en && w.zh; });
      if (!words.length) { App.toast('至少要有一条完整的词条（英文 + 中文）'); return false; }

      const date = (App.qs('#matDate').value || '').trim() || App.today();
      const share = self.canShare();   /* 管理员 + 有后端：新资料进数据库 / 云端 */

      if (self.state.editingId) {
        const m = self.findMat(self.state.editingId);
        if (m) {
          m.name = name; m.date = date; m.words = words;
          if (m.store === 'cloud') {
            /* 共享资料：改完写回数据库 / 云端 */
            SiteAPI.saveEnMaterial(m).then(function () {
              App.toast('已保存修改（共享资料，同步到了' + (SiteAPI.isCloud() ? '云端' : '数据库') + '）');
            }).catch(function (e) { App.toast('保存失败：' + (e && e.message || '未知错误')); });
          } else {
            EnStore.saveMats();
            App.toast('已保存修改');
          }
        }
      } else if (share) {
        /* 管理员新导入 → 共享资料，进数据库 / 云端，所有人可练 */
        const mat = { id: 'm' + Date.now(), name: name, date: date, words: words, store: 'cloud' };
        EnStore.remote.unshift(mat);
        self.renderAll();
        SiteAPI.saveEnMaterial(mat).then(function () {
          App.toast('已上传「' + name + '」（' + words.length + ' 个词条，所有人共享）');
        }).catch(function (e) {
          /* 上传失败：退回本地，别让用户白导入 */
          EnStore.remote = EnStore.remote.filter(function (x) { return x.id !== mat.id; });
          mat.store = 'local';
          EnStore.materials.unshift(mat);
          EnStore.saveMats();
          self.renderAll();
          App.toast('上传失败（' + (e && e.message || '未知') + '），已改为只保存在这台电脑');
        });
      } else {
        /* 普通用户 / 未登录 → 只存自己浏览器（IndexedDB），不上传 */
        EnStore.materials.unshift({ id: 'm' + Date.now(), name: name, date: date, words: words });
        EnStore.saveMats();
        App.toast('已保存「' + name + '」（' + words.length + ' 个词条，只存在这台电脑上）');
      }
      self.renderAll();
      return true;
    });

    modal.classList.add('is-open');
  },

  deleteMaterial(id) {
    const m = this.findMat(id);
    if (!m) { return; }
    /* 共享资料只有管理员能删；本地资料谁都能删（删的是自己的） */
    if (m.store === 'cloud' && !Auth.gate()) { return; }
    const self = this;
    const modal = App.qs('#enModal');
    const body = App.qs('[data-modal-body]', modal);

    body.innerHTML =
      '<div class="modal__content">' +
        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">DELETE</div>' +
          '<h3 class="editor-head__title">删除「' + App.escape(m.name) + '」？</h3>' +
          '<p class="editor-head__sub">共 ' + (m.words || []).length + ' 个词条，' +
            (m.store === 'cloud' ? '这是共享资料，删除后所有人都没有了。'
                                  : '删除后不可恢复（除非之前导出过备份）。') + '</p>' +
        '</div>' +
        '<div class="modal__foot">' +
          '<button class="btn" type="button" data-cancel>取消</button>' +
          '<button class="btn btn--danger" type="button" data-ok>删除</button>' +
        '</div>' +
      '</div>';

    this.bindModal(modal, function () {
      if (m.store === 'cloud') {
        /* 共享资料：从数据库 / 云端删 */
        EnStore.remote = EnStore.remote.filter(function (x) { return x.id !== id; });
        SiteAPI.deleteEnMaterial(id).then(function () {
          self.renderAll();
          App.toast('已从' + (SiteAPI.isCloud() ? '云端' : '数据库') + '删除');
        }).catch(function (e) { App.toast('删除失败：' + (e && e.message || '未知错误')); });
      } else {
        EnStore.materials = EnStore.materials.filter(function (x) { return x.id !== id; });
        EnStore.saveMats();
        self.renderAll();
        App.toast('已删除');
      }
      return true;
    });
    modal.classList.add('is-open');
  },

  /* ---------- 备份 / 恢复 ----------
     备份只含「这台电脑自己的」资料和练习记录；管理员共享的资料
     在数据库 / 云端里，人人都有，不需要跟着备份走。 */
  exportBackup() {
    const payload = {
      kind: 'shuoscape-en-backup',
      exportedAt: App.today(),
      materials: EnStore.materials,
      wrong: EnStore.wrong,
      daily: EnStore.daily
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'en-backup-' + App.today() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    App.toast('备份已导出（自己导入的资料 + 练习记录），文件在下载里');
  },

  restoreBackup() {
    const self = this;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async function () {
      const f = input.files[0];
      if (!f) { return; }
      let data = null;
      try { data = JSON.parse(new TextDecoder('utf-8').decode(await f.arrayBuffer())); }
      catch (e) { App.toast('这个文件不是有效的备份'); return; }
      if (!data || data.kind !== 'shuoscape-en-backup' || !Array.isArray(data.materials)) {
        App.toast('这个文件不是本模块导出的备份'); return;
      }

      const modal = App.qs('#enModal');
      const body = App.qs('[data-modal-body]', modal);
      body.innerHTML =
        '<div class="modal__content">' +
          '<div class="editor-head">' +
            '<div class="editor-head__eyebrow">RESTORE</div>' +
            '<h3 class="editor-head__title">恢复这份备份？</h3>' +
            '<p class="editor-head__sub">' + App.escape(data.exportedAt || '') + ' 导出 · ' +
              data.materials.length + ' 份资料 · 将覆盖现在的全部资料和练习记录。</p>' +
          '</div>' +
          '<div class="modal__foot">' +
            '<button class="btn" type="button" data-cancel>取消</button>' +
            '<button class="btn btn--primary" type="button" data-ok>覆盖恢复</button>' +
          '</div>' +
        '</div>';

      self.bindModal(modal, function () {
        EnStore.materials = data.materials || [];
        EnStore.wrong = Array.isArray(data.wrong) ? data.wrong : [];
        EnStore.daily = data.daily || {};
        EnStore.saveMats();
        EnStore.saveWrong();
        EnStore.saveDaily();
        self.renderAll();
        App.toast('已恢复备份');
        return true;
      });
      modal.classList.add('is-open');
    });
    input.click();
  },

  /* ---------- 弹窗通用：取消 / 确认 / 点遮罩关 ---------- */
  bindModal(modal, onOk) {
    const self = this;
    const cancel = App.qs('[data-cancel]', modal);
    const ok = App.qs('[data-ok]', modal);
    const oldCancel = modal._onCancel;
    const oldOk = modal._onOk;

    if (oldCancel && cancel) { cancel.removeEventListener('click', oldCancel); }
    if (oldOk && ok) { ok.removeEventListener('click', oldOk); }

    modal._onCancel = function () { modal.classList.remove('is-open'); };
    if (cancel) { cancel.addEventListener('click', modal._onCancel); }

    modal._onOk = function () {
      if (onOk && onOk() === false) { return; }
      modal.classList.remove('is-open');
    };
    if (ok) { ok.addEventListener('click', modal._onOk); }

    modal.onclick = function (e) {
      if (e.target === modal) { modal.classList.remove('is-open'); }
    };
  }
};

document.addEventListener('DOMContentLoaded', function () {
  EnPage.init();
});
