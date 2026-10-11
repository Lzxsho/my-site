/* ==========================================================================
   codefx.js —— 用 C / Java / Python 的「代码」来生成界面装饰
   --------------------------------------------------------------------------
   两样东西：

   ① 代码雨（全站背景，Canvas 画的那种）
      字符取自你选的语言的关键字和符号 —— 选 C 就下 C 的 # * ; { }，
      选 Java 就下 public class 那一套，选 Python 就下 def : self。
      右下角一个小按钮循环切换：关 → C → Java → Python。
      选中的语言记在浏览器里，下次打开还是它。

   ② 终端打字机（谁在页面里放了 <div data-fx-term> 谁就有）
      一块假的终端窗口，轮流把三种语言的 Hello World 敲出来，
      敲完停两秒，换下一种语言。

   ▍性能与体贴
      · 系统「减少动态效果」开着时，代码雨默认不开（想看可以手动开）
      · 切到别的标签页自动暂停，回来接着下
      · 窗口缩放跟着重排，不会糊
   ========================================================================== */

const CodeFX = {

  KEY: 'shuoscape_codefx',          /* 记住选了哪种语言 */

  /* 三种语言的「语法颜色」：雨滴主色 / 雨滴高亮（最前面那颗）/ 名字 */
  LANGS: {
    c:      { name: 'C',      color: '#7aa2ff', head: '#eaf2ff',
              chars: '#include int main()printf return;{}char*&*<->sizeof forifelse whilestruct NULL0123456789' },
    java:   { name: 'Java',   color: '#ff9d5c', head: '#fff1e4',
              chars: 'publicclassstaticvoidmain()String[]new@{};=.extendsinterface trycatchfinally ListMap0123456789<>' },
    python: { name: 'Python', color: '#ffd76b', head: '#fffbe6',
              chars: 'defreturnprint()import:elifwhile TrueFalseNone self.class with[]lambda-_=0123456789#' }
  },
  ORDER: ['c', 'java', 'python'],   /* 切换顺序 */

  lang: '',        /* 当前语言：'' = 关 */
  canvas: null,
  ctx: null,
  timer: null,
  cols: [],        /* 每一列雨的现状 */
  colW: 16,        /* 列宽（像素） */
  fontSize: 14,
  last: 0,

  /* ------------------------------------------------------------------
     启动：读了记忆里的语言，该开就开；按钮无论如何都装上
     ------------------------------------------------------------------ */
  init() {
    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.lang = this.read();
    if (reduced && !this.lang) { this.lang = ''; }   /* 怕晃的人，默认关 */

    this.buildButton();
    if (this.lang) { this.start(this.lang); }
    this.buildTerms();
  },

  read() {
    try { return localStorage.getItem(this.KEY) || ''; } catch (e) { return ''; }
  },
  save() {
    try { localStorage.setItem(this.KEY, this.lang); } catch (e) { /* 存不下就算了 */ }
  },

  /* ------------------------------------------------------------------
     右下角的小按钮：循环切换 关 → C → Java → Python
     ------------------------------------------------------------------ */
  buildButton() {
    const self = this;
    const btn = document.createElement('button');
    btn.className = 'codefx-btn';
    btn.type = 'button';
    btn.innerHTML = '<span class="codefx-btn__icon">&lt;/&gt;</span>' +
                    '<span class="codefx-btn__lang"></span>';
    btn.title = '代码雨：点一下换种语言';
    btn.addEventListener('click', function () { self.cycle(); });
    document.body.appendChild(btn);
    this.btn = btn;
    this.paintButton();
  },

  paintButton() {
    if (!this.btn) { return; }
    const l = this.LANGS[this.lang];
    const name = this.btn.querySelector('.codefx-btn__lang');
    this.btn.classList.toggle('is-on', !!l);
    if (l) {
      name.textContent = l.name;
      name.style.background = l.color;
      this.btn.title = '代码雨：' + l.name + ' —— 点一下换下一种';
    } else {
      name.textContent = '关';
      name.style.background = '';
      this.btn.title = '代码雨：没开 —— 点一下换成 C';
    }
  },

  cycle() {
    const order = [''].concat(this.ORDER);
    const next = order[(order.indexOf(this.lang) + 1) % order.length];
    if (next) { this.start(next); } else { this.stop(); }
    this.lang = next;
    this.save();
    this.paintButton();
  },

  /* ------------------------------------------------------------------
     代码雨本体
     ------------------------------------------------------------------ */
  start(lang) {
    this.stop();
    this.lang = lang;
    const conf = this.LANGS[lang];
    if (!conf) { return; }

    const cv = document.createElement('canvas');
    cv.className = 'codefx-rain';
    document.body.appendChild(cv);
    this.canvas = cv;
    this.ctx = cv.getContext('2d');

    this.resize();
    window.addEventListener('resize', this.onResize = function () { CodeFX.resize(); });

    /* 每列：y 落到哪了、速度、字符池里上次画的下标 */
    const n = Math.ceil(cv.width / this.colW);
    this.cols = [];
    for (let i = 0; i < n; i++) {
      this.cols.push({
        y: Math.random() * -40,                       /* 负数 = 从屏幕上面进来 */
        speed: 0.6 + Math.random() * 0.9,             /* 每帧走几行 */
        ci: (Math.random() * conf.chars.length) | 0
      });
    }

    document.addEventListener('visibilitychange', this.onVis = function () {
      if (document.hidden) { CodeFX.pause(); } else { CodeFX.resume(); }
    });

    this.resume();

    /* 提醒一下内容层：有雨了，把 z-index 抬高，别让雨盖住字 */
    document.body.classList.add('has-codefx');
  },

  stop() {
    this.pause();
    if (this.canvas) { this.canvas.remove(); this.canvas = null; this.ctx = null; }
    if (this.onResize) { window.removeEventListener('resize', this.onResize); this.onResize = null; }
    if (this.onVis) { document.removeEventListener('visibilitychange', this.onVis); this.onVis = null; }
    document.body.classList.remove('has-codefx');
  },

  pause() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  },

  resume() {
    if (this.timer || !this.ctx) { return; }
    const self = this;
    const step = function (ts) {
      self.timer = setTimeout(function () { requestAnimationFrame(step); }, 50);  /* ~20fps，够用且省电 */
      self.frame();
    };
    this.timer = 1;
    requestAnimationFrame(step);
  },

  resize() {
    if (!this.canvas) { return; }
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const n = Math.ceil(this.canvas.width / this.colW);
    while (this.cols.length < n) {
      this.cols.push({ y: Math.random() * -40, speed: 0.6 + Math.random() * 0.9, ci: 0 });
    }
    this.cols.length = n;
  },

  frame() {
    const ctx = this.ctx, cv = this.canvas;
    if (!ctx) { return; }
    const conf = this.LANGS[this.lang];
    if (!conf) { return; }

    /* 拖尾：用「擦掉一层」代替涂背景色，这样画布始终透明，不挡页面自己的背景 */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = this.fontSize + 'px "Consolas", "Courier New", monospace';

    for (let i = 0; i < this.cols.length; i++) {
      const col = this.cols[i];
      const x = i * this.colW + 2;
      const y = col.y * this.fontSize;

      /* 当前字符 */
      const ch = conf.chars.charAt(col.ci);
      col.ci = (col.ci + 1 + ((Math.random() * 3) | 0)) % conf.chars.length;

      /* 普通雨滴 */
      ctx.fillStyle = conf.color;
      ctx.globalAlpha = 0.55;
      ctx.fillText(ch, x, y);

      /* 最前面的那颗更亮更大一点，做出「雨头」 */
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = conf.head;
      ctx.fillText(conf.chars.charAt(col.ci), x, y - this.fontSize);

      col.y += col.speed;
      /* 落出屏幕后，随机从上面某个位置重来，雨才错落有致 */
      if (y > cv.height && Math.random() > 0.975) {
        col.y = Math.random() * -20;
        col.speed = 0.6 + Math.random() * 0.9;
      }
    }
    ctx.globalAlpha = 1;
  },

  /* ------------------------------------------------------------------
     终端打字机：页面里放 <div data-fx-term> 就有
     ------------------------------------------------------------------ */
  buildTerms() {
    const self = this;
    const boxes = document.querySelectorAll('[data-fx-term]');
    boxes.forEach(function (box) {
      if (box.dataset.fxReady === '1') { return; }
      box.dataset.fxReady = '1';

      const code = document.createElement('code');
      const tag = document.createElement('span');
      tag.className = 'codefx-term__lang';
      box.innerHTML = '';
      box.appendChild(tag);
      box.appendChild(code);

      let idx = 0;
      const play = function () {
        const langId = self.ORDER[idx % self.ORDER.length];
        const conf = self.LANGS[langId];
        const text = self.SNIPPETS[langId];
        idx += 1;

        box.className = 'codefx-term codefx-term--' + langId;
        tag.textContent = conf.name;

        let p = 0;
        code.textContent = '';
        (function type() {
          code.textContent = text.slice(0, ++p);
          if (p < text.length) {
            setTimeout(type, 26 + Math.random() * 40);
          } else {
            setTimeout(play, 2600);   /* 敲完歇一会儿，换下一种语言 */
          }
        })();
      };
      play();
    });
  },

  /* 三种语言的「见面礼」，打字机轮着敲 */
  SNIPPETS: {
    c: [
      '#include <stdio.h>',
      'int main(void) {',
      '    printf("hello, shuoscape\\n");',
      '    return 0;',
      '}'
    ].join('\n'),
    java: [
      'public class Shuoscape {',
      '    public static void main(String[] a) {',
      '        System.out.println("hello, shuoscape");',
      '    }',
      '}'
    ].join('\n'),
    python: [
      '# shuoscape.py',
      'def hello(name="shuoscape"):',
      '    print(f"hello, {name}")',
      '',
      'hello()'
    ].join('\n')
  }
};

window.CodeFX = CodeFX;

document.addEventListener('DOMContentLoaded', function () {
  CodeFX.init();
});
