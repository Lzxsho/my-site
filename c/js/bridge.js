/* ==========================================================================
   bridge.js —— C 站 ↔ 主站 的「管道」（只做联动，不改两边的功能代码）
   --------------------------------------------------------------------------
   ▍为什么需要它
     c/ 这个站本来是独立的一套（自己的明暗开关、自己的 localStorage 钥匙）。
     现在它挂着「朔的小窝 · 学习 · C 语言」这块牌子，
     那在主站切了深色，走过来还亮着就很怪 —— 反过来也一样。
     两边各管一半会出现「主页是夜里的、做题页是大白天的」，所以在这里把它们拧一致。

   ▍具体做三件事
     ① 进站对齐：主站选了什么模式，这里就跟着（首次默认值也跟着主站）
     ② 在 C 站里改了明暗 / 配色 → 记回主站钥匙，下次打开主站也是同样模式
     ③ 主站那边的 localStorage 被改了（比如在别的页面切过），这里也能跟上

   ▍实现方式说明（方便以后改动）
     C 站切换明暗时会 dispatch 一个 'themechange' 事件（见 js/theme.js），
     所以我们不用去扒它的内部函数，听这个事件就够了 ——
     它自己怎么升级都不影响这里。
     反向用一个 MutationObserver 盯着 body 的 class：主站 Theme 只改 class，
     盯 class 也就不用依赖它什么时候、以什么方式被调用。
   ========================================================================== */

(function (window, document) {
  'use strict';

  /* main.js 没加载成功就不折腾 —— 桥接是锦上添花，不能反过来把页面搞挂 */
  if (typeof window.App === 'undefined') { return; }

  var MAIN_KEY = 'shuoscape_theme';   /* 主站用的钥匙（js/main.js 的 Theme.KEY） */
  var C_KEY = 'c-site-theme';         /* C 站自己用的钥匙（js/theme.js） */

  var html = document.documentElement;
  var body = document.body;

  function read(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* 隐私模式写不了就算了 */ }
  }

  function isDark() { return html.getAttribute('data-theme') === 'dark'; }

  /* 把 C 站自己的显示切到某个模式（不碰它的外观面板，它监听自己的属性变化） */
  function paint(mode) {
    var want = mode === 'dark' ? 'dark' : 'light';
    if (isDark() === (want === 'dark')) { return; }
    html.setAttribute('data-theme', want);
    write(C_KEY, want);
  }

  /* ------------------------------------------------------------------
     ① 进站对齐：以主站的选择为准
     ------------------------------------------------------------------
     主站 Theme.init() 已经按 shuoscape_theme 给 body 加/去 theme-dark 了，
     这里只是让 C 站这段 DOM 跟着换皮肤（它认的是 html[data-theme]）。 */
  paint(read(MAIN_KEY, 'light'));

  /* ------------------------------------------------------------------
     ② 在 C 站点了明暗 → 记回主站
     ------------------------------------------------------------------
     themechange 是 js/theme.js 自己抛的，明暗和配色切换都会走这里。 */
  document.addEventListener('themechange', function (e) {
    var mode = (e && e.detail && e.detail.theme) ? e.detail.theme : (isDark() ? 'dark' : 'light');
    write(MAIN_KEY, mode);
    /* 同步主站那套（body.theme-dark），这样身份条、登录框也一起变 */
    if (typeof window.Theme !== 'undefined' && window.Theme.apply) {
      window.Theme.apply(mode);
    }
  });

  /* ------------------------------------------------------------------
     ③ 主站那边改了（别的页面切过），这里跟上
     ------------------------------------------------------------------
     只盯 body 的 class 变化就够了：主站 Theme.apply 只改这一个地方。 */
  if (typeof MutationObserver !== 'undefined') {
    var quiet = false;   /* 自己写回去的时候别再触发一轮，免得来回打乒乓 */

    new MutationObserver(function () {
      if (quiet) { return; }
      var mode = body.classList.contains('theme-dark') ? 'dark' : 'light';
      quiet = true;
      paint(mode);
      write(MAIN_KEY, mode);
      quiet = false;
    }).observe(body, { attributes: true, attributeFilter: ['class'] });
  }

  /* ------------------------------------------------------------------
     ④ 身份条落位
     ------------------------------------------------------------------
     主站的身份条是 position:fixed 顶在最上面的，
     C 站的顶部导航（.site-header / .site-top）也是 fixed，
     两边会叠在一起。位移交给 css/bridge.css 里的 has-adminbar 那段，
     这里只负责在身份条真的插进来之后补上个标记（幂等，重复调用无副作用）。 */
  var OB = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(function () {
        if (document.querySelector('.adminbar')) {
          body.classList.add('has-sitebar');
          OB.disconnect();
        }
      })
    : null;
  if (OB) {
    OB.observe(body, { childList: true });
  }
  /* 已经在了就直接打标（比如脚本加载顺序让身份条先出现的情况） */
  if (document.querySelector('.adminbar')) { body.classList.add('has-sitebar'); }

}(window, document));
