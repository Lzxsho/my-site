/* ==========================================================================
   articles.js —— 文章页脚本
   --------------------------------------------------------------------------
   它做的事：
     1. 渲染分类标签（全部 / 随笔 / 小说 / 记录 / 笔记）
     2. 按分类 + 关键词筛选文章
     3. 渲染文章卡片网格（封面可以是照片，也可以是渐变色）
     4. 点卡片打开详情弹窗（也可以从地址栏 ?id=xxx 直接打开）
     5. 在界面里「写文章 / 编辑 / 删除」
        · 跑了 server.js（数据库模式）→ 写进 db/site.db，换浏览器也还在
        · 直接双击打开（本地模式）  → 改动记在浏览器里
        两种模式都不用改代码，页面上完全一样。
     6. 「随机生成」按钮：拼一篇草稿，改完就能保存
     7. 渲染右侧归档与标签云

   ▍想改文章内容，有三条路：
     · 用本页右上角的「✎ 写文章」，或点开文章后的「编辑」   ← 最省事
     · 用 VS Code 打开 db/site.db，直接在表里改
     · 改 js/data.js 里的初始内容，再用 node db/seed.js --reset 重新导一遍
   ========================================================================== */

const ArticlesPage = {

  /* 当前状态，整页共用这一份 */
  state: {
    category: '全部',
    keyword: '',
    list: [],
    /* 弹窗现在在干嘛：'view' 读文章 / 'edit' 编辑中 */
    mode: 'view',
    /* 正在编辑的文章 id（新建时是 null） */
    editingId: null,
    /* 正在编辑的封面：可能是照片路径、dataURL（本地选的图），也可能是渐变 */
    editingCover: ''
  },

  init() {
    this.bindSearch();
    this.bindRandom();
    this.bindNew();
    this.bindModal();
    this.renderMarks();
    this.renderColumns();
    this.load();
  },

  /* ---------- 读数据 & 渲染 ---------- */
  load() {
    const self = this;
    SiteAPI.getArticles({
      category: this.state.category,
      keyword: this.state.keyword
    }).then(function (list) {
      self.state.list = list;
      self.renderGrid(list);
      self.renderTabs();
    });
  },

  /* 重新拉全部数据（不筛选），用来算每个分类有多少篇 */
  loadAll() {
    return SiteAPI.getArticles({});
  },

  /* 内容有改动之后统一刷新：列表 + 分类计数 + 归档 + 标签云 + 工具栏小按钮 */
  refresh() {
    this.load();
    Archive.init();
    this.renderMarks();
  },

  /* ---------- 1. 分类标签 ---------- */
  renderTabs() {
    const box = App.qs('[data-filter-tabs]');
    if (!box) { return; }

    this.loadAll().then(function (all) {
      SiteAPI.getCategories().then(function (cats) {
        /* 一个字都没写的栏目不占筛选栏的位置 —— 否则一排全是 0，
           真正能点进去的那几个反而被淹了。空的那些在下面「栏目总览」里看。 */
        const usable = cats.filter(function (cat) {
          if (cat === '全部') { return true; }
          return all.some(function (a) { return a.category === cat; });
        });

        box.innerHTML = usable.map(function (cat) {
          const count = cat === '全部'
            ? all.length
            : all.filter(function (a) { return a.category === cat; }).length;
          const active = cat === ArticlesPage.state.category ? ' is-active' : '';
          /* 按钮上显示雅称（「随笔」→「短句手记」），
             没登记过的分类（「小说」）显示原名，不会变成空白 */
          return '<button class="filter-tab' + active + '" data-cat="' + App.escape(cat) + '"' +
                   ' title="' + App.escape(DataTools.columnLabel(cat)) + '">' +
                   App.escape(DataTools.columnName(cat)) +
                   '<span class="filter-tab__count">' + count + '</span>' +
                 '</button>';
        }).join('');

        /* 绑定点击切换分类 */
        App.qsa('.filter-tab', box).forEach(function (btn) {
          btn.addEventListener('click', function () {
            ArticlesPage.state.category = btn.getAttribute('data-cat');
            ArticlesPage.load();
          });
        });
      });
    });
  },

  /* ---------- 1.5 栏目总览 ----------
     把 data.js 里 columns 那张表整个摊开：
       有内容的 → 显示篇数，点了就筛出这个栏目
       是独立页面的（小诗 / 音乐）→ 点了直接跳过去
       还没动笔的 → 显示「暂未开笔」，照样占位，
                    这样以后想写什么，抬头就知道往哪儿写。 */
  renderColumns() {
    const box = App.qs('[data-columns]');
    if (!box) { return; }

    Promise.all([
      this.loadAll(), SiteAPI.getColumns(), SiteAPI.getPoems(), SiteAPI.getMusic()
    ]).then(function (res) {
      const all = res[0];
      const columns = res[1];
      const poems = res[2];
      const music = res[3];

      box.innerHTML = columns.map(function (c) {
        let count = 0;
        let hint = '暂未开笔';
        let attrs = '';

        if (c.cat) {
          count = all.filter(function (a) { return a.category === c.cat; }).length;
          hint = count ? (count + ' 篇') : '暂未开笔';
          attrs = ' data-cat="' + App.escape(c.cat) + '"';
        } else if (c.page) {
          const isPoem = c.page.indexOf('poems') >= 0;
          count = isPoem ? poems.length : music.length;
          hint = count ? (count + (isPoem ? ' 首小诗' : ' 首曲子')) : '还没填';
          attrs = ' data-page="' + App.escape(c.page) + '"';
        }

        const empty = (!count) ? ' is-empty' : '';
        return '<button class="column-card' + empty + '" type="button"' + attrs +
                 ' title="' + App.escape(c.desc) + '">' +
                 '<span class="column-card__name">' + App.escape(c.name) + '</span>' +
                 '<span class="column-card__tag">' + App.escape(c.tag) + '</span>' +
                 '<span class="column-card__count">' + App.escape(hint) + '</span>' +
                 '<span class="column-card__desc">' + App.escape(c.desc) + '</span>' +
               '</button>';
      }).join('');

      App.qsa('.column-card', box).forEach(function (btn) {
        btn.addEventListener('click', function () {
          const page = btn.getAttribute('data-page');
          if (page) { window.location.href = page; return; }

          const cat = btn.getAttribute('data-cat');
          if (!cat) { return; }
          ArticlesPage.state.category = cat;
          ArticlesPage.load();
          const grid = App.qs('[data-article-grid]');
          if (grid && grid.scrollIntoView) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    });
  },

  /* 工具栏上的「恢复默认」：只有真的改过东西时才出现 */
  renderMarks() {
    const btn = App.qs('#resetArticlesBtn');
    if (!btn) { return; }

    SiteAPI.getArticleMarks().then(function (marks) {
      const total = marks.hidden + marks.edited;
      if (total > 0) {
        btn.hidden = false;
        btn.textContent = '↺ 恢复默认（' + total + ' 处改动）';
      } else {
        btn.hidden = true;
      }
    });
  },

  /* ---------- 2. 搜索 ---------- */
  bindSearch() {
    const input = App.qs('#articleSearch');
    if (!input) { return; }

    /* 简单防抖：停手 260ms 后才真正搜索 */
    let timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        ArticlesPage.state.keyword = input.value.trim();
        ArticlesPage.load();
      }, 260);
    });
  },

  /* ---------- 3. 文章网格 ---------- */
  renderGrid(list) {
    const grid = App.qs('[data-article-grid]');
    if (!grid) { return; }

    if (!list.length) {
      grid.innerHTML =
        '<div class="empty">' +
          '<div class="empty__icon">☁</div>' +
          '这里还没有内容，换个分类或关键词试试～' +
        '</div>';
      return;
    }

    grid.innerHTML = list.map(function (a) {
      const tags = (a.tags || []).map(function (t) {
        return '<span class="tag tag--blue">' + App.escape(t) + '</span>';
      }).join('');

      /* 状态小标签：随机草稿 / 我写的 / 改过的 */
      let marks = '';
      if (a.draft)  { marks += '<span class="tag tag--mint">草稿</span>'; }
      if (a.mine)   { marks += '<span class="tag tag--mint">我写的</span>'; }
      if (a.edited) { marks += '<span class="tag tag--gray">已改</span>'; }

      return '' +
        '<article class="card article-card" data-id="' + a.id + '">' +
          '<div class="article-card__media">' +
            /* 卡片角标显示「雅称 · 简称」，看一眼就知道这篇归在哪个栏目 */
            '<span class="tag article-card__cat">' + App.escape(DataTools.columnLabel(a.category)) + '</span>' +
            /* 封面：有照片就显示照片，没有就显示渐变 */
            App.coverHtml(a.cover, 'cover', a.title) +
          '</div>' +
          '<div class="article-card__body">' +
            '<h3 class="article-card__title">' + App.escape(a.title) + marks + '</h3>' +
            '<p class="article-card__desc">' + App.escape(a.excerpt) + '</p>' +
            '<div class="article-card__tags">' + tags + '</div>' +
            '<div class="article-card__foot">' +
              '<span>' + App.formatDate(a.date) + '</span>' +
              '<span>' + a.words + ' 字 · 阅读 →</span>' +
            '</div>' +
          '</div>' +
        '</article>';
    }).join('');

    /* 每张卡片都能点开详情 */
    App.qsa('.article-card', grid).forEach(function (card) {
      card.addEventListener('click', function () {
        ArticlesPage.openModal(card.getAttribute('data-id'));
      });
      Reveal.watch(card);
    });
  },

  /* ---------- 4. 详情弹窗 ----------
     这里用「事件委托」：监听挂在弹窗外层 #articleModal 上，
     按钮是哪个就认 data-* 记号。弹窗里的按钮都是打开时才生成的，
     这样就不用每次重渲染后再补绑一次，也不会出现
     「按钮换了、事件还留在旧节点上」的情况。 */
  bindModal() {
    const modal = App.qs('#articleModal');
    if (!modal) { return; }

    /* 记一下打开弹窗前焦点在哪，关闭时还回去 */
    this._lastFocus = null;

    modal.addEventListener('click', function (e) {
      /* 关：右上角 ✕、底部「关闭」，编辑态也走这里 */
      if (e.target.closest('[data-close]')) { ArticlesPage.tryClose(); return; }

      /* 打开编辑 */
      const editBtn = e.target.closest('[data-edit]');
      if (editBtn) { ArticlesPage.openEditor(editBtn.getAttribute('data-edit')); return; }

      /* 编辑里点「取消」：回到阅读态 */
      const backBtn = e.target.closest('[data-back]');
      if (backBtn) {
        const id = ArticlesPage.state.editingId;
        ArticlesPage.state.editingCover = '';
        if (id) { ArticlesPage.openModal(id); } else { ArticlesPage.closeModal(); }
        return;
      }

      /* 删除 */
      const delBtn = e.target.closest('[data-del]');
      if (delBtn) { ArticlesPage.removeArticle(delBtn.getAttribute('data-del')); return; }

      /* 保存 */
      if (e.target.closest('[data-save]')) { ArticlesPage.saveEditor(); return; }

      /* 从电脑里选一张封面照片 */
      if (e.target.closest('[data-cover-pick]')) {
        const file = App.qs('[data-cover-file]', modal);
        if (file) { file.click(); }
        return;
      }
      /* 不要照片了 */
      if (e.target.closest('[data-cover-clear]')) { ArticlesPage.setCover(''); return; }

      /* 点弹窗外的遮罩也关掉 */
      if (e.target === modal) { ArticlesPage.tryClose(); }
    });

    /* 选好一张本地图片 → 压小 → 当成封面 */
    modal.addEventListener('change', function (e) {
      const input = e.target.closest('[data-cover-file]');
      if (!input || !input.files || !input.files[0]) { return; }
      ArticlesPage.pickCover(input.files[0]);
    });

    /* 手动填封面路径时，左边的预览实时跟着变（fromInput=true 保护输入框内容） */
    modal.addEventListener('input', function (e) {
      const box = e.target.closest('[data-cover-input]');
      if (box) { ArticlesPage.setCover(box.value, true); }
    });

    /* 按 ESC 关闭（只在弹窗真的开着时响应） */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !modal.classList.contains('is-open')) { return; }
      ArticlesPage.tryClose();
    });
  },

  /* 关闭弹窗的统一入口：正在编辑就先问一句，别把刚写的东西弄丢 */
  tryClose() {
    if (this.state.mode === 'edit') {
      if (!window.confirm('你还在编辑里，关掉的话刚写的就没了。确定要关吗？')) { return; }
      this.state.editingCover = '';
    }
    this.closeModal();
  },

  /* 弹窗右上角的 ✕（阅读态和编辑态都要有） */
  injectClose(modal) {
    App.qs('[data-modal-body]', modal).insertAdjacentHTML('afterbegin',
      '<button class="modal__close" type="button" data-close ' +
              'title="关闭（Esc）" aria-label="关闭">✕</button>');
  },

  /* 打开弹窗：加动画、锁滚动、把焦点移进去 */
  showModal(modal) {
    this._lastFocus = document.activeElement;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    /* 焦点给弹窗容器本身，而不是右上角的 ✕。
       容器是 tabindex="-1"，程序聚焦不会画出那个焦点光圈，
       但键盘用户按 Tab 能顺着往下走到各个按钮，Esc 也照常能用。 */
    const box = App.qs('.modal__box', modal);
    if (box && box.focus) { box.focus(); }

    /* 焦点圈定：Tab 在弹窗里循环，别跑到后面被锁住的页面上。
       （不这么做的话，键盘用户按着 Tab 会一路走到看不见的页面元素里，找不回来） */
    if (!modal.dataset.trapBound) {
      modal.dataset.trapBound = '1';
      modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') { return; }
        const focusable = App.qsa(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
          modal
        ).filter(function (el) { return el.offsetParent !== null; });
        if (!focusable.length) { return; }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      });
    }
  },

  /* ---------- 4.1 阅读态 ---------- */
  openModal(id) {
    const modal = App.qs('#articleModal');
    if (!modal) { return; }

    const self = this;
    SiteAPI.getArticle(id).then(function (a) {
      if (!a) { return; }

      self.state.mode = 'view';
      self.state.editingId = null;
      self.state.editingCover = '';

      const body = a.content && a.content.length
        ? a.content.map(function (p) { return '<p>' + App.escape(p) + '</p>'; }).join('')
        : '<p>' + App.escape(a.excerpt) + '</p>';

      /* 底部那排小标记：我写的 / 改过的 */
      let marks = '';
      if (a.mine)   { marks = '<span class="tag tag--mint">我写的</span>'; }
      if (a.edited) { marks += '<span class="tag tag--gray">已修改</span>'; }

      App.qs('[data-modal-body]', modal).innerHTML =
        App.coverHtml(a.cover, 'cover modal__cover', a.title) +
        '<div class="modal__content">' +
          '<div class="meta">' +
            '<span class="tag tag--pink">' + App.escape(DataTools.columnLabel(a.category)) + '</span>' +
            '<span>' + App.formatDate(a.date) + '</span>' +
            '<span class="meta__dot"></span>' +
            '<span>' + a.words + ' 字</span>' +
            marks +
          '</div>' +
          '<h2 class="modal__title">' + App.escape(a.title) + '</h2>' +
          '<div class="article-card__tags">' +
            (a.tags || []).map(function (t) {
              return '<span class="tag tag--blue">' + App.escape(t) + '</span>';
            }).join('') +
          '</div>' +
          '<div class="modal__body">' + body + '</div>' +
          /* 留言区：谁都能看、谁都能写，内容由 js/comments.js 填 */
          '<div class="comments-box" data-comments="article-' + App.escape(a.id) + '"></div>' +
          '<div class="modal__foot">' +
            /* data-admin-only：游客身份时这两个按钮会被 CSS 收起来（见 base.css） */
            '<button class="btn btn--sm" type="button" data-admin-only data-edit="' + App.escape(a.id) + '">✎ 编辑这篇</button>' +
            '<button class="btn btn--sm btn--danger" type="button" data-admin-only data-del="' + App.escape(a.id) + '">删除</button>' +
            '<button class="btn btn--sm btn--ghost" type="button" data-close>关闭</button>' +
          '</div>' +
        '</div>';

      self.injectClose(modal);
      self.showModal(modal);

      /* 弹窗渲染好了，再把里面的留言区挂上（要等盒子真的进 DOM 才行） */
      if (window.Comments) { Comments.mountAll(modal); }

      /* 更新地址栏，方便把链接分享出去 */
      if (window.history.replaceState) {
        window.history.replaceState(null, '', 'articles.html?id=' + a.id);
      }
    });
  },

  /* ---------- 4.2 编辑态 ---------- */
  openEditor(id) {
    if (!window.Auth || !Auth.gate()) { return; }
    const modal = App.qs('#articleModal');
    if (!modal) { return; }

    const self = this;

    /* 新建：直接给一份空白表单 */
    if (!id) {
      self.state.mode = 'edit';
      self.state.editingId = null;
      self.state.editingCover = '';
      App.qs('[data-modal-body]', modal).innerHTML = self.editorHtml({
        title: '',
        category: self.state.category === '全部' ? '随笔' : self.state.category,
        date: App.today(),
        tags: [],
        series: '',
        cover: '',
        excerpt: '',
        content: []
      }, true);
      self.injectClose(modal);
      self.setCover('');
      self.showModal(modal);
      const t = App.qs('#fTitle');
      if (t) { t.focus(); }
      return;
    }

    /* 编辑已有的：先把内容读出来填进表单 */
    SiteAPI.getArticle(id).then(function (a) {
      if (!a) { return; }

      self.state.mode = 'edit';
      self.state.editingId = a.id;
      self.state.editingCover = a.cover || '';

      App.qs('[data-modal-body]', modal).innerHTML = self.editorHtml(a, false);
      self.injectClose(modal);
      self.setCover(a.cover || '');   /* 顺便把封面预览渲染出来 */
      self.showModal(modal);
    });
  },

  /* 编辑表单的 HTML */
  editorHtml(a, isNew) {
    /* 分类清单从 data.js 的 categories 来（去掉「全部」），
       下拉里显示雅称，存进数据库的还是分类值。 */
    const cats = (window.SITE_DATA.categories || []).filter(function (c) { return c !== '全部'; });
    const catOptions = cats.map(function (c) {
      return '<option value="' + App.escape(c) + '"' + (c === a.category ? ' selected' : '') + '>' +
               App.escape(DataTools.columnLabel(c)) + '</option>';
    }).join('');

    return '' +
      '<div class="modal__content">' +
        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">EDITOR</div>' +
          '<h2 class="editor-head__title">' + (isNew ? '写一篇新文章' : '编辑文章') + '</h2>' +
        '</div>' +

        '<div class="form-grid">' +
          '<div class="field field--full">' +
            '<label for="fTitle">标题</label>' +
            '<input id="fTitle" type="text" placeholder="给这篇文章起个名字" value="' + App.escape(a.title) + '">' +
          '</div>' +

          '<div class="field">' +
            '<label for="fCategory">分类</label>' +
            '<select id="fCategory">' + catOptions + '</select>' +
          '</div>' +

          '<div class="field">' +
            '<label for="fDate">日期</label>' +
            '<input id="fDate" type="date" value="' + App.escape(a.date) + '">' +
          '</div>' +

          '<div class="field">' +
            '<label for="fSeries">系列（可不填）</label>' +
            '<input id="fSeries" type="text" placeholder="比如：世界尽头系列" value="' + App.escape(a.series || '') + '">' +
          '</div>' +

          '<div class="field">' +
            '<label for="fTags">标签（用逗号隔开）</label>' +
            '<input id="fTags" type="text" placeholder="随笔, 日常, 夜" value="' + App.escape((a.tags || []).join(', ')) + '">' +
          '</div>' +

          '<div class="field field--full">' +
            '<label for="fExcerpt">摘要（文章列表里卡片上那句话）</label>' +
            '<input id="fExcerpt" type="text" placeholder="一句话概括，不填就自动取正文第一句" value="' + App.escape(a.excerpt || '') + '">' +
          '</div>' +

          /* ---------- 封面照片 ---------- */
          '<div class="field field--full">' +
            '<label>封面照片（显示在文章最上面）</label>' +
            '<div class="cover-picker">' +
              '<div class="cover-picker__preview" data-cover-preview></div>' +
              '<div class="cover-picker__inputs">' +
                '<div class="cover-picker__row">' +
                  '<button class="btn btn--sm" type="button" data-cover-pick>🖼 从电脑选一张</button>' +
                  '<button class="btn btn--sm btn--ghost" type="button" data-cover-clear>不放照片</button>' +
                '</div>' +
                '<input type="file" accept="image/*" data-cover-file hidden>' +
                '<input type="text" data-cover-input placeholder="也可以直接填路径，比如 assets/covers/xxx.jpg" value="' +
                  App.escape(App.isImageUrl(a.cover) ? a.cover : '') + '">' +
                '<p class="field__tip">' +
                  '选好的照片会<b>自动压小</b>再保存，不用手动改代码。<br>' +
                  (SiteAPI.isDb()
                    ? '照片会跟文章一起存进数据库，换浏览器也还在。' +
                      '如果这张图以后要用在很多地方，放进 <code>assets/covers/</code> 再填路径会更省空间。'
                    : '现在没连数据库，照片存在浏览器里（换电脑就没了）。' +
                      '想长期保存就把照片放进 <code>assets/covers/</code>，再把路径填到上面这栏。') +
                '</p>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="field field--full">' +
            '<label for="fContent">正文</label>' +
            '<textarea id="fContent" rows="14" placeholder="正文写在这里。&#10;中间空一行，就是新的一段。">' +
              App.escape((a.content || []).join('\n\n')) +
            '</textarea>' +
            '<p class="field__tip">中间<b>空一行</b>就是新的一段，不用手动敲空格。</p>' +
          '</div>' +
        '</div>' +

        '<div class="form-foot">' +
          '<div class="form-foot__left">' +
            (isNew ? '' :
              '<button class="btn btn--sm btn--danger" type="button" data-del="' + App.escape(a.id) + '">删除这篇</button>') +
          '</div>' +
          '<div class="form-foot__right">' +
            '<button class="btn btn--sm btn--ghost" type="button" data-back>取消</button>' +
            '<button class="btn btn--sm btn--primary" type="button" data-save>保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  /* ---------- 4.3 封面 ---------- */
  /* 更新「当前编辑中的封面」，并把预览刷出来。
     fromInput = true 表示这次变化来自「手动填路径」那个输入框，
     这时候绝对不要去改输入框本身 —— 否则用户每敲一个字，
     路径还没成形、被判成「不是图片」，输入框就会被清空。 */
  setCover(value, fromInput) {
    this.state.editingCover = value || '';

    const box = App.qs('[data-cover-preview]');
    if (!box) { return; }
    const input = App.qs('[data-cover-input]');

    box.style.background = '';
    const cover = String(this.state.editingCover).trim();

    if (App.isImageUrl(cover)) {
      box.innerHTML = '<img src="' + App.escape(cover) + '" alt="封面预览">';
      /* 从电脑选来的图是一长串 data:...，没有「路径」可填，把输入框清掉；
         手填路径时就把用户写的留着 */
      if (input && !fromInput && /^data:/i.test(cover)) { input.value = ''; }
    } else if (cover) {
      /* 渐变只用来预览，不往「填路径」的框里塞，免得和那一栏的用途打架 */
      box.innerHTML = '';
      box.style.background = cover;
    } else {
      box.innerHTML = '<span class="cover-picker__empty">还没有照片<br>留空就用渐变</span>';
    }
  },

  /* 用户从电脑里挑了一张图：压小它，再当成封面 */
  pickCover(file) {
    const self = this;
    App.toast('正在处理这张照片…');
    App.readImageFile(file, 1400).then(function (dataUrl) {
      self.setCover(dataUrl);
      App.toast('照片已就绪，记得点「保存」');
    }).catch(function (err) {
      App.toast((err && err.message) || '这张照片处理失败了');
    });
  },

  /* ---------- 4.4 保存 / 删除 ---------- */
  /* 把表单里的值收成一个对象 */
  collectForm() {
    const val = function (sel) {
      const node = App.qs(sel);
      return node ? node.value.trim() : '';
    };
    const contentNode = App.qs('#fContent');

    return {
      title: val('#fTitle'),
      category: val('#fCategory') || '随笔',
      date: val('#fDate') || App.today(),
      series: val('#fSeries'),
      tags: val('#fTags'),
      excerpt: val('#fExcerpt'),
      cover: this.state.editingCover,
      /* 正文原样交给数据处理层，它会按「空行」切段，
         所以这里不用手动拆，用户怎么写就怎么存 */
      content: contentNode ? contentNode.value : ''
    };
  },

  saveEditor() {
    if (!window.Auth || !Auth.gate()) { return; }
    const self = this;
    const data = this.collectForm();

    if (!data.title) {
      App.toast('还没写标题呢');
      const t = App.qs('#fTitle');
      if (t) { t.focus(); }
      return;
    }

    const id = this.state.editingId;

    const done = function (saved) {
      if (!saved) {
        App.toast('保存失败，可能是照片太大浏览器存不下了');
        return;
      }
      self.state.mode = 'view';
      self.state.editingCover = '';
      self.refresh();
      self.openModal(saved.id);       /* 保存完直接看成品 */
      App.toast(id ? '已保存' : '已经写好一篇了');
    };

    if (id) {
      SiteAPI.updateArticle(id, data)
        .then(function () { return SiteAPI.getArticle(id); })
        .then(done);
    } else {
      SiteAPI.addArticle(data).then(done);
    }
  },

  removeArticle(id) {
    if (!window.Auth || !Auth.gate()) { return; }
    if (!id) { return; }
    const msg = SiteAPI.isDb()
      ? '确定要删掉这篇吗？\n数据库里删掉就真的没有了。'
      : '确定要删掉这篇吗？\n（写在 js/data.js 里的文章只是先隐藏，点工具栏的「恢复默认」就能回来）';
    if (!window.confirm(msg)) {
      return;
    }
    const self = this;
    SiteAPI.removeArticle(id).then(function () {
      self.state.editingCover = '';
      self.refresh();
      self.closeModal();
      App.toast(SiteAPI.isDb() ? '已删除' : '已删除，想反悔就点工具栏的「恢复默认」');
    });
  },

  /* ---------- 5. 关闭弹窗 ---------- */
  closeModal() {
    const modal = App.qs('#articleModal');
    if (!modal) { return; }
    /* 没开着就别折腾，避免重复调用把滚动条也一起解锁 */
    if (!modal.classList.contains('is-open')) { return; }

    modal.classList.remove('is-open');
    this.state.mode = 'view';

    /* 延时解锁滚动：等淡出动画走完，页面不会突然跳一下 */
    setTimeout(function () {
      if (!modal.classList.contains('is-open')) {
        document.body.style.overflow = '';
      }
    }, 300);

    /* 焦点还给当初点开它的那张卡片，键盘浏览不会「跟丢」 */
    if (this._lastFocus && this._lastFocus.focus) {
      this._lastFocus.focus();
    }
    this._lastFocus = null;

    if (window.history.replaceState) {
      window.history.replaceState(null, '', 'articles.html');
    }
  },

  /* ---------- 6. 写新文章 / 随机草稿 / 恢复默认 ---------- */
  bindNew() {
    const btn = App.qs('#newArticleBtn');
    if (btn) {
      btn.addEventListener('click', function () { ArticlesPage.openEditor(null); });
    }

    const reset = App.qs('#resetArticlesBtn');
    if (reset) {
      reset.addEventListener('click', function () {
        if (!window.confirm('会清掉你在这里改过和删过的所有文章，回到 js/data.js 里的原始内容。确定吗？')) {
          return;
        }
        SiteAPI.restoreArticles().then(function () {
          ArticlesPage.refresh();
          App.toast('已恢复成 data.js 里的原始内容');
        });
      });
    }
  },

  bindRandom() {
    const btn = App.qs('#randomBtn');
    if (!btn) { return; }

    btn.addEventListener('click', function () {
      /* 随机草稿直接以「编辑中」的形式打开，改一改就能保存 */
      const draft = SiteAPI.randomArticle();
      const modal = App.qs('#articleModal');

      ArticlesPage.state.mode = 'edit';
      ArticlesPage.state.editingId = null;
      ArticlesPage.state.editingCover = '';

      App.qs('[data-modal-body]', modal).innerHTML = ArticlesPage.editorHtml(draft, true);
      ArticlesPage.injectClose(modal);
      ArticlesPage.setCover('');
      ArticlesPage.showModal(modal);
      App.toast('拼了一篇草稿，改完点「保存」');
    });
  }
};

