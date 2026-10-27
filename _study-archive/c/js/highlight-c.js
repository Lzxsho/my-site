/* ==========================================================================
   highlight-c.js —— 轻量级 C 语言语法高亮（零依赖，离线可用）
   --------------------------------------------------------------------------
   为什么自己写而不用 highlight.js 之类的库？
   因为本网站要求「双击 HTML 就能跑」，如果引用 CDN，一旦断网代码块就没颜色了。
   这里用一个正则把代码切成若干 token，再套上 <span class="tok-xxx">。

   对外暴露：window.highlightC(code) → 返回高亮后的 HTML 字符串
   ========================================================================== */
(function (window) {
  'use strict';

  /* C 语言关键字 + 常用标准类型 */
  var KEYWORDS = [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline',
    'int', 'long', 'register', 'restrict', 'return', 'short', 'signed',
    'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned',
    'void', 'volatile', 'while', '_Bool', '_Complex', '_Static_assert'
  ].join('|');

  /* 一个「大正则」按优先级依次匹配，捕获组顺序即为优先级顺序：
     1 块注释 → 2 行注释 → 3 预处理指令 → 4 字符串 → 5 字符 → 6 数字 → 7 关键字 → 8 函数名
     说明：注释、字符串必须优先于关键字匹配，否则字符串里的 "int" 会被染成关键字色。 */
  var TOKEN_RE = new RegExp(
    '(\\/\\*[\\s\\S]*?\\*\\/)' +                                   // 1 /* 块注释 */
    '|(\\/\\/[^\\n]*)' +                                           // 2 // 行注释
    '|(^[ \\t]*#[^\\n]*)' +                                        // 3 # 预处理指令（整行）
    '|("(?:\\\\.|[^"\\\\\\n])*")' +                                // 4 字符串字面量
    "|('(?:\\\\.|[^'\\\\\\n])*')" +                                // 5 字符字面量
    '|\\b(0[xX][0-9a-fA-F]+|\\d+\\.\\d*(?:[eE][+-]?\\d+)?|\\.\\d+(?:[eE][+-]?\\d+)?|\\d+(?:[eE][+-]?\\d+)?)[fFlLuU]*\\b' + // 6 数字
    '|\\b(' + KEYWORDS + ')\\b' +                                  // 7 关键字
    '|\\b([A-Za-z_]\\w*)(?=\\s*\\()' +                             // 8 函数名（标识符后紧跟左括号）
    '',
    'gm'
  );

  /* HTML 转义：只处理 & < > 三个字符即可（插入的是元素内容，引号安全） */
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * 高亮 C 代码
   * @param {string} code 原始 C 代码
   * @returns {string} 带 <span class="tok-*"> 的 HTML
   */
  function highlightC(code) {
    if (!code) { return ''; }

    // 第一步：转义。之后的正则都在转义后的文本上跑，
    // 因为 < > 变成实体后不影响注释/字符串/关键字的匹配。
    var text = escapeHtml(String(code));

    return text.replace(TOKEN_RE, function (match, blockCmt, lineCmt, preproc, str, chr, num, keyword, fn) {
      if (blockCmt) { return '<span class="tok-comment">' + match + '</span>'; }
      if (lineCmt)  { return '<span class="tok-comment">' + match + '</span>'; }
      if (preproc)  { return '<span class="tok-preproc">'  + match + '</span>'; }
      if (str)      { return '<span class="tok-string">'   + match + '</span>'; }
      if (chr)      { return '<span class="tok-string">'   + match + '</span>'; }
      if (num)      { return '<span class="tok-number">'   + match + '</span>'; }
      if (keyword)  { return '<span class="tok-keyword">'  + match + '</span>'; }
      if (fn)       { return '<span class="tok-func">'     + match + '</span>'; }
      return match;
    });
  }

  /* 挂到全局，供 knowledge.js / practice.js 使用 */
  window.highlightC = highlightC;
})(window);
