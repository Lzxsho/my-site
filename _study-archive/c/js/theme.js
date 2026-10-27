/* ==========================================================================
   theme.js —— 外观设置（明暗模式 + 配色方案）
   --------------------------------------------------------------------------
   两个互相独立的维度：
     1) 模式 data-theme   = "light" | "dark"      —— 决定明暗
     2) 配色 data-palette = "default" | "cream"   —— 决定色系（纯白/米黄/淡蓝/淡灰）
                            | "blue" | "gray"
   CSS 里每个组合都有对应变量，切换属性即可整体换肤，不影响页面结构。
   选择结果存入 localStorage，下次打开自动沿用。
   页面 <head> 里还有一段「防闪屏」内联脚本，会在 CSS 生效前先写好这两个属性。
   ========================================================================== */
(function (window, document) {
  'use strict';

  var THEME_KEY = 'c-site-theme';       // 与 HTML 中内联脚本保持一致
  var PALETTE_KEY = 'c-site-palette';

  /* 配色方案清单（顺序即面板中的显示顺序） */
  var PALETTES = [
    { id: 'default', name: '纯白', color: '#ffffff' },
    { id: 'cream', name: '米黄', color: '#f5efe1' },
    { id: 'blue', name: '淡蓝', color: '#e4eefb' },
    { id: 'gray', name: '淡灰', color: '#eef0f2' }
  ];
  var PALETTE_IDS = PALETTES.map(function (p) { return p.id; });

  function store(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* 隐私模式忽略 */ }
  }

  /* ----------------------------- 模式（明暗） ----------------------------- */

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    store(THEME_KEY, theme);
    syncPanel();
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  /* ----------------------------- 配色（色板） ----------------------------- */

  function getPalette() {
    var p = document.documentElement.getAttribute('data-palette');
    return PALETTE_IDS.indexOf(p) >= 0 ? p : 'default';
  }

  function setPalette(palette) {
    if (PALETTE_IDS.indexOf(palette) < 0) { palette = 'default'; }
    if (palette === 'default') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', palette);
    }
    store(PALETTE_KEY, palette);
    syncPanel();
    document.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: getTheme(), palette: palette }
    }));
  }

  /* ------------------------------ 外观面板 ------------------------------ */

  var panel = null;

  function buildPanel() {
    var btn = document.querySelector('[data-appearance-toggle]');
    if (!btn) { return; }

    panel = document.createElement('div');
    panel.className = 'appearance-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '外观设置');

    var html = '';
    html += '<div class="ap-group">';
    html += '  <div class="ap-label">模式</div>';
    html += '  <div class="ap-modes">';
    html += '    <button type="button" class="ap-mode" data-theme-toggle data-theme-val="light">';
    html += '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
    html += '      浅色</button>';
    html += '    <button type="button" class="ap-mode" data-theme-toggle data-theme-val="dark">';
    html += '      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
    html += '      深色</button>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="ap-group">';
    html += '  <div class="ap-label">配色</div>';
    html += '  <div class="ap-swatches">';
    PALETTES.forEach(function (p) {
      html += '<button type="button" class="ap-sw" data-palette-val="' + p.id + '" title="' + p.name + '">';
      html += '  <i style="background:' + p.color + '"></i>';
      html += '  <span>' + p.name + '</span>';
      html += '</button>';
    });
    html += '  </div>';
    html += '</div>';

    html += '<p class="ap-tip">选择会自动保存，下次打开还是这个外观。</p>';

    panel.innerHTML = html;

    /* 挂到按钮的容器上，方便绝对定位 */
    var host = btn.parentNode;
    if (getComputedStyle(host).position === 'static') { host.style.position = 'relative'; }
    host.appendChild(panel);

    /* 面板内的模式按钮 */
    panel.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      b.addEventListener('click', function () { setTheme(b.getAttribute('data-theme-val')); });
    });
    /* 面板内的配色按钮 */
    panel.querySelectorAll('[data-palette-val]').forEach(function (b) {
      b.addEventListener('click', function () { setPalette(b.getAttribute('data-palette-val')); });
    });

    /* 打开 / 关闭 */
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    });

    /* 点击面板外部、按 Esc 关闭 */
    document.addEventListener('click', function (e) {
      if (panel.hidden) { return; }
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* 同步面板里的选中态与按钮文案 */
  function syncPanel() {
    var theme = getTheme();
    var palette = getPalette();
    document.querySelectorAll('.ap-mode').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-theme-val') === theme);
    });
    document.querySelectorAll('.ap-sw').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-palette-val') === palette);
    });
    /* 顶部按钮的图标跟随明暗 */
    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.setAttribute('title', '外观设置（模式与配色）');
      btn.setAttribute('aria-label', '外观设置（模式与配色）');
    });
  }

  function init() {
    buildPanel();
    syncPanel();
  }

  window.Theme = {
    init: init,
    get: getTheme,
    set: setTheme,
    toggle: toggleTheme,
    getPalette: getPalette,
    setPalette: setPalette,
    palettes: PALETTES
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
