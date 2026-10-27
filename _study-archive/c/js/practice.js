/* ==========================================================================
   practice.js —— 习题训练页面的渲染与交互
   功能：
     1. 两大板块切换：【章节配套习题】/【综合模拟试卷】
     2. 左侧列表按章节（或试卷）分项，显示上次得分
     3. 选择题可勾选，提交后自动判分并标出对错
     4. 填空题输入后自动比对（忽略空格、大小写、中英文标点差异）
     5. 程序阅读题 / 编程题 / 改错题：可写答案，点击按钮展开参考答案
     6. 成绩保存在浏览器本地（localStorage），下次打开仍在
   ========================================================================== */
(function (window, document) {
  'use strict';

  var $ = window.App.$, $$ = window.App.$$;
  var Store = window.App.Store;
  var CODE = window.App.UI.codeBlock;
  var esc = window.App.escapeHtml;

  var DATA = window.PRACTICE_DATA || { chapters: [], papers: [] };
  var state = { mode: 'chapters', id: null };

  var sideList, sideTitle, contentBox, pageHead;

  /* 题型显示名称 */
  var TYPE_LABEL = {
    choice: '选择题',
    fill: '填空题',
    read: '程序阅读题',
    code: '编程题',
    fix: '程序改错题'
  };

  /* 专项强化板块小图标字符 */
  var TYPE_CHAR = { choice: '选', fill: '填', read: '阅', fix: '改', code: '编' };

  /* ====================================================================
     一、左侧列表
     ==================================================================== */
  function currentList() {
    if (state.mode === 'papers') { return DATA.papers; }
    if (state.mode === 'specials') { return specialItems(); }
    return DATA.chapters;
  }

  /* 专项强化：把每个板块按 50 题一组拍平成可点击的「组」 */
  function specialItems() {
    var arr = [];
    (DATA.specials || []).forEach(function (board) {
      board.groups.forEach(function (g, gi) {
        arr.push({
          id: g.id,
          board: board.title,
          type: g.type,
          labelChar: TYPE_CHAR[g.type] || '专',
          title: board.title + ' · 第 ' + (gi + 1) + ' 组',
          desc: board.note,
          groups: [g]
        });
      });
    });
    return arr;
  }

  /* 板块标题（页头眉标） */
  function eyebrowOf() {
    return state.mode === 'papers' ? '综合模拟试卷'
      : state.mode === 'specials' ? '专项强化'
      : '章节配套习题';
  }

  function buildSidebar() {
    var list = currentList();
    sideTitle.textContent = state.mode === 'papers' ? '试卷列表' : '章节目录';

    var html = '';
    list.forEach(function (item) {
      var count = item.groups.reduce(function (n, g) { return n + g.questions.length; }, 0);
      var score = Store.get('score:' + item.id, null);
      var scoreHtml = score
        ? '<span class="side-score">上次得分：<span class="val">' + score.right + '/' + score.total + '</span></span>'
        : '<span class="side-score">共 ' + count + ' 题</span>';

      html += '<div class="side-chapter">';
      html += '  <button type="button" class="side-chapter-head' + (item.id === state.id ? ' is-open' : '') +
        '" data-item="' + item.id + '">';
      html += '    <span class="ch-no">' + esc(shortLabel(item)) + '</span>';
      html += '    <span class="ch-name">' + esc(cleanTitle(item)) + '</span>';
      html += '  </button>';
      html += '  <div class="side-sections" style="display:block">' + scoreHtml + '</div>';
      html += '</div>';
    });
    sideList.innerHTML = html;

    sideList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-item]');
      if (!btn) { return; }
      select(btn.getAttribute('data-item'));
    });
  }

  /* 给章节/试卷取一个短标签，用于列表左侧的小方块 */
  function shortLabel(item) {
    if (item.labelChar) { return item.labelChar; }
    var m = String(item.title).match(/^(第\d+章|模拟卷（[一二三四五六七]）)/);
    if (m) {
      if (m[1].length <= 3) { return m[1]; }
      return m[1].replace('模拟卷（', '').replace('）', '') + '卷';
    }
    return '卷';
  }

  /* 列表里显示的标题：去掉前缀，避免过长 */
  function cleanTitle(item) {
    return String(item.title).replace(/^第\d+章\s*/, '').replace(/^综合模拟试卷/, '模拟卷');
  }

  /* ====================================================================
     二、右侧内容渲染
     ==================================================================== */
  function select(id) {
    state.id = id;
    $$('[data-item]').forEach(function (b) {
      b.classList.toggle('is-open', b.getAttribute('data-item') === id);
    });
    renderContent();
  }

  function currentItem() {
    return currentList().filter(function (i) { return i.id === state.id; })[0];
  }

  function renderContent() {
    var item = currentItem();
    if (!item) { return; }

    // 试卷需要展示「试卷说明」
    pageHead.innerHTML = '' +
      '<div class="eyebrow">' + eyebrowOf() + '</div>' +
      '<h1>' + esc(item.title) + '</h1>' +
      '<p>' + (item.desc ? esc(item.desc) : chapterDesc(item)) + '</p>';

    var html = '';
    var total = 0;
    item.groups.forEach(function (g) { total += g.questions.length; });
    html += '<div class="badge badge-brand" style="margin-bottom:18px">共 ' + total +
      ' 题 · 覆盖 ' + item.groups.map(function (g) { return TYPE_LABEL[g.type] || '题目'; }).join('、') + '</div>';

    item.groups.forEach(function (g) {
      html += renderGroup(g, item.id);
    });

    contentBox.innerHTML = html;
    contentBox.classList.add('fade-up');
    setTimeout(function () { contentBox.classList.remove('fade-up'); }, 400);
    bindContent();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function chapterDesc(item) {
    var ch = (window.KNOWLEDGE_DATA || []).filter(function (c) { return c.id === item.id; })[0];
    return ch && ch.desc ? ch.desc : '本页习题与左侧知识点章节一一对应，学完一章即可刷对应章节的题目。';
  }

  /* ------------------------------------------------------- 渲染一个题组 */
  function renderGroup(g, itemId) {
    var n = g.questions.length;
    var h = '';
    h += '<section class="qgroup" data-group="' + g.id + '" data-type="' + g.type + '">';
    h += '  <div class="qgroup-head">';
    h += '    <h3>' + esc(g.title) + '</h3>';
    h += '    <span class="qgroup-count">共 ' + n + ' 题</span>';
    h += '    <div class="qgroup-tools">';
    h += '      <button type="button" class="btn btn-sm" data-toggle-all>展开全部答案</button>';
    h += '      <button type="button" class="btn btn-sm btn-ghost" data-reset>重做</button>';
    h += '      <button type="button" class="btn btn-sm btn-primary" data-submit>提交并计分</button>';
    h += '    </div>';
    h += '  </div>';
    h += '  <div class="score-box" data-score-box>';
    h += '    <span class="score-num" data-score-num>0/0</span>';
    h += '    <span class="score-txt" data-score-txt></span>';
    h += '    <span class="score-bar"><i data-score-bar></i></span>';
    h += '  </div>';
    h += '  <div class="questions">';

    g.questions.forEach(function (q, i) {
      h += renderQuestion(q, g, i);
    });

    h += '  </div>';
    h += '</section>';
    return h;
  }

  /* ------------------------------------------------------- 渲染一道题目 */
  function renderQuestion(q, g, index) {
    var type = g.type;
    var h = '';
    var qid = q.id || (g.id + '-q' + (index + 1));
    /* 选择题的正确答案存在 answer 字段，这里统一成数组方便处理 */
    var ansArr = (q.answers && q.answers.length) ? q.answers : (q.answer ? [q.answer] : []);

    h += '<article class="question" data-qid="' + qid + '" data-type="' + type + '"' +
      (q.answer ? ' data-answer="' + esc(q.answer) + '"' : '') +
      ' data-answers="' + esc(JSON.stringify(q.answers && q.answers.length ? q.answers : (q.answer ? [q.answer] : []))) + '">';

    h += '  <div class="question-head">';
    h += '    <span class="q-no">' + (index + 1) + '</span>';
    h += '    <div class="q-stem">';
    h += '      <div class="q-text">' + formatStem(q.stem) + '</div>';
    h += '    </div>';
    h += '  </div>';

    /* 题目自带的程序代码 */
    if (q.code) {
      h += CODE({ title: '程序代码', lang: 'c', code: q.code });
    }

    /* ---------------- 选择题 ---------------- */
    if (type === 'choice') {
      h += '<div class="options">';
      (q.options || []).forEach(function (opt) {
        h += '<label class="option" data-key="' + esc(opt.key) + '">';
        h += '  <input type="radio" name="' + qid + '" value="' + esc(opt.key) + '">';
        h += '  <span class="opt-key">' + esc(opt.key) + '．</span>';
        h += '  <span class="opt-text">' + esc(opt.text) + '</span>';
        h += '</label>';
      });
      h += '</div>';
    }

    /* ---------------- 填空题 ---------------- */
    if (type === 'fill') {
      h += '<div class="blanks">';
      var blanks = Math.max(1, (q.answers || []).length);
      for (var i = 0; i < blanks; i++) {
        h += '<div class="blank-row">';
        h += '  <span class="blank-label">第' + (i + 1) + '空</span>';
        h += '  <input type="text" class="blank-input" data-blank="' + i + '" placeholder="在此输入答案">';
        h += '</div>';
      }
      h += '</div>';
    }

    /* ------------- 阅读 / 编程 / 改错：作答框 ------------- */
    if (type !== 'choice' && type !== 'fill') {
      var ph = type === 'read' ? '在此写出程序的运行结果（运算答案）…'
        : (type === 'fix' ? '写出需要修改的语句…' : '在此写出你的程序思路或代码…');
      if (type === 'read') {
        h += '<div class="answer-label">✍ 写出运算答案<span class="answer-label-sub">（即程序运行后输出的结果）</span></div>';
      }
      h += '<textarea class="answer-area" data-input placeholder="' + esc(ph) + '"></textarea>';
    }

    /* ---------------- 参考答案面板（所有题型都提供） ---------------- */
    var toggleText = (type === 'read' || type === 'fix' || type === 'code')
      ? (type === 'read' ? '显示运算答案' : '写完后再看参考答案')
      : '展开参考答案';
    h += '  <div class="q-tools">';
    h += '    <button type="button" class="btn btn-sm btn-soft" data-toggle-answer>' + toggleText + '</button>';
    h += '    <span class="q-meta" data-judge></span>';
    h += '  </div>';

    h += '  <div class="answer-panel" data-answer-panel>';
    h += '    <div class="ans-title">' + (type === 'choice' ? '正确答案与解析' : (type === 'read' ? '运行结果（运算答案）' : '参考答案')) + '</div>';
    h += renderAnswerBody(q, ansArr, type);
    if (q.analysis) {
      h += '    <div class="ans-analysis">' + formatStem(q.analysis) + '</div>';
    }
    h += '  </div>';

    h += '</article>';
    return h;
  }

  /* 参考答案正文 */
  function renderAnswerBody(q, ansArr, type) {
    var list = (ansArr || []).filter(function (x) { return x !== '' && x != null; });

    if (!list.length) {
      return '<div class="ans-analysis">本题暂无参考答案（编程／改错类题目可自行对照思路检查）。</div>';
    }

    // 选择题：只显示正确答案选项号
    if (type === 'choice') {
      return '<div>正确答案：<span class="ans-value">' + esc(list[0]) +
        '</span>' + (q.analysis ? '' : '') + '</div>';
    }

    var body = '';
    list.forEach(function (a, i) {
      // 参考代码较长时用代码块展示
      if (a.length > 60 || /\{[\s\S]*\}/.test(a)) {
        body += CODE({ title: list.length > 1 ? ('参考代码 ' + (i + 1)) : '参考代码', lang: 'c', code: a });
      } else if (list.length === 1 && type !== 'fill') {
        body += '<div>参考答案：<span class="ans-value">' + esc(a) + '</span></div>';
      } else {
        body += '<div>第' + (i + 1) + '空：<span class="ans-value">' + esc(a) + '</span></div>';
      }
    });
    return body;
  }

  /* 题干格式化：支持换行、行内代码 `x`、以及换行分段 */
  function formatStem(text) {
    var t = esc(String(text == null ? '' : text));
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\n/g, '<br>');
    return t;
  }

  /* ====================================================================
     三、交互绑定
     ==================================================================== */
  function bindContent() {
    $$('.qgroup', contentBox).forEach(function (group) {
      var submitBtn = group.querySelector('[data-submit]');
      var resetBtn = group.querySelector('[data-reset]');
      var toggleAll = group.querySelector('[data-toggle-all]');

      submitBtn.addEventListener('click', function () { submit(group); });
      resetBtn.addEventListener('click', function () { reset(group); });
      toggleAll.addEventListener('click', function () { toggleAllAnswers(group); });

      // 单题「展开参考答案」
      group.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-toggle-answer]');
        if (!btn) { return; }
        var q = btn.closest('.question');
        var panel = q.querySelector('[data-answer-panel]');
        var open = panel.classList.toggle('is-open');
        btn.textContent = open ? '收起参考答案' : '展开参考答案';
      });

      // 选择题：选中后即时判分（无需点提交即可看到对错）
      group.addEventListener('change', function (e) {
        var input = e.target.closest('input[type=radio]');
        if (!input) { return; }
        var q = input.closest('.question');
        if (!q || q.getAttribute('data-type') !== 'choice') { return; }
        if (q.getAttribute('data-submitted') === '1') { return; }  // 已交卷锁定
        judgeChoice(q, input);
      });
    });
  }

  /* 选择题即时判分：选中即标出对错，并提示正确答案 */
  function judgeChoice(q, picked) {
    var answer = q.getAttribute('data-answer') || '';
    var ok = !!picked && picked.value === answer;

    // 先清除上一次标记，再重新标记（允许改选后重新判分）
    q.querySelectorAll('.option').forEach(function (opt) {
      opt.classList.remove('is-correct', 'is-wrong');
    });
    q.querySelectorAll('.option').forEach(function (opt) {
      var key = opt.getAttribute('data-key');
      if (key === answer) { opt.classList.add('is-correct'); }
      if (picked && key === picked.value && key !== answer) { opt.classList.add('is-wrong'); }
    });

    var judge = q.querySelector('[data-judge]');
    if (judge) {
      if (ok) {
        judge.className = 'judge-mark ok';
        judge.textContent = '✓ 回答正确';
      } else {
        judge.className = 'judge-mark err';
        judge.textContent = '✗ 回答错误，正确答案：' + answer;
      }
    }
  }

  function toggleAllAnswers(group) {
    var panels = $$('[data-answer-panel]', group);
    var anyClosed = panels.some(function (p) { return !p.classList.contains('is-open'); });
    panels.forEach(function (p) { p.classList.toggle('is-open', anyClosed); });
    $$('[data-toggle-answer]', group).forEach(function (b) {
      b.textContent = anyClosed ? '收起参考答案' : '展开参考答案';
    });
    group.querySelector('[data-toggle-all]').textContent = anyClosed ? '收起全部答案' : '展开全部答案';
  }

  /* ------------------------------------------------------------ 提交判分 */
  function submit(group) {
    var type = group.getAttribute('data-type');
    var questions = $$('.question', group);
    var right = 0, total = 0;

    questions.forEach(function (q) {
      var judge = q.querySelector('[data-judge]');
      var ok = null;

      if (type === 'choice') {
        var picked = q.querySelector('input[type=radio]:checked');
        var answer = q.getAttribute('data-answer') || '';
        ok = !!picked && picked.value === answer;
        total++;
        if (ok) { right++; }
        // 锁定选项并标出对错
        q.setAttribute('data-submitted', '1');
        $$('.option', q).forEach(function (opt) {
          var key = opt.getAttribute('data-key');
          opt.classList.add('is-locked');
          var input = opt.querySelector('input');
          if (input) { input.disabled = true; }
          if (key === answer) { opt.classList.add('is-correct'); }
          if (picked && key === picked.value && key !== answer) { opt.classList.add('is-wrong'); }
        });
        // 提交后自动展开该题的答案解析，方便对照
        var panel = q.querySelector('[data-answer-panel]');
        if (panel) {
          panel.classList.add('is-open');
          var tb = q.querySelector('[data-toggle-answer]');
          if (tb) { tb.textContent = '收起参考答案'; }
        }
      } else if (type === 'fill') {
        total++;
        var inputs = $$('[data-blank]', q);
        var blanksOk = true;
        inputs.forEach(function (input, i) {
          var target = answersOf(q, i);
          var good = target.some(function (t) { return norm(t) === norm(input.value); });
          input.disabled = true;
          input.classList.add(good ? 'is-correct' : 'is-wrong');
          if (!good) { blanksOk = false; }
        });
        ok = blanksOk;
        if (ok) { right++; }
        q.querySelector('[data-answer-panel]').classList.add('is-open');
      } else {
        // 阅读题、编程题、改错题：写出答案后自动对照（长代码只提示自行对照）
        var text = q.querySelector('[data-input]');
        var ans = answersOf(q, 0);
        var isLongCode = ans.some(function (a) { return a.length > 60; }) || !ans.length;
        if (isLongCode) {
          ok = null;
        } else {
          total++;
          ok = ans.some(function (a) { return norm(a) === norm(text ? text.value : ''); });
          if (ok) { right++; }
        }
        if (text) { text.readOnly = true; }
      }

      // 结果标记
      if (judge) {
        if (ok === true) {
          judge.className = 'judge-mark ok';
          judge.textContent = '✓ 正确';
        } else if (ok === false) {
          judge.className = 'judge-mark err';
          judge.textContent = '✗ 错误';
        } else {
          judge.className = 'judge-mark';
          judge.textContent = '请对照参考答案自评';
        }
      }
    });

    showScore(group, right, total);
  }

  /* 取某空的正确答案（支持用 | 分隔多个可接受答案） */
  function answersOf(q, index) {
    var panelText = '';
    var ansList = [];
    // 从答案面板里解析（数据写入 DOM 时是渲染好的，这里直接取数据不现实）
    // 因此改为：优先用 data-answers 属性；没有则用答案面板中的 ans-value 文本
    var raw = q.getAttribute('data-answers');
    if (raw) {
      try { ansList = JSON.parse(raw); } catch (e) { ansList = [raw]; }
    }
    if (!ansList.length) {
      $$('.ans-value', q).forEach(function (el) { ansList.push(el.textContent); });
    }
    if (!ansList.length) { return ['']; }
    var target = ansList[index] != null ? ansList[index] : ansList[0];
    return String(target).split(/\s*[|｜]\s*/).filter(function (s) { return s !== ''; });
  }

  /* 显示得分 */
  function showScore(group, right, total) {
    var box = group.querySelector('[data-score-box]');
    var num = group.querySelector('[data-score-num]');
    var txt = group.querySelector('[data-score-txt]');
    var bar = group.querySelector('[data-score-bar]');

    box.classList.add('is-show');

    if (!total) {
      num.textContent = '—';
      txt.textContent = '本组题目为编程/改错类，请对照参考答案自行评估。';
      bar.style.width = '0%';
      return;
    }

    var pct = Math.round(right / total * 100);
    num.textContent = right + '/' + total;
    txt.textContent = '正确率 ' + pct + '%　' +
      (pct >= 90 ? '非常棒，这一章可以过了！' :
        pct >= 60 ? '基本掌握，错题建议回看知识点。' :
          '还需加强，建议先复习对应章节知识点。');
    bar.style.width = pct + '%';

    // 记录成绩
    var item = currentItem();
    if (item) { Store.set('score:' + item.id, { right: right, total: total, at: Date.now() }); }
  }

  /* ------------------------------------------------------------ 重做 */
  function reset(group) {
    group.querySelectorAll('input[type=radio]').forEach(function (i) {
      i.checked = false; i.disabled = false;
    });
    group.querySelectorAll('.option').forEach(function (o) {
      o.classList.remove('is-correct', 'is-wrong', 'is-locked');
    });
    group.querySelectorAll('.blank-input').forEach(function (i) {
      i.value = ''; i.disabled = false;
      i.classList.remove('is-correct', 'is-wrong');
    });
    group.querySelectorAll('[data-input]').forEach(function (t) {
      t.value = ''; t.readOnly = false;
    });
    group.querySelectorAll('[data-answer-panel]').forEach(function (p) {
      p.classList.remove('is-open');
    });
    group.querySelectorAll('[data-toggle-answer]').forEach(function (b) {
      b.textContent = '展开参考答案';
    });
    group.querySelectorAll('[data-judge]').forEach(function (j) {
      j.className = 'q-meta'; j.textContent = '';
    });
    group.querySelectorAll('.question[data-submitted]').forEach(function (q) {
      q.removeAttribute('data-submitted');
    });
    group.querySelector('[data-score-box]').classList.remove('is-show');
    var t = group.querySelector('[data-toggle-all]');
    if (t) { t.textContent = '展开全部答案'; }
  }

  /* ------------------------------------------------------- 文本标准化 */
  function norm(s) {
    return String(s == null ? '' : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')                       // 去掉所有空白
      .replace(/[；;]/g, ';')
      .replace(/[，,]/g, ',')
      .replace(/[。．]/g, '.')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .replace(/[“”"]/g, '"')
      .replace(/[‘’']/g, "'")
      .replace(/[：]/g, ':');
  }

  /* ====================================================================
     四、板块切换
     ==================================================================== */
  function initTabs() {
    $$('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-tab');
        if (mode === state.mode) { return; }
        state.mode = mode;
        $$('[data-tab]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        var list = currentList();
        state.id = list.length ? list[0].id : null;
        buildSidebar();
        renderContent();
      });
    });
  }

  /* ------------------------------------------------------------- 启动 */
  function init() {
    sideList = $('[data-side-list]');
    sideTitle = $('[data-side-title]');
    contentBox = $('[data-practice-content]');
    pageHead = $('[data-page-head]');
    if (!sideList || !contentBox) { return; }

    // 侧边列表点击：所有板块（章节/试卷/专项）统一用 data-item 选择
    sideList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-item]');
      if (!btn) { return; }
      select(btn.getAttribute('data-item'));
    });

    if (!DATA.chapters.length && !DATA.papers.length && !DATA.specials.length) {
      contentBox.innerHTML = '<div class="empty-state"><h3>还没有题库数据</h3>' +
        '<p>请在 <code>js/data/practice-data.js</code> 中添加题目。</p></div>';
      return;
    }

    initTabs();

    var list = currentList();
    state.id = list.length ? list[0].id : null;
    buildSidebar();
    renderContent();

    // 移动端「目录」按钮
    var toggle = $('[data-sidebar-toggle]');
    if (toggle) { toggle.hidden = false; }

    // 支持 ?mode=papers / ?mode=specials 直接进入对应板块
    var m = location.search.match(/mode=(\w+)/);
    if (m && (m[1] === 'papers' || m[1] === 'specials')) {
      var btn = $('[data-tab="' + m[1] + '"]');
      if (btn) { btn.click(); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