/* --------------------------------------------------------------------------
   7. 归档 & 标签云
   -------------------------------------------------------------------------- */
const Archive = {

  init() {
    this.renderArchive();
    this.renderTags();
  },

  /* 按月份归档 */
  renderArchive() {
    const box = App.qs('[data-archive]');
    if (!box) { return; }

    SiteAPI.getArticles({}).then(function (list) {
      /* 用对象统计每个月的篇数 */
      const counter = {};
      list.forEach(function (a) {
        const month = String(a.date).slice(0, 7); /* 2026-08 */
        counter[month] = (counter[month] || 0) + 1;
      });

      const months = Object.keys(counter).sort().reverse();
      box.innerHTML = months.map(function (m) {
        return '<div class="archive-item" data-month="' + m + '">' +
                 '<span>' + m.replace('-', ' 年 ') + ' 月</span>' +
                 '<span class="archive-item__num">' + counter[m] + ' 篇</span>' +
               '</div>';
      }).join('') || '<div class="archive-item"><span>暂无归档</span></div>';

      /* 点月份 → 跳到文章列表顶部并清空筛选 */
      App.qsa('.archive-item', box).forEach(function (item) {
        item.addEventListener('click', function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          App.toast('归档：' + item.getAttribute('data-month'));
        });
      });
    });
  },

  /* 标签云 */
  renderTags() {
    const box = App.qs('[data-tag-cloud]');
    if (!box) { return; }

    SiteAPI.getArticles({}).then(function (list) {
      const counter = {};
      list.forEach(function (a) {
        (a.tags || []).forEach(function (t) {
          counter[t] = (counter[t] || 0) + 1;
        });
      });

      const tags = Object.keys(counter).sort(function (a, b) {
        return counter[b] - counter[a];
      });

      box.innerHTML = tags.map(function (t) {
        return '<button class="tag-cloud__item" data-tag="' + App.escape(t) + '">' +
                 '#' + App.escape(t) + ' · ' + counter[t] +
               '</button>';
      }).join('') || '<span class="tag-cloud__item">暂无标签</span>';

      /* 点标签 → 把关键词填进搜索框 */
      App.qsa('.tag-cloud__item', box).forEach(function (btn) {
        btn.addEventListener('click', function () {
          const tag = btn.getAttribute('data-tag');
          const input = App.qs('#articleSearch');
          if (input) { input.value = tag; }
          ArticlesPage.state.keyword = tag;
          ArticlesPage.load();
          window.scrollTo({ top: 220, behavior: 'smooth' });
        });
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  ArticlesPage.init();
  Archive.init();

  /* 如果地址栏带了 ?id=xxx，自动打开这篇 */
  const id = App.getQuery('id');
  if (id) { ArticlesPage.openModal(id); }
});
