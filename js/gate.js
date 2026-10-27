/* ==========================================================================
   gate.js —— 进站门：登录 / 注册，底部一个「随便看看」
   --------------------------------------------------------------------------
   进站先登录（或者注册一个账号），不想登录就点最下面的「随便看看」：
     ┌──────────────────────────────────────────┐
     │   朔的小窝                                │
     │   欢迎回来。  [ 登录 | 注册 ]              │
     │   邮箱 ________  密码 ________             │
     │   [        登录        ]                  │
     │   ──────────── · 或 · ────────────        │
     │   [ 👀 随便看看 —— 不登录，先逛逛 ]         │
     └──────────────────────────────────────────┘

   ▍为什么没有「管理员进入」了？
     管理员不用特殊对待 —— 你的账号在管理员名单里（js/config.js 的
     adminEmails + supabase.sql 的 admins 表），登录成功自动就是管理员，
     权限、按钮全都自动出现。门上就不用再单摆一扇「管理员门」了。

   ▍表单跟登录卡片是同一套
     Auth.loginAdmin / Auth.signup 接收一个「表单容器」参数（scope），
     门和登录卡片（auth.js 的 modal）用同一批 data-auth-* / data-f-*
     标记 —— 登录逻辑只写一份，两边都能用。

   ▍规则
     · 每次新开浏览器 / 新标签会话，第一次进站弹一次；
       登录成功（auth:change）或选「随便看看」后记住（sessionStorage）。
     · 「随便看看」→ 直接放行，本次会话不再打扰；想登录随时点最顶上的身份条。
     · 登录中出错误提示显示在门里，不用关掉重来。
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
      '<div class="gate__panel" role="dialog" aria-modal="true" aria-label="登录进入">' +

        '<div class="gate__brand">' +
          '<span class="gate__avatar" aria-hidden="true">朔</span>' +
          '<span class="gate__brandtext"><b>朔的小窝</b>' +
          '<i>Shuoscape · Undefined, still becoming.</i></span>' +
        '</div>' +

        '<h2 class="gate__title" data-auth-title>欢迎回来。</h2>' +
        '<p class="gate__desc" data-auth-desc>登录后可以留言、练习；管理员账号登录会自动拿到管理权限。</p>' +

        /* 页签：登录 / 注册（样式和逻辑跟登录卡片同一套） */
        '<div class="auth-tabs gate__tabs">' +
          '<button class="auth-tab is-active" type="button" data-auth-tab="login">登录</button>' +
          '<button class="auth-tab" type="button" data-auth-tab="signup">注册</button>' +
        '</div>' +

        /* 表单：标记跟登录卡片完全一致，Auth 靠它们取值 */
        '<div class="field gate__field" data-auth-nick hidden>' +
          '<label for="gateNick">昵称</label>' +
          '<input id="gateNick" type="text" data-f-nick autocomplete="nickname" placeholder="留言时显示的名字（可留空）">' +
        '</div>' +
        '<div class="field gate__field">' +
          '<label for="gateUser">邮箱</label>' +
          '<input id="gateUser" type="text" data-f-user autocomplete="username" placeholder="你的登录邮箱">' +
        '</div>' +
        '<div class="field gate__field">' +
          '<label for="gatePass">密码</label>' +
          '<input id="gatePass" type="password" data-f-pass autocomplete="current-password" placeholder="输入你的密码">' +
        '</div>' +

        '<p class="gate__err" data-auth-err hidden></p>' +

        '<div class="gate__actions">' +
          '<button class="btn btn--primary" type="button" data-auth-admin>登录</button>' +
          '<button class="btn btn--primary" type="button" data-auth-signup hidden>创建账号</button>' +
        '</div>' +

        /* 最下面：随便看看 */
        '<button class="gate__peek" type="button" data-gate="peek">' +
          '<span aria-hidden="true">👀</span> 随便看看 —— 不登录，先逛逛' +
        '</button>' +

        '<p class="gate__note">内容对所有人公开可读 —— 登录只为留言和记录，不妨碍你看什么。</p>' +
      '</div>';

    document.body.appendChild(el);
    this.el = el;
    this.form = el.querySelector('.gate__panel');

    const self = this;

    /* 页签切换：直接复用 Auth 的那套 */
    el.querySelectorAll('[data-auth-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (window.Auth && Auth.switchForm) { Auth.switchForm(self.form, tab.getAttribute('data-auth-tab')); }
      });
    });

    /* 提交：登录 / 注册都交给 Auth，把「门面板」当表单容器传进去 */
    const loginBtn = el.querySelector('[data-auth-admin]');
    if (loginBtn) { loginBtn.addEventListener('click', function () { self.tryLogin(); }); }
    const signupBtn = el.querySelector('[data-auth-signup]');
    if (signupBtn) { signupBtn.addEventListener('click', function () { self.trySignup(); }); }

    /* 回车提交 */
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') { return; }
      const isSignup = !!el.querySelector('[data-auth-signup]:not([hidden])');
      if (isSignup) { self.trySignup(); } else { self.tryLogin(); }
    });

    /* 随便看看 */
    const peek = el.querySelector('[data-gate="peek"]');
    if (peek) {
      peek.addEventListener('click', function () {
        self.remember('peek');
        self.close();
        if (window.App && App.toast) { App.toast('已进入 —— 想留言 / 管理的话，点最顶上那条身份条登录'); }
      });
    }

    /* 登录成功（Auth.apply 广播）→ 关门放行 */
    document.addEventListener('auth:change', function (e) {
      const role = e.detail && e.detail.role;
      if (role === 'admin' || role === 'user') {
        self.remember(role);
        self.close();
      }
    });

    this.adjustNote();
  },

  /* 底部小字按运行模式换说法（跟登录卡片 adjustByMode 一个道理） */
  adjustNote() {
    const note = this.el && this.el.querySelector('.gate__note');
    if (!note) { return; }
    if (window.Auth && Auth.cloudCfg && Auth.cloudCfg()) {
      note.textContent = '内容对所有人公开可读 —— 登录只为留言和记录，不妨碍你看什么。';
    } else {
      note.textContent = '本机模式只有管理员账号；注册 / 多用户在上云（Supabase）之后开放。';
    }
  },

  tryLogin() {
    if (window.Auth && Auth.loginAdmin) { Auth.loginAdmin(this.form); }
  },
  trySignup() {
    if (window.Auth && Auth.signup) { Auth.signup(this.form); }
  },

  show() {
    if (!this.el) { this.build(); }
    this.el.classList.add('is-open');
    document.body.classList.add('gate-locked');
  },

  close() {
    if (!this.el) { return; }
    this.el.classList.remove('is-open');
    document.body.classList.remove('gate-locked');
  }
};

window.Gate = Gate;

document.addEventListener('DOMContentLoaded', function () {
  /* Auth 先初始化（auth.js 先注册的 DOMContentLoaded），门再上 */
  Gate.init();
});
