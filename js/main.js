/* ==========================================================================
   main.js —— 全站公共脚本（每个页面都会加载）
   --------------------------------------------------------------------------
   目录：
     1. 小工具集合 App（选择元素、格式化日期、转义、提示条…）
     2. 顶部导航：滚动变色 / 当前页高亮 / 手机端菜单
     3. 主题切换（浅色 / 深色），记在 localStorage 里
     4. 滚动显现动画
     5. 页脚年份
     6. 回到顶部
     7. 页面初始化
   ========================================================================== */

/* --------------------------------------------------------------------------
   1. 小工具集合
   把常用的函数放在 App 上，其他页面的 js 直接调用 App.xxx 就行
   -------------------------------------------------------------------------- */
const App = {

  /* 取一个元素 */
  qs(selector, scope) {
    return (scope || document).querySelector(selector);
  },

  /* 取一组元素，转成真数组，方便用 forEach / map */
  qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  },

  /* 创建元素：App.el('div', 'card', '内容') */
  el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) { node.className = className; }
    if (html !== undefined) { node.innerHTML = html; }
    return node;
  },

  /* 把 HTML 里的特殊字符转义，防止内容把页面结构搞坏 */
  escape(str) {
    return String(str === undefined || str === null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /* 把多行文字变成 <p> 段落 */
  toParagraphs(text) {
    return String(text || '')
      .split('\n')
      .filter(function (line) { return line.trim() !== ''; })
      .map(function (line) { return '<p>' + App.escape(line) + '</p>'; })
      .join('');
  },

  /* 判断一个字符串是「照片地址」还是「CSS 渐变」
       照片：assets/xxx.jpg 、http... 、data:image/... （含相对路径）
       渐变：linear-gradient(...) 、#ffe6f3 之类
     文章封面就靠它决定「显示照片」还是「显示渐变色块」 */
  isImageUrl(value) {
    const s = String(value === undefined || value === null ? '' : value).trim();
    if (!s) { return false; }
    if (/^data:image\//i.test(s)) { return true; }        /* 从界面里选的本地图片存成这个 */
    if (/^(https?:)?\/\//i.test(s)) { return true; }      /* 在线图片链接 */
    if (/\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i.test(s)) { return true; }
    return false;
  },

  /* 渲染「封面」
       cover 填照片 → 显示照片（铺满、居中裁切、不变形）
       cover 填渐变或留空 → 显示原来的渐变色块
       cls：卡片用 'cover'，详情弹窗用 'cover modal__cover'
     想换某篇文章的封面，只改 js/data.js 里那一条的 cover 就行。 */
  coverHtml(cover, cls, alt) {
    const klass = cls || 'cover';
    const value = String(cover === undefined || cover === null ? '' : cover).trim();

    if (App.isImageUrl(value)) {
      return '<div class="' + klass + ' cover--photo">' +
               '<img src="' + App.escape(value) + '" alt="' + App.escape(alt || '封面照片') + '">' +
             '</div>';
    }
    return '<div class="' + klass + '"' +
             (value ? ' style="background:' + App.escape(value) + ';"' : '') +
           '></div>';
  },

  /* 读一张本地图片，压小之后返回 dataURL（一段以 data:image/ 开头的字符串）
     为什么要压：手机拍的原图动辄好几 MB，直接塞进浏览器会超容量、也会卡。
     这里用 <canvas> 把长边缩到 maxWidth，再输出成 JPEG，一般只剩一两百 KB。
     返回 Promise：
       App.readImageFile(file, 1400).then(function (dataUrl) { ... }) */
  readImageFile(file, maxWidth) {
    const limit = maxWidth || 1400;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type)) {
        reject(new Error('这个文件不是图片'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('这张图片打不开，换一张试试')); };
        img.onload = function () {
          const scale = Math.min(1, limit / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';   /* 透明 PNG 转 JPEG 前先铺白底，否则透明处会变黑 */
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          try {
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            reject(new Error('图片处理失败'));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /* 2026-08-05 → 2026.08.05 */
  formatDate(dateStr) {
    if (!dateStr) { return ''; }
    return String(dateStr).replace(/-/g, '.');
  },

  /* 取日期的「月」和「日」，做时间轴用 */
  monthDay(dateStr) {
    const parts = String(dateStr || '').split('-');
    if (parts.length < 3) { return dateStr; }
    return parts[1] + ' / ' + parts[2];
  },

  /* 今天，格式 2026-09-16 */
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  /* 数字补零 */
  pad(n) { return n < 10 ? '0' + n : String(n); },

  /* 轻提示 */
  toast(message) {
    let box = App.qs('.toast');
    if (!box) {
      box = App.el('div', 'toast');
      document.body.appendChild(box);
    }
    box.textContent = message;
    /* 强制重绘，保证连续调用时动画能重新播放 */
    void box.offsetWidth;
    box.classList.add('is-show');
    clearTimeout(App._toastTimer);
    App._toastTimer = setTimeout(function () {
      box.classList.remove('is-show');
    }, 2200);
  },

  /* 取地址栏参数：?category=随笔  →  App.getQuery('category') */
  getQuery(key) {
    const search = window.location.search.slice(1);
    if (!search) { return ''; }
    const pairs = search.split('&');
    for (let i = 0; i < pairs.length; i++) {
      const kv = pairs[i].split('=');
      if (decodeURIComponent(kv[0]) === key) {
        return decodeURIComponent(kv[1] || '');
      }
    }
    return '';
  },

  /* 显示 / 隐藏一个元素 */
  show(node) { if (node) { node.style.display = ''; } },
  hide(node) { if (node) { node.style.display = 'none'; } }
};

/* --------------------------------------------------------------------------
   2. 顶部导航
   -------------------------------------------------------------------------- */
const Nav = {

  init() {
    this.bar = App.qs('.topbar');
    this.menuBtn = App.qs('#menuBtn');
    this.nav = App.qs('#nav');

    this.bindScroll();
    this.highlight();
    this.bindMenu();
  },

  /* 滚动超过 20px 就给导航加毛玻璃背景 */
  bindScroll() {
    if (!this.bar) { return; }
    const onScroll = function () {
      if (window.scrollY > 20) {
        Nav.bar.classList.add('is-scrolled');
      } else {
        Nav.bar.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); /* 先执行一次，处理「刷新时已经在中间」的情况 */
  },

  /* 根据当前文件名，给对应的导航项加高亮 */
  highlight() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    App.qsa('#nav a').forEach(function (a) {
      const href = a.getAttribute('href');
      if (href === path) { a.classList.add('is-active'); }
    });
  },

  /* 手机端的汉堡菜单 */
  bindMenu() {
    if (!this.menuBtn || !this.nav) { return; }
    this.menuBtn.addEventListener('click', function () {
      Nav.nav.classList.toggle('is-open');
    });
    /* 点完链接就收起来 */
    App.qsa('#nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        Nav.nav.classList.remove('is-open');
      });
    });
  }
};

/* --------------------------------------------------------------------------
   3. 主题切换
   -------------------------------------------------------------------------- */
const Theme = {

  KEY: 'shuoscape_theme',

  init() {
    /* 先读上次的选择 */
    let saved = 'light';
    try { saved = localStorage.getItem(this.KEY) || 'light'; } catch (e) { saved = 'light'; }
    this.apply(saved);

    const btn = App.qs('#themeBtn');
    if (!btn) { return; }
    btn.textContent = saved === 'dark' ? '☀' : '◐';
    btn.addEventListener('click', function () {
      const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
      Theme.apply(next);
      Theme.save(next);
      btn.textContent = next === 'dark' ? '☀' : '◐';
      App.toast(next === 'dark' ? '已切换到深色' : '已切换到浅色');
    });
  },

  apply(mode) {
    if (mode === 'dark') {
      document.body.classList.add('theme-dark');
    } else {
      document.body.classList.remove('theme-dark');
    }
  },

  save(mode) {
    try { localStorage.setItem(this.KEY, mode); } catch (e) { /* 忽略隐私模式报错 */ }
  }
};

/* --------------------------------------------------------------------------
   4. 滚动显现动画
   给元素加 class="reveal"，进入视口后自动加 is-in
   -------------------------------------------------------------------------- */
const Reveal = {

  observer: null,

  init() {
    const items = App.qsa('.reveal');
    if (!items.length) { return; }

    /* 老浏览器不支持 IntersectionObserver，就直接全部显示 */
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    this.observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          Reveal.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (n) { Reveal.observer.observe(n); });
  },

  /* 动态插入的元素（比如渲染出来的卡片）也要能观察 */
  watch(node) {
    if (!node) { return; }
    node.classList.add('reveal');
    if (this.observer) {
      this.observer.observe(node);
    } else {
      node.classList.add('is-in');
    }
  }
};

/* --------------------------------------------------------------------------
   5. 页脚年份
   -------------------------------------------------------------------------- */
function initFooterYear() {
  App.qsa('[data-year]').forEach(function (node) {
    node.textContent = new Date().getFullYear();
  });
}

/* --------------------------------------------------------------------------
   6.5 数据来源小标记
   页脚那行字后面会多出一个小小的「数据库 / 本地」——
   一眼就能看出现在这份数据是从哪来的，不用去翻控制台。
   -------------------------------------------------------------------------- */
const DataMode = {

  init() {
    if (typeof SiteAPI === 'undefined') { return; }

    SiteAPI.whenReady().then(function (mode) {
      document.body.setAttribute('data-mode', mode);

      const sign = App.qs('.footer__sign');
      if (!sign) { return; }

      const isDb = mode === 'db';
      const label = isDb ? '数据库' : '本地';
      const tip = isDb
        ? '数据来自 db/site.db，由 server.js 读写。改完刷新页面就能看到。'
        : '没有检测到后端（直接双击打开的网页），数据写在 js/data.js 里，你自己改的记在浏览器中。想用数据库请双击 start.bat。';

      const badge = App.el('span', 'mode-badge is-' + mode, label);
      badge.title = tip;
      sign.appendChild(document.createTextNode(' · '));
      sign.appendChild(badge);
    });
  }
};

/* --------------------------------------------------------------------------
   7. 回到顶部
   -------------------------------------------------------------------------- */
function initBackTop() {
  const btn = App.qs('#backTop');
  if (!btn) { return; }

  window.addEventListener('scroll', function () {
    if (window.scrollY > 480) {
      btn.classList.add('is-show');
    } else {
      btn.classList.remove('is-show');
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* --------------------------------------------------------------------------
   8. 初始化：DOM 解析完就执行
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  Nav.init();
  Theme.init();
  Reveal.init();
  initFooterYear();
  DataMode.init();
  initBackTop();
});

/* 方便在控制台调试 */
window.App = App;
window.Nav = Nav;
window.Theme = Theme;
window.Reveal = Reveal;
window.DataMode = DataMode;
