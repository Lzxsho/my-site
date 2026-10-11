/* ==========================================================================
   gate.js —— 进站身份门
   --------------------------------------------------------------------------
   进站先选身份，选完再进：
     ┌──────────────────────────────────────────┐
     │   欢迎来到朔的小窝                         │
     │   你是谁？—— 选一个门进去（随时可以换）      │
     │   [ 🗝 管理员进入 ]  登录管理员账号，管理整站  │
     │   [ 💬 访客登录 / 注册 ] 留言、练习记录跟账号  │
     │   [ 👀 随便看看 ]    不登录，只读浏览         │
     └──────────────────────────────────────────┘

   ▍规则（都很简单）
     · 每次新开浏览器 / 新标签会话，第一次进站弹一次；
       选完记住（sessionStorage），本次会话内跳页不再弹。
     · 选「管理员」或「访客」→ 打开 Auth 登录卡片；登录成功（auth:change）
       自动关门放行。半路把登录卡片关了 → 门还挡着，可以再选。
     · 选「随便看看」→ 直接放行，本次会话不再打扰。
     · 想换身份：点页面最顶上那条身份条 / 右上角徽章，随时登录 / 退出。

   ▍为什么存 sessionStorage 不存 localStorage？
     用户原话：「跳转掉登录，干脆进门前先选身份」——
     关掉浏览器再开就要重新过门，正合这个意思；
     而 localStorage 会记住几周，就失去「进门」的仪式感了。
   ========================================================================== */

const Gate = {

  /* 本次会话的选择：'peek' 随便看看 / 'admin' / 'user' 已登录进门 */
  KEY: 'shuoscape_gate',

  built: false,

  init() {
    if (this.choice()) { return; }        /* 本会话已经选过，不打扰 */
    this.build();
    this.show();
  },

  choice() {
    try { return sessionStorage.getItem(this.KEY) || ''; } catch (e) { return ''; }
  },
  remember(v) {
    try { sessionStorage.setItem(this.KEY, v); } catch (e) { /* 禁存储就每次都问 */ }
  },

  /* ---------- 搭门 ---------- */
  build() {
    if (this.built) { return; }
    this.built = true;

    const el = document.createElement('div');
    el.className = 'gate';
    el.id = 'gate';
    el.innerHTML =
      '<div class="gate__panel" role="dialog" aria-modal="true" aria-label="选择身份进入">' +

        '<div class="gate__brand">' +
          '<span class="gate__avatar" aria-hidden="true">朔</span>' +
          '<span class="gate__brandtext"><b>朔的小窝</b>' +
          '<i>Shuoscape · Undefined, still becoming.</i></span>' +
        '</div>' +

        '<h2 class="gate__title">你要以什么身份进来？</h2>' +
        '<p class="gate__desc">选一扇门 —— 进去之后随时可以换身份。</p>' +

        '<div class="gate__doors">' +

          '<button class="gate__door" type="button" data-gate="admin">' +
            '<span class="gate__door-ico" aria-hidden="true">🗝️</span>' +
            '<span class="gate__door-name">管理员进入</span>' +
            '<span class="gate__door-sub">登录管理员账号 · 管理整个小窝</span>' +
          '</button>' +

          '<button class="gate__door" type="button" data-gate="user">' +
            '<span class="gate__door-ico" aria-hidden="true">💬</span>' +
            '<span class="gate__door-name">访客登录 / 注册</span>' +
            '<span class="gate__door-sub">留言、练习记录跟着账号走</span>' +
          '</button>' +

          '<button class="gate__door gate__door--soft" type="button" data-gate="peek">' +
            '<span class="gate__door-ico" aria-hidden="true">👀</span>' +
            '<span class="gate__door-name">随便看看</span>' +
            '<span class="gate__door-sub">不登录，只读浏览</span>' +
          '</button>' +

        '</div>' +

        '<p class="gate__note">内容对所有人公开可读 —— 门只决定你能做什么，不妨碍你看什么。</p>' +
      '</div>';

    document.body.appendChild(el);
    this.el = el;

    const self = this;
    el.querySelectorAll('[data-gate]').forEach(function (btn) {
      btn.addEventListener('click', function () { self.pick(btn.getAttribute('data-gate')); });
    });

    /* 登录成功（Auth.apply 广播）→ 关门放行 */
    document.addEventListener('auth:change', function (e) {
      const role = e.detail && e.detail.role;
      if (role === 'admin' || role === 'user') {
        self.remember(role);
        self.close();
      }
    });
    /* 登录卡片被关掉但人还没登进去 → 门重新挡上（还没选完呢） */
    document.addEventListener('auth:modal-closed', function () {
      self.onAuthClosed();
    });
  },

  /* ---------- 选门 ---------- */
  pick(which) {
    if (which === 'peek') {
      this.remember('peek');
      this.close();
      if (window.App && App.toast) { App.toast('已进入 —— 想留言 / 管理的话，点最顶上那条身份条登录'); }
      return;
    }
    /* 管理员 / 访客：都去登录卡片。门暂时让位，登录成功 auth:change 会关门；
       登录卡片关掉时 auth:modal-closed 会把门请回来。 */
    this.el.classList.add('is-behind');
    if (window.Auth && Auth.open) { Auth.open(which === 'admin' ? 'login' : 'login'); }
  },

  /* Auth 关闭登录卡片时通知门（auth.js 的 close() 会派发） */
  onAuthClosed() {
    if (!this.el || !this.el.classList.contains('is-open')) { return; }
    if (window.Auth && Auth.isLogin()) { return; }   /* 已经登进去了，auth:change 会处理 */
    this.el.classList.remove('is-behind');
  },

  show() {
    if (!this.el) { this.build(); }
    this.el.classList.add('is-open');
    document.body.classList.add('gate-locked');
  },

  close() {
    if (!this.el) { return; }
    this.el.classList.remove('is-open', 'is-behind');
    document.body.classList.remove('gate-locked');
  }
};

window.Gate = Gate;

document.addEventListener('DOMContentLoaded', function () {
  /* Auth 先初始化（auth.js 先注册的 DOMContentLoaded），门再上 */
  Gate.init();
});
