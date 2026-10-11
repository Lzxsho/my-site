/* ==========================================================================
   image-papers-page.js —— 图片卷（扫描原图）页面的渲染与交互
   左侧目录列出各扫描卷；右侧逐页卡片显示原图 + 填空作答区 + 参考答案。
   点击图片进入「全屏查看器」：可放大/缩小、拖动移动、左右翻页，
   右侧留出专门的作答区，边看大图边写答案（与页面卡片作答内容同步）。
   ========================================================================== */
(function (window, document) {
  'use strict';

  var $ = window.App.$, $$ = window.App.$$;
  var esc = window.App.escapeHtml;

  var PAPERS = window.IMAGE_PAPERS || [];

  var sideList, sideTitle, contentBox, pageHead;
  var currentId = null;
  var currentPages = [];

  /* ---------------- 查看器元素与状态 ---------------- */
  var viewer, vStage, vImg, vTitle, vPage, vZoom, vInput, vAnswer, vAside;
  var vIndex = 0;
  var vs = { scale: 1, x: 0, y: 0 };       // 当前缩放与位移
  var drag = null;                          // 拖拽会话
  var pinch = null;                         // 双指缩放会话

  function init() {
    sideList = $('[data-side-list]');
    sideTitle = $('[data-side-title]');
    contentBox = $('[data-papers-image-content]');
    pageHead = $('[data-page-head]');
    if (!sideList || !contentBox) { return; }

    cacheViewer();
    bindViewer();

    sideList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-paper]');
      if (!btn) { return; }
      select(btn.getAttribute('data-paper'));
    });

    contentBox.addEventListener('click', function (e) {
      var img = e.target.closest('.paper-img');
      if (img) {
        openViewer(parseInt(img.getAttribute('data-idx'), 10) || 0);
        return;
      }
      var ab = e.target.closest('[data-toggle-answer]');
      if (ab) {
        var card = ab.closest('.paper-page');
        var ans = card.querySelector('.paper-answer');
        var open = ans.classList.toggle('is-open');
        ab.textContent = open ? '收起参考答案' : '显示参考答案';
        return;
      }
    });

    if (!PAPERS.length) {
      contentBox.innerHTML = '<div class="empty-state"><h3>本版本未包含扫描图片卷</h3>' +
        '<p>扫描原图体积较大（约 77MB），未随轻量版一起打包。' +
        '如需查看「黄师预测卷 / 必刷2000题 / 试题汇编」原图练习，请使用<strong>完整版</strong>或在线版打开。</p></div>';
      return;
    }

    renderSidebar();
    select(PAPERS[0].id);

    var toggle = $('[data-sidebar-toggle]');
    if (toggle) { toggle.hidden = false; }
  }

  function renderSidebar() {
    var html = '';
    PAPERS.forEach(function (p) {
      html += '<div class="side-chapter">';
      html += '  <button type="button" class="side-chapter-head" data-paper="' + esc(p.id) + '">';
      html += '    <span class="ch-name">' + esc(p.title) + '</span>';
      html += '  </button>';
      html += '  <div class="side-sections" style="display:block"><span class="side-score">共 ' + p.pages.length + ' 页</span></div>';
      html += '</div>';
    });
    sideList.innerHTML = html;
    bindActive();
  }

  function bindActive() {
    $$('[data-paper]', sideList).forEach(function (b) {
      b.classList.toggle('is-open', b.getAttribute('data-paper') === currentId);
    });
  }

  function select(id) {
    currentId = id;
    bindActive();
    var paper = PAPERS.filter(function (p) { return p.id === id; })[0];
    if (!paper) { return; }
    currentPages = paper.pages;

    pageHead.innerHTML = '' +
      '<div class="eyebrow">扫描原图卷</div>' +
      '<h1>' + esc(paper.title) + '</h1>' +
      '<p>共 ' + paper.pages.length + ' 页。<strong>点击任意一张图片</strong>进入全屏细看模式：' +
      '可放大、拖动左右移动、左右翻页；右侧是本页专门的作答区，可以直接边看边写答案。</p>';

    var html = '';
    paper.pages.forEach(function (pg, i) {
      var ansText = pg.text
        ? esc(pg.text).replace(/\n/g, '<br>')
        : '（本页暂无文字转录，请对照原图核对你的作答）';
      html += '<article class="paper-page">';
      html += '  <div class="paper-page-head"><h3>第 ' + (i + 1) + ' 页</h3>';
      html += '    <button type="button" class="btn btn-sm btn-soft" data-toggle-answer>显示参考答案</button>';
      html += '  </div>';
      html += '  <div class="paper-page-body">';
      html += '    <div class="paper-figure">';
      html += '      <img class="paper-img" data-idx="' + i + '" src="' + esc(pg.img) + '" alt="第' + (i + 1) + '页" loading="lazy">';
      html += '      <div class="paper-figure-tip">点击图片 → 全屏细看（可缩放、拖动、翻页）</div>';
      html += '    </div>';
      html += '    <div class="paper-aside">';
      html += '      <label class="paper-fill-label">我的作答</label>';
      html += '      <textarea class="answer-area" data-input-idx="' + i + '" placeholder="在此写下你对本页题目的作答…"></textarea>';
      html += '      <div class="paper-answer" data-answer>' + ansText + '</div>';
      html += '    </div>';
      html += '  </div>';
      html += '</article>';
    });

    contentBox.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ======================================================================
     全屏查看器
     ====================================================================== */
  function cacheViewer() {
    viewer = $('[data-viewer]');
    if (!viewer) { return; }
    vStage = viewer.querySelector('[data-v-stage]');
    vImg = viewer.querySelector('[data-v-img]');
    vTitle = viewer.querySelector('[data-v-title]');
    vPage = viewer.querySelector('[data-v-page]');
    vZoom = viewer.querySelector('[data-v-zoom]');
    vInput = viewer.querySelector('[data-v-input]');
    vAnswer = viewer.querySelector('[data-v-answer]');
    vAside = viewer.querySelector('[data-v-aside]');
  }

  function currentTitle() {
    var p = PAPERS.filter(function (x) { return x.id === currentId; })[0];
    return p ? p.title : '';
  }

  function openViewer(idx) {
    if (!viewer || !currentPages.length) { return; }
    if (idx < 0) { idx = 0; }
    if (idx > currentPages.length - 1) { idx = currentPages.length - 1; }
    vIndex = idx;
    viewer.hidden = false;
    document.documentElement.classList.add('viewer-open');
    // 手机等窄屏：默认收起作答区，把屏幕尽量留给题目大图
    var narrow = window.innerWidth <= 900;
    viewer.classList.toggle('aside-hidden', narrow);
    var asideBtn = viewer.querySelector('[data-v-act="aside"]');
    if (asideBtn) { asideBtn.textContent = narrow ? '显示作答区' : '收起作答区'; }
    loadViewerPage();
  }

  function closeViewer() {
    if (!viewer) { return; }
    viewer.hidden = true;
    document.documentElement.classList.remove('viewer-open');
  }

  function loadViewerPage() {
    var pg = currentPages[vIndex];
    if (!pg) { return; }
    vTitle.textContent = currentTitle() + ' · 第 ' + (vIndex + 1) + ' 页';
    vPage.textContent = (vIndex + 1) + ' / ' + currentPages.length;
    vAnswer.innerHTML = pg.text
      ? esc(pg.text).replace(/\n/g, '<br>')
      : '（本页暂无文字转录，请对照原图核对你的作答）';
    vAnswer.classList.remove('is-open');
    var answerBtn = viewer.querySelector('[data-v-act="answer"]');
    if (answerBtn) { answerBtn.textContent = '显示参考答案'; }

    // 与页面卡片的作答内容保持同步
    var cardInput = contentBox.querySelector('[data-input-idx="' + vIndex + '"]');
    vInput.value = cardInput ? cardInput.value : '';

    // 图片加载完成后按屏幕尺寸做一次自适应
    vImg.onload = function () { fitView(); };
    vImg.src = pg.img;
    if (vImg.complete && vImg.naturalWidth) { fitView(); }
  }

  function applyTransform() {
    vImg.style.transform = 'translate(' + vs.x + 'px, ' + vs.y + 'px) scale(' + vs.scale + ')';
    vZoom.textContent = Math.round(vs.scale * 100) + '%';
  }

  /* 让整页完整落在舞台内（适应模式）/ 铺满宽度 / 自动 */
  function fitView(mode) {
    if (!vImg.naturalWidth) { return; }
    var box = vStage.getBoundingClientRect();
    var pad = 16;
    var fx = (box.width - pad * 2) / vImg.naturalWidth;    // 宽度方向可用的缩放
    var fy = (box.height - pad * 2) / vImg.naturalHeight;  // 高度方向可用的缩放
    var contain = Math.min(fx, fy);                        // 整页可见
    var s;
    if (mode === 'contain') { s = contain; }
    else if (mode === 'width') { s = Math.min(fx, 1); }
    else { s = box.width < 720 ? Math.min(fx, 1) : contain; }  // 窄屏默认适合宽度
    vs.scale = Math.max(0.05, s);
    centerImage();
    applyTransform();
  }

  /* 把图片居中：宽度不足时水平居中，高度不足时垂直居中；
     超出的一侧从顶端/左端开始，方便从题头往下读 */
  function centerImage() {
    var box = vStage.getBoundingClientRect();
    var w = vImg.naturalWidth * vs.scale;
    var h = vImg.naturalHeight * vs.scale;
    vs.x = w <= box.width ? (box.width - w) / 2 : 0;
    vs.y = h <= box.height ? (box.height - h) / 2 : 0;
  }

  /* 以舞台内某点为锚缩放：保证该点在屏幕上的位置不动 */
  function zoomTo(next, anchorX, anchorY) {
    next = Math.max(0.1, Math.min(8, next));
    var box = vStage.getBoundingClientRect();
    if (anchorX == null) { anchorX = box.width / 2; }
    if (anchorY == null) { anchorY = box.height / 2; }
    var px = anchorX - box.left, py = anchorY - box.top;
    var k = next / vs.scale;
    vs.x = px - (px - vs.x) * k;
    vs.y = py - (py - vs.y) * k;
    vs.scale = next;
    applyTransform();
  }

  /* 防止图片被拖出视野：小于舞台时居中，大于舞台时四周留 24px 边界 */
  function clampPan() {
    if (!vImg.naturalWidth) { return; }
    var box = vStage.getBoundingClientRect();
    var w = vImg.naturalWidth * vs.scale;
    var h = vImg.naturalHeight * vs.scale;
    var m = 24;
    if (w <= box.width) { vs.x = (box.width - w) / 2; }
    else { vs.x = Math.max(box.width - w - m, Math.min(m, vs.x)); }
    if (h <= box.height) { vs.y = (box.height - h) / 2; }
    else { vs.y = Math.max(box.height - h - m, Math.min(m, vs.y)); }
  }

  function bindViewer() {
    if (!viewer) { return; }

    /* 工具条按钮 */
    viewer.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-v-act]');
      if (!btn) { return; }
      var act = btn.getAttribute('data-v-act');
      if (act === 'close') { closeViewer(); }
      else if (act === 'prev') { if (vIndex > 0) { vIndex--; loadViewerPage(); } }
      else if (act === 'next') { if (vIndex < currentPages.length - 1) { vIndex++; loadViewerPage(); } }
      else if (act === 'in') { zoomTo(vs.scale * 1.25, null, null); }
      else if (act === 'out') { zoomTo(vs.scale / 1.25, null, null); }
      else if (act === 'fit') { fitView('contain'); }
      else if (act === 'width') { fitView('width'); }
      else if (act === 'one') { zoomTo(1, null, null); }
      else if (act === 'answer') {
        var open = vAnswer.classList.toggle('is-open');
        btn.textContent = open ? '收起参考答案' : '显示参考答案';
      } else if (act === 'aside') {
        var hiddenAside = viewer.classList.toggle('aside-hidden');
        btn.textContent = hiddenAside ? '显示作答区' : '收起作答区';
      }
    });

    /* 查看器作答 → 同步回页面卡片 */
    vInput.addEventListener('input', function () {
      var cardInput = contentBox.querySelector('[data-input-idx="' + vIndex + '"]');
      if (cardInput) { cardInput.value = vInput.value; }
    });

    /* 鼠标拖动 / 单指拖动 */
    vStage.addEventListener('pointerdown', function (e) {
      if (e.target === vStage || e.target === vImg) {
        drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: vs.x, oy: vs.y };
        vStage.classList.add('is-pan');
        vStage.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    });
    vStage.addEventListener('pointermove', function (e) {
      if (pinch) { return; }
      if (!drag || e.pointerId !== drag.id) { return; }
      vs.x = drag.ox + (e.clientX - drag.sx);
      vs.y = drag.oy + (e.clientY - drag.sy);
      clampPan();
      applyTransform();
    });
    function endDrag(e) {
      if (drag && e.pointerId === drag.id) { drag = null; vStage.classList.remove('is-pan'); }
    }
    vStage.addEventListener('pointerup', endDrag);
    vStage.addEventListener('pointercancel', endDrag);

    /* 双击：在「适应全页」与「原尺寸」之间切换 */
    vStage.addEventListener('dblclick', function (e) {
      if (Math.abs(vs.scale - containScale()) < 0.02) {
        zoomTo(1, e.clientX, e.clientY);
      } else {
        fitView('contain');
      }
    });

    /* 滚轮缩放（锚点为鼠标位置） */
    vStage.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomTo(vs.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY);
    }, { passive: false });

    /* 双指捏合缩放（手机） */
    vStage.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        drag = null;
        vStage.classList.remove('is-pan');
        pinch = {
          dist: touchDist(e),
          scale: vs.scale
        };
        e.preventDefault();
      }
    }, { passive: false });
    vStage.addEventListener('touchmove', function (e) {
      if (pinch && e.touches.length === 2) {
        var d = touchDist(e);
        zoomTo(pinch.scale * (d / pinch.dist), null, null);
        e.preventDefault();
      }
    }, { passive: false });
    vStage.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) { pinch = null; }
    });

    /* 快捷键：Esc 关闭，← → 翻页，+ - 缩放 */
    document.addEventListener('keydown', function (e) {
      if (!viewer || viewer.hidden) { return; }
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        if (e.key !== 'Escape') { return; }
      }
      if (e.key === 'Escape') { closeViewer(); }
      else if (e.key === 'ArrowLeft') { if (vIndex > 0) { vIndex--; loadViewerPage(); } }
      else if (e.key === 'ArrowRight') { if (vIndex < currentPages.length - 1) { vIndex++; loadViewerPage(); } }
      else if (e.key === '+' || e.key === '=') { zoomTo(vs.scale * 1.25, null, null); }
      else if (e.key === '-' || e.key === '_') { zoomTo(vs.scale / 1.25, null, null); }
    });

    /* 窗口尺寸变化时保持可用 */
    window.addEventListener('resize', function () {
      if (viewer && !viewer.hidden) { clampPan(); applyTransform(); }
    });
  }

  function touchDist(e) {
    var a = e.touches[0], b = e.touches[1];
    var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy) || 1;
  }

  /* 当前「适应全页」应使用的缩放（用于双击判断） */
  function containScale() {
    if (!vImg.naturalWidth) { return 1; }
    var box = vStage.getBoundingClientRect();
    var pad = 16;
    return Math.min((box.width - pad * 2) / vImg.naturalWidth,
                    (box.height - pad * 2) / vImg.naturalHeight);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
