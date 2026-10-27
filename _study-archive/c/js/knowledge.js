/* ==========================================================================
   knowledge.js —— 知识点页面的渲染与交互
   功能：
     1. 根据 knowledge-data.js 的数据自动生成左侧章节目录
     2. 生成正文小节（含代码块、提示框、表格等）
     3. 滚动联动：阅读到哪一节，目录就高亮哪一节
     4. 目录搜索：输入关键词过滤小节
     5. 支持带 #锚点 直接打开某一节（从首页/习题页跳转过来时自动定位）
   ========================================================================== */
(function (window, document) {
  'use strict';

  var $ = window.App.$, $$ = window.App.$$;
  var Store = window.App.Store;
  var CODE = window.App.UI.codeBlock;

  var data = window.KNOWLEDGE_DATA || [];
  var sideList, contentBox;

  /* 每章考点速记（专升本高频考点，作为正文补充） */
  var TIPS = {
    ch01: [
      '一个 C 程序有且只有一个 main 函数，程序从 main 开始、在 main 中结束。',
      'C 程序上机步骤：编辑(.c) → 编译(.obj) → 连接(.exe) → 运行。',
      '每条语句以分号“;”结束；注释用 //（单行）或 /* */（多行），编译时被忽略。',
      'C 区分大小写，关键字（int、if、for…）必须小写；main 不是关键字。'
    ],
    ch02: [
      '基本类型：int、char、float、double；可用 short/long、signed/unsigned 修饰。',
      '整型常量：十进制、八进制(0开头)、十六进制(0x开头)；实型常量默认是 double。',
      '字符按 ASCII 码存储：\'A\'=65、\'a\'=97、\'0\'=48；\'\\0\' 是字符串结束符。',
      '运算符优先级大致：单目 > 算术 > 关系 > 逻辑 > 赋值；整数相除截断小数，% 仅用于整数。'
    ],
    ch03: [
      'printf 常用格式符：%d(整数) %c(字符) %s(字符串) %f(实数)，可加域宽与小数位如 %5.2f。',
      'scanf 用地址 & 取变量地址；连续输入用空格/回车分隔；%c 会读取空白字符。',
      '复合赋值 += -= *= /= 简洁高效；a=b=c 是合法的连续赋值。',
      '单字符用 getchar/putchar；字符串用 puts/gets（gets 不安全，尽量用 fgets）。'
    ],
    ch04: [
      'if-else 阶梯从上往下匹配；else 与“最近的未配对 if”结合（就近原则）。',
      '逻辑短路：a&&b 中若 a 为假则 b 不执行；a||b 中若 a 为真则 b 不执行。',
      '条件表达式 a?b:c 可替代简单 if-else；switch 的 expr 须为整型/字符型，每支记得 break。',
      '常见陷阱：if(a=3) 是“赋值”而非“比较”，条件恒真（应写 if(a==3)）。'
    ],
    ch05: [
      'while 先判断后执行；do-while 先执行后判断（循环体至少执行一次）；for(初值;条件;更新)。',
      'break 跳出整个循环；continue 跳过本次循环剩余语句、进入下一次。',
      '死循环常写 while(1){...} 并在内部用 break 退出。',
      '嵌套循环内外层变量应不同；经典题：累加求和、阶乘、素数判断、九九乘法表。'
    ],
    ch06: [
      '数组下标从 0 开始；a[i] 等价于 *(a+i)，数组名 a 是首元素地址（常量，不能 a++）。',
      '字符串以 \'\\0\' 结束；strlen 不计结束符，sizeof 计；二者易混。',
      '字符串函数：strcpy 拷贝、strcat 连接、strcmp 比较、strlen 求长——头文件 string.h。',
      '二维数组 a[M][N] 共 M×N 个元素，按行优先存储；a[i][j] 是第 i 行第 j 列。'
    ],
    ch07: [
      '函数先定义后可不声明；若在调用前未定义，须写函数原型声明。',
      'C 默认按值传递（形参是实参的拷贝）；数组名作参会退化为指针。',
      '全局变量所有函数共享；static 局部变量只初始化一次并保留值。',
      '递归是函数自己调用自己，必须有出口条件，否则会无限递归。'
    ],
    ch08: [
      '指针变量存放地址：& 取地址、* 间接访问所指内容。',
      '指针指向数组时，p=a、p+i 指向 a[i]、*(a+i) 即 a[i]；p+1 移动“一个元素大小”。',
      '用指针作函数参数，可在函数内修改外部变量、实现“带回多个值”。',
      '指针与数组关系密切但不同：数组名是常量地址，指针是变量，可 p++ 而数组名不能。'
    ],
    ch09: [
      'struct 把不同类型成员聚合在一起；普通变量用 . 访问成员，指针用 -> 访问。',
      'typedef 为已有类型起别名，如 typedef struct{...}S; 后可写 S s;。',
      'union（共用体）各成员共享同一段内存，同一时刻只有一个成员有意义。',
      'enum 枚举常量默认从 0 开始编号；结构体 sizeof 通常 ≥ 各成员字节之和（内存对齐）。'
    ],
    ch10: [
      '用 FILE* 文件指针管理文件；fopen 打开、fclose 关闭，用完务必关闭以刷新缓冲。',
      '打开模式："r"读 "w"写(覆盖) "a"追加 "r+"读写；二进制加 b 如 "rb"/"wb"。',
      '字符读写 fgetc/fputc；格式化读写 fscanf/fprintf；块读写 fread/fwrite。',
      'feof(fp) 判断是否到文件末尾；打开失败返回 NULL，使用前要判空。'
    ]
  };

  /* ---------------------------------------------------- 一、生成左侧目录 */
  function buildSidebar() {
    var html = '';
    html += '<div class="side-util">';
    html += '  <button type="button" class="btn btn-sm btn-ghost" data-expand-all>展开全部</button>';
    html += '  <button type="button" class="btn btn-sm btn-ghost" data-collapse-all>收起全部</button>';
    html += '</div>';
    data.forEach(function (ch) {
      html += '<div class="side-chapter" data-ch="' + ch.id + '">';
      html += '  <button type="button" class="side-chapter-head" data-ch-toggle="' + ch.id + '">';
      html += '    <svg class="caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>';
      html += '    <span class="ch-no">' + ch.no + '</span>';
      html += '    <span class="ch-name">' + escapeAttr(ch.title) + '</span>';
      html += '    <span class="ch-count">' + ch.sections.length + ' 节</span>';
      html += '  </button>';
      html += '  <div class="side-sections">';
      ch.sections.forEach(function (s, si) {
        html += '<a href="#' + s.id + '" data-sec="' + s.id + '" data-text="' +
          escapeAttr(ch.title + ' ' + s.title) + '">' +
          '<span class="sec-no">' + ch.no + '.' + (si + 1) + '</span>' + escapeAttr(s.title) + '</a>';
      });
      html += '  </div>';
      html += '</div>';
    });
    sideList.innerHTML = html;

    /* 点击章节标题：展开 / 收起 */
    sideList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-ch-toggle]');
      if (btn) {
        var box = btn.parentNode;
        box.classList.toggle('is-open');
        Store.set('open-ch-' + btn.getAttribute('data-ch-toggle'), box.classList.contains('is-open'));
        return;
      }
      var ex = e.target.closest('[data-expand-all]');
      var col = e.target.closest('[data-collapse-all]');
      if (ex || col) {
        var open = !!ex;
        $$('.side-chapter', sideList).forEach(function (b) { b.classList.toggle('is-open', open); });
      }
    });

    /* 恢复上次的展开状态（默认展开第一章） */
    data.forEach(function (ch, i) {
      var box = sideList.querySelector('[data-ch="' + ch.id + '"]');
      var saved = Store.get('open-ch-' + ch.id, null);
      var open = saved === null ? i === 0 : saved;
      if (open) { box.classList.add('is-open'); }
    });
  }

  /* -------------------------------------------------------- 二、生成正文 */
  function buildContent() {
    var html = '';
    data.forEach(function (ch) {
      html += '<section class="chapter" id="' + ch.id + '" data-ch="' + ch.id + '">';
      /* 黄冈讲义风：章节封面卡 —— 章节号 + 标题 + 考点清单 + 去练习 */
      html += '  <div class="ch-cover">';
      html += '    <div class="ch-cover-no">' + escapeAttr(ch.no) + '</div>';
      html += '    <div class="ch-cover-main">';
      html += '      <h2>' + escapeAttr(ch.title) + '</h2>';
      if (ch.desc) { html += '      <p class="ch-cover-desc">' + ch.desc + '</p>'; }
      html += '      <div class="ch-cover-points">';
      html += '        <span class="ch-cover-points-label">本章考点</span>';
      ch.sections.forEach(function (s) {
        html += '        <a class="ch-point" href="#' + s.id + '">' + escapeAttr(s.title) + '</a>';
      });
      html += '      </div>';
      html += '      <a class="btn btn-sm btn-soft ch-cover-cta" href="practice.html">本章配套练习 →</a>';
      html += '    </div>';
      html += '  </div>';

      ch.sections.forEach(function (s, si) {
        html += '<div class="k-section" id="' + s.id + '" data-sec="' + s.id + '" data-ch="' + ch.id + '">';
        html += '  <h3><span class="k-sec-no">' + ch.no + '.' + (si + 1) + '</span>' + escapeAttr(s.title) + '</h3>';
        html += s.content ? s.content : defaultPlaceholder(s);
        (s.codes || []).forEach(function (c) {
          html += CODE({ title: c.title, lang: c.lang || 'c', code: c.code });
        });
        html += '</div>';
      });

      /* 本章考点速记（正文补充，提炼高频考点） */
      var tips = TIPS[ch.id];
      if (tips && tips.length) {
        html += '<aside class="k-tips" data-ch="' + ch.id + '">';
        html += '  <div class="k-tips-head">';
        html += '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2.3h6c0-1.1.4-1.8 1-2.3A7 7 0 0012 2z"/></svg>';
        html += '    <span>本章考点速记</span>';
        html += '  </div>';
        html += '  <ul class="k-tips-list">';
        tips.forEach(function (t) { html += '<li>' + escapeAttr(t) + '</li>'; });
        html += '  </ul>';
        html += '  <a class="btn btn-sm btn-soft k-tips-cta" href="practice.html">做本章配套练习 →</a>';
        html += '</aside>';
      }

      html += '</section>';
    });
    contentBox.innerHTML = html;
  }

  /* 小节没有内容时显示的占位框（提醒你在这里粘贴资料） */
  function defaultPlaceholder(s) {
    return '<p class="placeholder-text">【占位区域】这一节还没有内容。' +
      '请在 <code>js/data/knowledge-data.js</code>（或 <code>knowledge-data-2.js</code>）中找到 ' +
      '<code>' + s.id + '</code>，把整理好的知识点粘贴到它的 <code>content</code> 字段里即可，' +
      '需要代码示例就填 <code>codes</code> 字段。</p>';
  }

  /* ------------------------------------------------------ 三、滚动联动 */
  function initScrollSpy() {
    var links = $$('.side-sections a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('data-sec')] = a; });

    var sections = $$('.k-section');
    var current = null;

    function markCurrent(id) {
      if (current === id) { return; }
      current = id;
      links.forEach(function (a) { a.classList.remove('is-current'); });
      var a = map[id];
      if (!a) { return; }
      a.classList.add('is-current');
      // 自动打开所属章节
      var box = a.closest('.side-chapter');
      if (box && !box.classList.contains('is-open')) { box.classList.add('is-open'); }
      // 目录内的元素滚动到可视区
      if (window.innerWidth > 860 && sideList) {
        var top = a.offsetTop - sideList.clientHeight / 2;
        sideList.scrollTo({ top: top, behavior: 'smooth' });
      }
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var visible = entries
          .filter(function (en) { return en.isIntersecting; })
          .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
        if (visible.length) {
          markCurrent(visible[0].target.getAttribute('data-sec'));
        }
      }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

      sections.forEach(function (s) { io.observe(s); });
    }

    // 点击目录链接时立刻高亮
    sideList.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-sec]');
      if (a) { markCurrent(a.getAttribute('data-sec')); }
    });
  }

  /* ------------------------------------------------------ 四、目录搜索 */
  function initSearch() {
    var input = $('[data-side-search]');
    if (!input) { return; }
    var empty = $('[data-side-empty]');

    input.addEventListener('input', window.App.debounce(function () {
      var q = input.value.trim().toLowerCase();
      var hit = 0;
      data.forEach(function (ch) {
        var box = sideList.querySelector('[data-ch="' + ch.id + '"]');
        var any = false;
        ch.sections.forEach(function (s) {
          var a = box.querySelector('[data-sec="' + s.id + '"]');
          var text = (ch.title + ' ' + s.title).toLowerCase();
          var ok = !q || text.indexOf(q) >= 0;
          a.style.display = ok ? '' : 'none';
          if (ok) { any = true; }
        });
        box.style.display = any ? '' : 'none';
        if (q && any) { box.classList.add('is-open'); }
        if (any) { hit++; }
      });
      if (empty) { empty.style.display = hit ? 'none' : 'block'; }
    }, 120));
  }

  /* ------------------------------------- 五、从其它页面带锚点进入时定位 */
  function jumpFromHash() {
    var hash = decodeURIComponent(location.hash || '').replace('#', '');
    if (!hash) { return; }
    var target = document.getElementById(hash);
    if (!target) { return; }
    var ch = target.getAttribute('data-ch');
    var box = sideList.querySelector('[data-ch="' + ch + '"]');
    if (box) { box.classList.add('is-open'); }
    setTimeout(function () {
      var y = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: y, behavior: 'auto' });
    }, 60);
  }

  /* -------------------------------------------------------------- 工具 */
  function escapeAttr(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* -------------------------------------------------------------- 启动 */
  function init() {
    sideList = $('[data-side-list]');
    contentBox = $('[data-knowledge-content]');
    if (!sideList || !contentBox) { return; }

    if (!data.length) {
      contentBox.innerHTML = '<div class="empty-state"><h3>还没有知识点数据</h3>' +
        '<p>请在 <code>js/data/knowledge-data.js</code> 中补充内容。</p></div>';
      return;
    }

    buildSidebar();
    buildContent();
    initScrollSpy();
    initSearch();
    jumpFromHash();

    // 移动端：显示「目录」按钮
    var toggle = $('[data-sidebar-toggle]');
    if (toggle) { toggle.hidden = false; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
