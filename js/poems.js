/* ==========================================================================
   poems.js —— 小诗页脚本
   --------------------------------------------------------------------------
   它做的事：
     1. 渲染小诗时间轴（默认只显示标题 + 时间 + 两行预览）
     2. 点任意一条 → 展开看全文
     3. 展开后可以直接「编辑 / 复制 / 删除」
        · 编辑：标题、时间、内容都能改，保存后写回数据层
        · 删除：自己写的真删；内置的只是隐藏，点「恢复默认」能找回
     4. 顶部搜索，按标题或正文过滤
     5. 底部表单：新增一条小诗
     6. 一键复制全部小诗

   小提醒：所有改动都通过 SiteAPI 走，页面不直接读 SITE_DATA。
   以后接了数据库，只需要改 data.js 里的 SiteAPI，这个文件基本不用动。
   ========================================================================== */

const PoemsPage = {

  state: {
    all: [],                        /* 全部小诗（已经算上「改过」和「删过」的） */
    keyword: '',                    /* 搜索关键词 */
    openId: null,                   /* 当前展开的是哪一条 */
    editId: null,                   /* 当前正在编辑的是哪一条 */
    marks: { hidden: 0, edited: 0 } /* 被隐藏 / 被改过的条数 */
  },

  init() {
    this.bindTimeline();   /* 用事件委托，渲染多少次都不用重新绑定 */
    this.bindForm();
    this.bindSearch();
    this.bindCopy();
    this.bindRestore();
    this.load();
  },

  /* ---------- 读数据 ---------- */
  load() {
    const self = this;
    Api.getPoems().then(function (list) {
      self.state.all = list;
      /* 之前展开的那条如果被删了，就收起 */
      if (self.state.openId && !list.some(function (p) { return p.id === self.state.openId; })) {
        self.state.openId = null;
      }
      self.refreshMarks();
      self.render();
    });
  },

  /* 工具栏上的「恢复默认」按钮：只有真的改过 / 删过才出现 */
  refreshMarks() {
    SiteAPI.getPoemMarks().then(function (m) {
      PoemsPage.state.marks = m;
      const btn = App.qs('#restorePoems');
      if (!btn) { return; }
      const total = m.hidden + m.edited;
      btn.hidden = total === 0;
      btn.textContent = total ? '↺ 恢复默认（' + total + ' 处改动）' : '↺ 恢复默认';
    });
  },

  /* ---------- 1. 渲染时间轴 ---------- */
  render() {
    const box = App.qs('[data-timeline]');
    if (!box) { return; }

    const kw = this.state.keyword.toLowerCase();
    const list = this.state.all.filter(function (p) {
      if (!kw) { return true; }
      return (p.title + p.text).toLowerCase().indexOf(kw) > -1;
    });

    /* 顶部计数 */
    const countBox = App.qs('[data-poem-count]');
    if (countBox) { countBox.innerHTML = String(this.state.all.length); }

    const tip = App.qs('[data-poem-tip]');
    if (tip) {
      if (kw) {
        tip.textContent = '搜索到 ' + list.length + ' 条';
      } else if (this.state.all.length) {
        tip.textContent = '最近一条：' + App.formatDate(this.state.all[0].date);
      } else {
        tip.textContent = '';
      }
    }

    if (!list.length) {
      box.innerHTML = '<div class="poem-empty"><span>✎</span>' +
        (kw ? '没有找到相关的小诗，换个词试试～' : '还没有写下什么，往下拉可以记一条。') +
        '</div>';
      return;
    }

    const self = this;
    box.innerHTML = list.map(function (p) { return self.cardHTML(p); }).join('');

    /* 渲染完把「展开」和「编辑中」的状态还原回去 */
    this.applyOpenState();

    /* 淡入动画 */
    App.qsa('.timeline__item', box).forEach(function (item, i) {
      item.style.transitionDelay = Math.min(i, 8) * 40 + 'ms';
      Reveal.watch(item);
    });
  },

  /* 拼一条小诗的 HTML */
  cardHTML(p) {
    const open = this.state.openId === p.id;
    const mineTag = p.mine
      ? '<span class="tag tag--pink">我写的</span>'
      : '<span class="tag">小诗</span>';
    const editedTag = p.edited ? '<span class="tag tag--blue">已修改</span>' : '';

    /* 收起时只显示前两行，太长的截断 */
    let preview = p.text.replace(/\n/g, ' ／ ');
    if (preview.length > 64) { preview = preview.slice(0, 64) + '…'; }

    return '' +
      '<div class="timeline__item">' +
        '<article class="card poem-card' + (p.mine ? ' poem-card--mine' : '') +
                 (open ? ' is-open' : '') + '" data-card="' + p.id + '">' +

          /* 标题行：点它展开 / 收起 */
          '<div class="poem-card__head" data-toggle="' + p.id + '" role="button" ' +
               'tabindex="0" aria-expanded="' + (open ? 'true' : 'false') + '">' +
            mineTag + editedTag +
            '<h3 class="poem-card__title">' + App.escape(p.title) + '</h3>' +
            '<span class="poem-card__date">' + App.formatDate(p.date) + '</span>' +
            '<span class="poem-card__chev" aria-hidden="true">⌄</span>' +
          '</div>' +

          /* 收起时的两行预览，点它也能展开 */
          '<p class="poem-card__preview" data-toggle="' + p.id + '">' + App.escape(preview) + '</p>' +

          /* 展开后的正文 + 操作按钮 */
          '<div class="poem-card__detail">' +
            /* 展开后的正文：一行一句，左边带行号 ——
               仿代码编辑器的 gutter，诗句就是「代码」。
               收起状态用的是上面那段预览，不显示行号（那边只有一两行）。 */
            '<div class="poem-card__text poem-code">' +
              p.text.split(/\r?\n/).filter(function (l) { return l.trim(); })
                .map(function (line, i) {
                  return '<span class="poem-code__row">' +
                           '<i class="poem-code__no">' + (i + 1) + '</i>' +
                           '<span class="poem-code__line">' + App.escape(line.trim()) + '</span>' +
                         '</span>';
                }).join('') +
            '</div>' +
            '<div class="poem-card__foot">' +
              '<span>' + App.monthDay(p.date) + '</span>' +
              '<span>' + p.text.replace(/\s/g, '').length + ' 字</span>' +
              '<span class="poem-card__actions">' +
                /* 编辑和删除只有管理员看得到；复制是只读操作，谁都能用 */
                '<button class="btn btn--sm btn--ghost" data-admin-only data-edit="' + p.id + '">✎ 编辑</button>' +
                '<button class="btn btn--sm btn--ghost" data-copy="' + p.id + '">⧉ 复制</button>' +
                '<button class="btn btn--sm btn--danger" data-admin-only data-del="' + p.id + '">删除</button>' +
              '</span>' +
            '</div>' +
            /* 留言区：展开后才由 js/comments.js 加载（收着的时候不白跑一趟） */
            '<div class="comments-box" data-comments="poem-' + p.id + '"></div>' +
          '</div>' +

          /* 编辑表单：平时是 hidden，点「编辑」才出现 */
          this.editFormHTML(p) +

        '</article>' +
      '</div>';
  },

  /* 拼编辑表单（默认隐藏） */
  editFormHTML(p) {
    return '' +
      '<form class="poem-edit" data-editform="' + p.id + '" hidden autocomplete="off">' +
        '<div class="poem-edit__grid">' +
          '<label class="field">' +
            '<span>标题</span>' +
            '<input type="text" name="title" value="' + App.escape(p.title) + '">' +
          '</label>' +
          '<label class="field">' +
            '<span>时间</span>' +
            '<input type="date" name="date" value="' + App.escape(p.date) + '">' +
          '</label>' +
          '<label class="field field--full">' +
            '<span>内容（可以换行）</span>' +
            '<textarea name="text" rows="4">' + App.escape(p.text) + '</textarea>' +
          '</label>' +
        '</div>' +
        '<div class="poem-edit__foot">' +
          '<span class="poem-edit__tip">' +
            (SiteAPI.isRemote()
              ? '保存后会写进' + SiteAPI.storeLabel() + '，换浏览器也还在。'
              : '保存后会存在这个浏览器里（localStorage）。' +
                (p.mine ? '' : '内置的小诗不会被改坏，原文还在 data.js 里。')) +
          '</span>' +
          '<button class="btn btn--sm btn--primary" type="submit">保存</button>' +
          '<button class="btn btn--sm" type="button" data-cancel="' + p.id + '">取消</button>' +
        '</div>' +
      '</form>';
  },

  /* 把「展开 / 收起」的视觉状态同步到 DOM */
  applyOpenState() {
    const openId = this.state.openId;
    App.qsa('[data-card]').forEach(function (card) {
      const isOpen = card.getAttribute('data-card') === openId;
      card.classList.toggle('is-open', isOpen);
      App.qsa('[data-toggle]', card).forEach(function (head) {
        head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
      /* 正在编辑的那条保持表单打开 */
      const form = App.qs('[data-editform]', card);
      const editing = card.getAttribute('data-card') === PoemsPage.state.editId;
      if (form) { form.hidden = !editing; }
      card.classList.toggle('is-editing', editing);
    });
    /* 展开的那一条，把它的留言区挂上（没展开的会被 mount 自己跳过） */
    if (window.Comments) { Comments.mountAll(); }
  },

  /* ---------- 2. 时间轴上的所有交互（事件委托） ---------- */
  bindTimeline() {
    const box = App.qs('[data-timeline]');
    if (!box) { return; }

    /* 点击 */
    box.addEventListener('click', function (e) {
      const node = e.target;

      /* a. 展开 / 收起 */
      const toggle = node.closest('[data-toggle]');
      if (toggle) {
        PoemsPage.toggle(toggle.getAttribute('data-toggle'));
        return;
      }

      /* b. 编辑 */
      const edit = node.closest('[data-edit]');
      if (edit) { PoemsPage.startEdit(edit.getAttribute('data-edit')); return; }

      /* c. 取消编辑 */
      const cancel = node.closest('[data-cancel]');
      if (cancel) { PoemsPage.cancelEdit(cancel.getAttribute('data-cancel')); return; }

      /* d. 复制这一条 */
      const copy = node.closest('[data-copy]');
      if (copy) { PoemsPage.copyOne(copy.getAttribute('data-copy')); return; }

      /* e. 删除 */
      const del = node.closest('[data-del]');
      if (del) { PoemsPage.askDelete(del.getAttribute('data-del')); return; }
    });

    /* 表单回车提交（编辑） */
    box.addEventListener('submit', function (e) {
      const form = e.target.closest('[data-editform]');
      if (!form) { return; }
      e.preventDefault();
      PoemsPage.saveEdit(form.getAttribute('data-editform'), form);
    });

    /* 键盘：在标题上按回车 / 空格也能展开 */
    box.addEventListener('keydown', function (e) {
      const toggle = e.target.closest('[data-toggle]');
      if (!toggle) { return; }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        PoemsPage.toggle(toggle.getAttribute('data-toggle'));
      }
      if (e.key === 'Escape') { PoemsPage.cancelEdit(PoemsPage.state.editId); }
    });
  },

  /* 展开 / 收起一条 */
  toggle(id) {
    this.state.openId = (this.state.openId === id) ? null : id;
    /* 收起时顺手把编辑表单也关掉 */
    if (this.state.openId !== id) { this.state.editId = null; }
    this.applyOpenState();
  },

  /* ---------- 3. 编辑 ---------- */
  startEdit(id) {
    if (!window.Auth || !Auth.gate()) { return; }
    this.state.openId = id;     /* 先展开，编辑区才看得见 */
    this.state.editId = id;
    this.applyOpenState();

    const card = App.qs('[data-card="' + id + '"]');
    const form = card ? App.qs('[data-editform]', card) : null;
    if (!form) { return; }

    const textarea = App.qs('textarea', form);
    if (textarea) {
      textarea.focus();
      /* 光标放到末尾，方便接着改 */
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  /* 取消：把输入框恢复成原样再收起来 */
  cancelEdit(id) {
    if (!id) { return; }
    const p = this.state.all.find(function (x) { return x.id === id; });
    const card = App.qs('[data-card="' + id + '"]');
    const form = card ? App.qs('[data-editform]', card) : null;

    if (form && p) {
      App.qs('[name="title"]', form).value = p.title;
      App.qs('[name="date"]', form).value = p.date;
      App.qs('[name="text"]', form).value = p.text;
    }

    this.state.editId = null;
    this.applyOpenState();
  },

  /* 保存 */
  saveEdit(id, form) {
    if (!window.Auth || !Auth.gate()) { return; }
    const title = (App.qs('[name="title"]', form).value || '').trim() || '无题';
    const date = App.qs('[name="date"]', form).value || App.today();
    const text = (App.qs('[name="text"]', form).value || '').trim();

    if (!text) {
      App.toast('内容不能空着呀');
      App.qs('[name="text"]', form).focus();
      return;
    }

    SiteAPI.updatePoem(id, { title: title, date: date, text: text }).then(function (ok) {
      App.toast(ok ? '改好了，已经保存 ✎' : '保存失败，可能是浏览器不允许写本地存储');
      PoemsPage.state.editId = null;
      PoemsPage.state.openId = id;   /* 保存后保持展开，方便核对 */
      PoemsPage.load();
    });
  },

  /* 删除（自己写的真删，内置的只是隐藏） */
  askDelete(id) {
    const p = this.state.all.find(function (x) { return x.id === id; });
    const title = '《' + (p ? p.title : '') + '》';
    let msg;
    if (SiteAPI.isRemote()) {
      /* 云端 / 数据库里的每一条都是真实数据，没有「只是隐藏」这回事 */
      msg = '确定删掉' + title + '吗？\n' + SiteAPI.storeLabel() + '里删掉就真的没有了。';
    } else if (p && p.mine) {
      msg = '确定删掉' + title + '吗？自己写的删了就找不回来了。';
    } else {
      msg = '确定删掉' + title + '吗？\n内置的小诗只是隐藏，之后点「恢复默认」还能找回来。';
    }
    if (!window.confirm(msg)) { return; }

    SiteAPI.removePoem(id).then(function () {
      App.toast('已经删掉了');
      PoemsPage.load();
    });
  },

  /* ---------- 4. 搜索 ---------- */
  bindSearch() {
    const input = App.qs('#poemSearch');
    if (!input) { return; }

    let timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        PoemsPage.state.keyword = input.value.trim();
        PoemsPage.render();
      }, 220);
    });
  },

  /* ---------- 5. 新增一条 ---------- */
  bindForm() {
    const form = App.qs('#poemForm');
    if (!form) { return; }

    const titleInput = App.qs('#poemTitle', form);
    const dateInput = App.qs('#poemDate', form);
    const textInput = App.qs('#poemText', form);

    /* 日期默认填今天 */
    if (dateInput && !dateInput.value) { dateInput.value = App.today(); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();   /* 阻止表单刷新页面 */

      const text = (textInput.value || '').trim();
      if (!text) {
        App.toast('至少写一句话呀');
        textInput.focus();
        return;
      }

      SiteAPI.addPoem({
        title: (titleInput.value || '').trim() || '无题',
        date: dateInput.value || App.today(),
        text: text
      }).then(function () {
        App.toast('已经记下来了 ✎');
        textInput.value = '';
        titleInput.value = '';
        dateInput.value = App.today();
        PoemsPage.load();
      });
    });

    /* Ctrl / Cmd + Enter 也能提交 */
    if (textInput) {
      textInput.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      });
    }
  },

  /* ---------- 6. 复制 ---------- */
  bindCopy() {
    const btn = App.qs('#copyPoems');
    if (!btn) { return; }

    btn.addEventListener('click', function () {
      const text = PoemsPage.state.all.map(function (p) {
        return '《' + p.title + '》 ' + App.formatDate(p.date) + '\n' + p.text;
      }).join('\n\n');
      PoemsPage.copyText(text, '全部小诗已复制到剪贴板');
    });
  },

  /* 复制单独一条 */
  copyOne(id) {
    const p = this.state.all.find(function (x) { return x.id === id; });
    if (!p) { return; }
    this.copyText('《' + p.title + '》 ' + App.formatDate(p.date) + '\n' + p.text, '这一条已复制');
  },

  copyText(text, okMessage) {
    /* 优先用现代剪贴板 API，失败就退回老办法 */
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        App.toast(okMessage);
      }).catch(function () {
        PoemsPage.fallbackCopy(text, okMessage);
      });
    } else {
      this.fallbackCopy(text, okMessage);
    }
  },

  fallbackCopy(text, okMessage) {
    const area = App.el('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      App.toast(okMessage);
    } catch (e) {
      App.toast('复制失败，请手动选择文字');
    }
    document.body.removeChild(area);
  },

  /* ---------- 7. 恢复默认 ---------- */
  bindRestore() {
    const btn = App.qs('#restorePoems');
    if (!btn) { return; }

    btn.addEventListener('click', function () {
      if (!window.confirm('把「改过的」和「删掉的」小诗全部还原成 data.js 里的原始内容？')) {
        return;
      }
      SiteAPI.restorePoems().then(function () {
        App.toast('已经恢复成默认的样子');
        PoemsPage.state.openId = null;
        PoemsPage.state.editId = null;
        PoemsPage.load();
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  PoemsPage.init();
});
