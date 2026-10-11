/* ==========================================================================
   boot.js —— 进首页时的一点「仪式感」
   --------------------------------------------------------------------------
   两样东西，都是锦上添花，不做也不影响任何功能：

   ① 编译中动画（只有首页有）
      页面刚打开时，飘出一小块终端，敲一行当前语言的编译命令：
        C      → gcc main.c -o shuoscape
        Java   → javac Main.java
        Python → python3 site.py
        没选语言 → node server.js
      大约 1.4 秒后自己淡出消失。

      三条底线：
        · 不阻塞渲染 —— 它是页面画完之后才插进去的一小块，不挡任何东西
        · 不抢交互 —— pointer-events:none，点在它上面等同点空地
        · 说停就停 —— 系统开了「减少动态效果」就完全不出现

   ② 控制台彩蛋
      F12 打开控制台能看到一个 ASCII 版的 Shuoscape。
      不管动效开不开都有 —— 它只是几行日志。
   ========================================================================== */

const Boot = {

  /* 每种语言对应的「编译命令」 */
  CMDS: {
    c:      'gcc main.c -o shuoscape',
    java:   'javac Main.java',
    python: 'python3 site.py'
  },

  init() {
    this.consoleEgg();
    this.compileCard();
  },

  /* ------------------------------------------------------------------
     ① 编译中动画
     ------------------------------------------------------------------ */
  compileCard() {
    /* 系统开了「减少动态效果」：不播 */
    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { return; }

    /* 当前语言：代码雨关着就是空，那时敲 node server.js */
    const lang = (typeof CodeFX !== 'undefined' && CodeFX.lang) || '';
    const cmd = this.CMDS[lang] || 'node server.js';

    const box = document.createElement('div');
    box.className = 'boot-compile';
    box.setAttribute('aria-hidden', 'true');   /* 纯装饰，别让读屏念出来 */
    box.innerHTML =
      '<span class="boot-compile__dots"><i></i><i></i><i></i></span>' +
      '<code class="boot-compile__cmd"><span class="boot-compile__tag">' +
        (lang ? lang.toUpperCase() : 'NODE') + '</span> ' + cmd + '</code>';

    document.body.appendChild(box);

    /* 让它先以「透明」存在一帧，下一帧再点亮 —— 否则没有淡入的过程 */
    requestAnimationFrame(function () { box.classList.add('is-in'); });

    /* 1.4 秒后淡出，淡完把节点删掉，不留垃圾 */
    setTimeout(function () {
      box.classList.remove('is-in');
      box.classList.add('is-out');
      setTimeout(function () { box.remove(); }, 500);
    }, 1400);
  },

  /* ------------------------------------------------------------------
     ② 控制台彩蛋
     ------------------------------------------------------------------ */
  consoleEgg() {
    const art = [
      '  ____  _                             _          ',
      ' / ___|| |__  _   _  ___   ___  __ _| |_  ___   ',
      ' \\___ \\| \'_ \\| | | |/ _ \\ / __|/ _` | __|/ _ \\  ',
      '  ___) | | | | |_| | (_) |\\__ \\ (_| | |_|  __/  ',
      ' |____/|_| |_|\\__,_|\\___/ |___/\\__,_|\\__|\\___|  '
    ].join('\n');

    console.log('%c' + art, 'color:#c3a4ff;font-weight:700;');
    console.log('%c// 谢谢你打开控制台 —— 朔', 'color:#8b85a1;');
    console.log('%c// 这个站是纯 HTML/CSS/JavaScript 手写的：没有打包工具，也没有第三方库。',
      'color:#b6b1c6;');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  Boot.init();
});
