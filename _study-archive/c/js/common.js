/* ==========================================================================
   common.js —— 全站公共脚本
   包含：顶部导航高亮 / 移动端菜单 / 回到顶部 / 代码块构建与复制 /
        本地存储（进度记录）小工具 / 通用 DOM 辅助函数
   ========================================================================== */
(function (window, document) {
  'use strict';

  /* ======================================================================
     一、通用小工具
     ====================================================================== */

  /* 简写选择器 */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* HTML 转义（用于把用户/数据里的纯文本安全地放进页面） */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* 防抖：搜索框输入、滚动监听常用 */
  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, wait || 200);
    };
  }

  /* 本地存储封装（相当于浏览器里的迷你「数据库」，用来记住做题成绩） */
  var Store = {
    prefix: 'c-site:',
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(this.prefix + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(this.prefix + key, JSON.stringify(value)); } catch (e) { /* 忽略 */ }
    },
    remove: function (key) {
      try { localStorage.removeItem(this.prefix + key); } catch (e) { /* 忽略 */ }
    }
  };

  /* ======================================================================
     二、代码块构建
     用法：UI.codeBlock({ title: '示例', lang: 'c', code: '...' })
     ====================================================================== */
  var UI = {
    /**
     * 生成一段代码块的 HTML
     * @param {Object} opt  { title, lang, code }
     * @returns {string} HTML 字符串
     */
    codeBlock: function (opt) {
      opt = opt || {};
      var raw = opt.code == null ? '' : String(opt.code);
      // 去首尾空行，避免代码块上下留白过多
      raw = raw.replace(/^\s*\n/, '').replace(/\s+$/, '');
      var lang = (opt.lang || 'c').toUpperCase();
      var title = opt.title ? escapeHtml(opt.title) : '';
      var highlighted = window.highlightC ? window.highlightC(raw) : escapeHtml(raw);

      return '' +
        '<div class="code-block">' +
          '<div class="code-head">' +
            '<span class="code-lang">' + escapeHtml(lang) + '</span>' +
            (title ? '<span class="code-title">' + title + '</span>' : '<span class="code-title"></span>') +
            '<button type="button" class="code-copy" data-copy-code>复制</button>' +
          '</div>' +
          '<pre><code class="language-' + escapeHtml(lang.toLowerCase()) + '">' + highlighted + '</code></pre>' +
        '</div>';
    },

    /* 复制代码：直接取 <code> 的 textContent，天然就是原始代码 */
    bindCopyButtons: function (root) {
      (root || document).addEventListener('click', function (e) {
        var btn = e.target.closest('[data-copy-code]');
        if (!btn) { return; }
        var block = btn.closest('.code-block');
        var codeEl = block ? block.querySelector('pre code') : null;
        if (!codeEl) { return; }

        var text = codeEl.textContent;
        var done = function () {
          var old = btn.textContent;
          btn.textContent = '已复制 ✓';
          setTimeout(function () { btn.textContent = old; }, 1400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
        } else {
          fallbackCopy(text, done);
        }
      });
    }
  };

  /* 老浏览器 / file:// 协议下的复制兜底方案 */
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); if (cb) { cb(); } } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ======================================================================
     三、顶部导航：当前页高亮 + 移动端菜单
     ====================================================================== */
  function initNav() {
    // 根据当前文件名（并区分 ?mode=papers）给对应导航项加高亮
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (page === '') { page = 'index.html'; }
    var search = location.search || '';
    var isPapers = search.indexOf('mode=papers') >= 0;

    $$('.nav-links a[href]').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var file = href.split('#')[0].split('?')[0].toLowerCase();
      if (file !== page) { return; }
      var hasQuery = href.indexOf('?') >= 0;
      if (hasQuery ? isPapers : !isPapers) { a.classList.add('is-active'); }
    });

    // 移动端：汉堡按钮展开/收起导航
    var menuBtn = $('[data-menu-toggle]');
    var navLinks = $('.nav-links');
    var sidebar = $('[data-sidebar]');
    var scrim = $('[data-scrim]');

    function closeAll() {
      if (navLinks) { navLinks.classList.remove('is-open'); }
      if (sidebar) { sidebar.classList.remove('is-open'); }
      if (scrim) { scrim.classList.remove('is-show'); }
    }

    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        var willOpen = !(navLinks && navLinks.classList.contains('is-open'));
        closeAll();
        if (willOpen && navLinks) { navLinks.classList.add('is-open'); }
      });
    }

    // 若页面上有移动端「目录」按钮，用来打开侧边栏抽屉
    var sideBtn = $('[data-sidebar-toggle]');
    if (sideBtn) {
      sideBtn.addEventListener('click', function () {
        var willOpen = !(sidebar && sidebar.classList.contains('is-open'));
        closeAll();
        if (willOpen && sidebar) { sidebar.classList.add('is-open'); }
        if (willOpen && scrim) { scrim.classList.add('is-show'); }
      });
    }
    if (scrim) { scrim.addEventListener('click', closeAll); }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); } });

    // 点击侧边栏目录里的链接后，移动端自动收起抽屉
    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        if (e.target.closest('a') && window.innerWidth <= 860) { closeAll(); }
      });
    }
  }

  /* ======================================================================
     四、回到顶部按钮
     ====================================================================== */
  function initToTop() {
    var btn = $('[data-to-top]');
    if (!btn) { return; }
    function onScroll() {
      btn.classList.toggle('is-show', window.scrollY > 400);
    }
    window.addEventListener('scroll', debounce(onScroll, 100), { passive: true });
    onScroll();
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ======================================================================
     五、页脚年份
     ====================================================================== */
  function initFooterYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ======================================================================
     六、统一初始化
     ====================================================================== */
  function init() {
    initNav();
    initToTop();
    initFooterYear();
    UI.bindCopyButtons(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* 暴露给其它脚本使用 */
  window.App = {
    $: $,
    $$: $$,
    escapeHtml: escapeHtml,
    debounce: debounce,
    Store: Store,
    UI: UI
  };
})(window, document);
