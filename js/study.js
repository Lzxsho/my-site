/* ==========================================================================
   study.js —— 学习页脚本
   --------------------------------------------------------------------------
   它做的事：
     1. 顶部两块进度概览：C 语言勾了几条、英语词库现在有多少词
     2. C 语言：按组列出知识点，会一条勾一条
        真正的题库和练习在「打开练习站 →」（本站 c/ 目录，你已经做好的那套）
     3. 英语：词汇复习模块（english.html）的三个板块入口 ——
        词汇复习 / 我的错题本 / 学习资料，词条和练习记录都存在浏览器里
        （英语区原来的过渡单词卡已经下线，资料统一走导入）

   ▍进度存在哪儿
     C 语言的打卡写在浏览器的 localStorage 里（钥匙名 shuoscape_study_progress），
     不进数据库。这是有意的：知识点是「课程」，大家共用一份；
     而「我学到哪儿了」是你自己的事，跟设备走。
     英语那边（词库、错题、每日练习量）也都在浏览器里，
     钥匙名以 shuoscape_en_ 开头 —— 见 js/english.js 开头的说明。
   ========================================================================== */

const StudyPage = {

  state: {
    study: null,     /* getStudy() 拿到的内容 */
    progress: { c: {}, en: {} }
  },

  init() {
    const self = this;
    Promise.all([SiteAPI.getStudy(), SiteAPI.getStudyProgress()]).then(function (res) {
      self.state.study = res[0];
      self.state.progress = res[1];
      self.renderOverview();
      self.renderCEntries();
      self.renderC();
      self.renderEnEntries();
      self.bind();
    });
  },

  /* ---------- 存进度 ---------- */
  saveProgress() {
    SiteAPI.setStudyProgress(this.state.progress);
  },

  countDone(map) {
    return Object.keys(map || {}).filter(function (k) { return map[k]; }).length;
  },

  /* ---------- 英语词汇复习的现状（直接从浏览器里读，english.js 存的那几把钥匙） ---------- */
  enTotals() {
    let mats = [];
    let wrong = [];
    try { mats = JSON.parse(localStorage.getItem('shuoscape_en_materials') || '[]') || []; } catch (e) { mats = []; }
    try { wrong = JSON.parse(localStorage.getItem('shuoscape_en_wrong') || '[]') || []; } catch (e) { wrong = []; }

    const seen = {};
    let words = 0;
    mats.forEach(function (m) {
      (m.words || []).forEach(function (w) {
        const k = String(w && w.en || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (!k || seen[k]) { return; }
        seen[k] = 1;
        words += 1;
      });
    });
    let pending = 0;
    wrong.forEach(function (r) { if (r && !r.mastered) { pending += 1; } });
    return { words: words, pending: pending, materials: mats.length };
  },

  /* ---------- 顶部两块概览 ---------- */
  renderOverview() {
    const box = App.qs('[data-study-overview]');
    if (!box) { return; }

    const st = this.state.study;
    const doneC = this.countDone(this.state.progress.c);
    const en = this.enTotals();

    /* C 语言：勾了多少条；英语：词库多少词、多少待巩固 */
    const cRow =
      '<a class="study-stat" href="#c">' +
        '<span class="study-stat__name">C 语言</span>' +
        '<span class="study-stat__tag">知识点清单</span>' +
        '<span class="study-stat__bar"><i style="width:' +
          (st.c.total ? Math.round((doneC / st.c.total) * 100) : 0) + '%"></i></span>' +
        '<span class="study-stat__num"><b>' + doneC + '</b> / ' + st.c.total + '　' +
          (st.c.total ? Math.round((doneC / st.c.total) * 100) : 0) + '%</span>' +
      '</a>';
    const enRow =
      '<a class="study-stat" href="english.html">' +
        '<span class="study-stat__name">英语</span>' +
        '<span class="study-stat__tag">词汇复习</span>' +
        '<span class="study-stat__bar"><i style="width:' +
          (en.words ? 100 : 0) + '%"></i></span>' +
        '<span class="study-stat__num"><b>' + en.words + '</b> 词汇 · 待巩固 ' + en.pending + '</span>' +
      '</a>';

    box.innerHTML = cRow + enRow;
  },

  /* ---------- C 语言：练习站的四个入口 ----------
     这套页面是从桌面那版原样搬进 c/ 目录的（题库、试卷、知识点都在里面），
     导航条和配色由 c/css/bridge.css 套成跟主站一致。
     这里只做「门」，内容一概不复制 —— 免得两处不同步。 */
  renderCEntries() {
    const box = App.qs('[data-c-entries]');
    if (!box) { return; }

    const s = (this.state.study.c.stats) || {};
    const entries = [
      { href: 'c/index.html',       name: '学习总览', desc: '章节目录、进度和整套站的入口', num: (s.total || 0) + ' 题' },
      { href: 'c/knowledge.html',   name: '知识点讲解', desc: '按谭浩强《C程序设计》的章节整理', num: (s.chapters || 0) + ' 章' },
      { href: 'c/practice.html',    name: '章节练习', desc: '学完一章就做一章，当场对答案', num: (s.chapterQ || 0) + ' 题' },
      { href: 'c/papers-image.html', name: '真题试卷', desc: '历年整套卷子，配答案和解析', num: (s.papers || 0) + ' 套' }
    ];

    box.innerHTML = entries.map(function (e) {
      return '' +
        '<a class="study-entry" href="' + e.href + '">' +
          '<span class="study-entry__name">' + App.escape(e.name) + '<i>→</i></span>' +
          '<span class="study-entry__desc">' + App.escape(e.desc) + '</span>' +
          '<span class="study-entry__num">' + App.escape(e.num) + '</span>' +
        '</a>';
    }).join('');
  },

  /* ---------- C 语言 ---------- */
  renderC() {
    const st = this.state.study.c;
    const box = App.qs('[data-c-groups]');
    const introEl = App.qs('[data-c-intro]');
    if (!box) { return; }

    if (introEl) { introEl.textContent = st.intro; }
    this.renderCProgressOnly();   /* ① 和 ③ 两处的进度一起刷 */

    box.innerHTML = st.groups.map(function (g) {
      const items = (g.items || []).map(function (it) {
        const on = StudyPage.state.progress.c[it.id] ? ' is-done' : '';
        const checked = on ? 'checked' : '';
        return '' +
          '<label class="check-row' + on + '" data-cid="' + App.escape(it.id) + '">' +
            '<input type="checkbox"' + checked + '>' +
            '<span class="check-row__box"></span>' +
            '<span class="check-row__main">' +
              '<span class="check-row__name">' + App.escape(it.name) + '</span>' +
              '<span class="check-row__note">' + App.escape(it.note) + '</span>' +
            '</span>' +
          '</label>';
      }).join('');

      return '' +
        '<div class="card study-group">' +
          '<h3 class="study-group__title">' + App.escape(g.name) + '</h3>' +
          '<div class="study-group__items">' + items + '</div>' +
        '</div>';
    }).join('');
  },

  /* ---------- 英语：词汇复习的三个板块入口 ---------- */
  renderEnEntries() {
    const box = App.qs('[data-en-entries]');
    if (!box) { return; }

    const st = this.state.study.en;
    const introEl = App.qs('[data-en-intro]');
    if (introEl && st.intro) { introEl.textContent = st.intro; }

    const en = this.enTotals();
    const progEl = App.qs('[data-en-progress]');
    if (progEl) { progEl.textContent = en.words + ' 词汇 · ' + en.pending + ' 待巩固'; }
    /* 知识点条数同样来自 data.js 里的 noteCount（不再加载 119KB 的笔记全文） */
    const noteCount = (this.state.study.en && this.state.study.en.noteCount) || 0;

    const entries = [
      { href: 'english.html#vocab',     name: '词汇复习', desc: '挑资料、选英译汉或汉译英，练一轮记住一批', num: en.words + ' 词汇' },
      { href: 'english.html#wrong',     name: '我的错题本', desc: '答错的按方向记下，重新答对自动归入已掌握', num: en.pending + ' 待巩固' },
      { href: 'english.html#materials', name: '学习资料', desc: '导入 Word / PDF 词库，随时回顾、编辑、备份', num: en.materials + ' 份资料' },
      { href: 'english.html#notes',     name: '知识点', desc: '课堂笔记按课拆好，随时翻回来查', num: noteCount + ' 条笔记' }
    ];

    box.innerHTML = entries.map(function (e) {
      return '' +
        '<a class="study-entry" href="' + e.href + '">' +
          '<span class="study-entry__name">' + App.escape(e.name) + '<i>→</i></span>' +
          '<span class="study-entry__desc">' + App.escape(e.desc) + '</span>' +
          '<span class="study-entry__num">' + App.escape(e.num) + '</span>' +
        '</a>';
    }).join('');
  },

  /* ---------- 事件 ---------- */
  bind() {
    const self = this;

    /* C 语言：勾选 / 取消 */
    App.qsa('[data-cid]').forEach(function (row) {
      const id = row.getAttribute('data-cid');
      const input = App.qs('input', row);
      if (!input) { return; }
      input.addEventListener('change', function () {
        self.state.progress.c[id] = input.checked;
        self.saveProgress();
        row.classList.toggle('is-done', input.checked);
        self.renderOverview();
        self.renderCProgressOnly();
      });
    });
  },

  /* 只刷新那一行计数，不重渲染整块。
     进度显示在两处：① C 语言入口那一行 + ③ 知识点清单那一行。 */
  renderCProgressOnly() {
    const text = this.countDone(this.state.progress.c) + ' / ' + this.state.study.c.total + ' 已掌握';
    App.qsa('[data-c-progress], [data-c-progress2]').forEach(function (el) {
      el.textContent = text;
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  StudyPage.init();
});
