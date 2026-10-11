/* ==========================================================================
   search.js —— 站内搜索（文章 / 小诗 / 知识点 一起搜）
   --------------------------------------------------------------------------
   为什么要有这个：
     文章页原来只能按栏目筛，小诗的搜索只管小诗，知识点又只在英语页里能搜。
     想找一句话到底写在哪儿，得挨个页面点一遍。

   它做的事：一个输入框，三个数据源，结果分组显示。
     文章      → 点结果直接在这里开弹窗（复用 ArticlesPage.openModal）
     小诗      → 跳 poems.html?q=关键词，那边会自动搜出来
     知识点    → 跳 english.html#notes（笔记里的搜索在那边）

   数据从哪来：一律走 SiteAPI —— 数据库模式和本地模式都能用，
               这里不碰 localStorage、也不直接 fetch 任何接口。

   ▍怎么用
     页面上放：
       <input type="text" id="siteSearch" placeholder="搜索文章、小诗、知识点…">
       <div class="search-results" data-search-results></div>
     然后：
       SiteSearch.init();
   ========================================================================== */

const SiteSearch = {

  /* 输入框空到什么程度就不搜了 —— 一个字太容易命中一堆无关结果 */
  MIN: 1,
  DEBOUNCE: 300,      /* 停手 300ms 再查，边打字边查会卡 */
  MAX_EACH: 6,        /* 每一组最多显示几条，别把页面撑得老长 */

  init() {
    const input = App.qs('#siteSearch');
    if (!input) { return; }

    const self = this;
    let timer = null;

    input.addEventListener('input', function () {
      clearTimeout(timer);
      const kw = input.value.trim();
      if (kw.length < self.MIN) { self.clear(); return; }
      timer = setTimeout(function () { self.run(kw); }, self.DEBOUNCE);
    });

    /* 回车立刻查，不用等防抖 */
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      clearTimeout(timer);
      const kw = input.value.trim();
      if (kw.length < self.MIN) { self.clear(); return; }
      self.run(kw);
    });

    /* Esc 清空 */
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; self.clear(); }
    });

    /* 结果区用事件委托：结果随时会被重渲染，绑在容器上一次就够 */
    const box = App.qs('[data-search-results]');
    if (box) {
      box.addEventListener('click', function (e) {
        const item = e.target.closest('[data-search-item]');
        if (!item) { return; }
        self.open(item.getAttribute('data-kind'), item.getAttribute('data-id'), item.getAttribute('data-kw'));
      });
    }
  },

  /* ------------------------------------------------------------------
     清空结果区
     ------------------------------------------------------------------ */
  clear() {
    const box = App.qs('[data-search-results]');
    if (box) { box.innerHTML = ''; box.hidden = true; }
  },

  /* ------------------------------------------------------------------
     跑到三个数据源里挨个找
     Promise.all 的好处：三件事同时跑，不用等一个完再查下一个
     ------------------------------------------------------------------ */
  run(kw) {
    const self = this;
    const q = String(kw).toLowerCase();

    this.loadNotes().then(function () {
      return Promise.all([
        self.findArticles(q),
        self.findPoems(q),
        Promise.resolve(self.findNotes(q))
      ]);
    }).then(function (res) {
      self.render(kw, res[0], res[1], res[2]);
    }).catch(function (e) {
      if (typeof console !== 'undefined') { console.warn('[search]', e && e.message); }
      const box = App.qs('[data-search-results]');
      if (box) {
        box.hidden = false;
        box.innerHTML = '<p class="search-empty">搜索出了点岔子，换个词再试试。</p>';
      }
    });
  },

  /* ---------- 文章：标题 / 摘要 / 正文 / 标签 / 系列 ---------- */
  findArticles(q) {
    return SiteAPI.getArticles({}).then(function (list) {
      return (list || []).filter(function (a) {
        const hay = [
          a.title, a.excerpt, a.series, (a.tags || []).join(' '),
          (a.content || []).join(' ')
        ].join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
      }).slice(0, SiteSearch.MAX_EACH);
    }).catch(function () { return []; });
  },

  /* ---------- 小诗：标题 / 正文 ---------- */
  findPoems(q) {
    return SiteAPI.getPoems().then(function (list) {
      return (list || []).filter(function (p) {
        const hay = (String(p.title || '') + ' ' + String(p.text || '')).toLowerCase();
        return hay.indexOf(q) >= 0;
      }).slice(0, SiteSearch.MAX_EACH);
    }).catch(function () { return []; });
  },

  /* ---------- 知识点：笔记是静态文件，读 window.NOTES_DATA ----------
     这个文件只在英语页加载，所以这里得容得住「没加载」的情况：
     没有就返回空数组 —— 不是错误，只是这一组不显示。 */
  /* ---------- 知识点 ----------
     笔记全文在 js/notes-data.js（119KB），没在文章页预先加载 ——
     为了一个「可能用不到」的搜索去拖慢整页不划算。
     所以这里「用到才拉」：第一次搜索时把那个文件插进来，之后就一直在了。 */
  loadNotes() {
    if (window.NOTES_DATA) { return Promise.resolve(true); }
    if (this._notesTask) { return this._notesTask; }

    this._notesTask = new Promise(function (resolve) {
      const s = document.createElement('script');
      s.src = 'js/notes-data.js';
      s.onload = function () { resolve(true); };
      /* 加载失败也要 resolve —— 搜索照常进行，只是「知识点」这组不出现 */
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
    return this._notesTask;
  },

  findNotes(q) {
    const groups = (window.NOTES_DATA || {}).groups || [];
    const out = [];
    groups.forEach(function (g) {
      (g.items || []).forEach(function (it) {
        const hay = (String(it.title || '') + ' ' + String(it.name || '') + ' ' +
                     String(it.body || it.content || '')).toLowerCase();
        if (hay.indexOf(q) >= 0) {
          out.push({
            id: String(it.id || out.length),
            title: it.title || it.name || '知识点',
            group: g.title || '',
            snippets: SiteSearch.snippet(hay, q)
          });
        }
      });
    });
    return out.slice(0, SiteSearch.MAX_EACH);
  },

  /* 把命中关键词前后的那一小截抠出来，让人一眼看出「为什么这条被搜到了」 */
  snippet(hay, q) {
    const at = hay.indexOf(q);
    if (at < 0) { return ''; }
    const start = Math.max(0, at - 24);
    let text = hay.slice(start, at + q.length + 40).replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + text + '…';
  },

  /* 高亮：先把 HTML 转义掉再插标签，防的是「搜索框里输入 <script>」这种事 */
  mark(text, q) {
    const safe = App.escape(String(text || ''));
    const kw = App.escape(String(q || ''));
    if (!kw) { return safe; }
    /* 大小写都替一遍，写法参考 App.escape：一律先转义再处理 */
    return safe.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      function (m) { return '<mark>' + m + '</mark>'; });
  },

  /* ------------------------------------------------------------------
     渲染结果：三组，各自一个小标题
     ------------------------------------------------------------------ */
  render(kw, articles, poems, notes) {
    const box = App.qs('[data-search-results]');
    if (!box) { return; }

    const self = this;
    const total = articles.length + poems.length + notes.length;

    if (!total) {
      box.hidden = false;
      box.innerHTML =
        '<div class="search-empty">' +
          '<span class="search-empty__icon">☁</span>' +
          '<p>没找到「' + App.escape(kw) + '」。<br>' +
            '换个说法试试 —— 比如只搜一个词：雨、晚自习、指针。</p>' +
        '</div>';
      return;
    }

    const group = function (title, icon, items) {
      if (!items.length) { return ''; }
      return '' +
        '<div class="search-group">' +
          '<h4 class="search-group__title">' + icon + ' ' + title +
            '<i>' + items.length + ' 条</i></h4>' +
          '<ul class="search-list">' + items.join('') + '</ul>' +
        '</div>';
    };

    const aHtml = articles.map(function (a) {
      const where = (a.content || []).join(' ');
      const hit = where.toLowerCase().indexOf(String(kw).toLowerCase()) >= 0
        ? self.snippet(where.toLowerCase(), String(kw).toLowerCase())
        : App.escape(a.excerpt || '');
      return '' +
        '<li><button class="search-item" type="button" ' +
          'data-search-item data-kind="article" data-id="' + App.escape(a.id) + '" ' +
          'data-kw="' + App.escape(kw) + '">' +
          '<span class="search-item__title">' + self.mark(a.title, kw) + '</span>' +
          '<span class="search-item__meta">' + App.escape(DataTools.columnLabel(a.category)) +
            ' · ' + App.escape(a.date) + '</span>' +
          '<span class="search-item__text">' + App.escape(hit) + '</span>' +
        '</button></li>';
    });

    const pHtml = poems.map(function (p) {
      return '' +
        '<li><button class="search-item" type="button" ' +
          'data-search-item data-kind="poem" data-id="' + App.escape(p.id) + '" ' +
          'data-kw="' + App.escape(kw) + '">' +
          '<span class="search-item__title">' + self.mark(p.title, kw) + '</span>' +
          '<span class="search-item__meta">' + App.escape(p.date) + '</span>' +
          '<span class="search-item__text">' +
            self.mark(String(p.text || '').replace(/\n/g, ' ').slice(0, 70), kw) +
          '</span>' +
        '</button></li>';
    });

    const nHtml = notes.map(function (n) {
      return '' +
        '<li><button class="search-item" type="button" ' +
          'data-search-item data-kind="note" data-id="' + App.escape(n.id) + '" ' +
          'data-kw="' + App.escape(kw) + '">' +
          '<span class="search-item__title">' + self.mark(n.title, kw) + '</span>' +
          '<span class="search-item__meta">' + App.escape(n.group) + '</span>' +
          '<span class="search-item__text">' + App.escape(n.snippets) + '</span>' +
        '</button></li>';
    });

    box.hidden = false;
    box.innerHTML =
      '<div class="search-head">搜到 <b>' + total + '</b> 条和「' + App.escape(kw) + '」有关的内容</div>' +
      group('文章', '✎', aHtml) +
      group('小诗', '❝', pHtml) +
      group('知识点', '📘', nHtml);
  },

  /* ------------------------------------------------------------------
     点一条结果之后去哪
     ------------------------------------------------------------------ */
  open(kind, id, kw) {
    if (kind === 'article') {
      /* 文章页本来就在这儿，直接开弹窗最顺手 */
      if (typeof ArticlesPage !== 'undefined' && ArticlesPage.openModal) {
        ArticlesPage.openModal(id);
        return;
      }
      window.location.href = 'articles.html?id=' + encodeURIComponent(id);
      return;
    }
    if (kind === 'poem') {
      /* 跳过去的时候把关键词带上，小诗页那边会自己搜出来 */
      window.location.href = 'poems.html?q=' + encodeURIComponent(kw || '');
      return;
    }
    /* 知识点：英语页的搜索框等着接手 */
    window.location.href = 'english.html?note=' + encodeURIComponent(kw || '');
  }
};

window.SiteSearch = SiteSearch;

document.addEventListener('DOMContentLoaded', function () {
  SiteSearch.init();
});
