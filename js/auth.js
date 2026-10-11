/* ==========================================================================
   auth.js —— 管理员 / 未登录 两种身份
   --------------------------------------------------------------------------
   它做的事：
     1. 关于页点自己的头像 → 弹出登录框
        · 管理员：输账号密码，密码交给服务器核对，换回一个凭证
        · 不登录：只能看，编辑按钮全部不出现
     2. 记住登录状态（存在浏览器里，关掉网页再开还在）
     3. 页面最顶上那条身份条永远显示当前身份，点它可以登录 / 退出

   ▍密码在哪？（2026-10-11 改过一次，看这里就够）
     以前密码明文写在前端源码里 —— 任何人按 F12 打开 js/auth.js 就能读走。
     现在密码只存在**服务端**，前端一行都没有：

       浏览器                            服务端（server.js）
         │ POST /api/session {账号,密码}
         │ ────────────────────────────►  排除源=环境变量 ADMIN_PASSWORD
         │                                或 db/admin.secret（首次启动自动生成）
         │ ◄────────────────────────────  { token: '…' }（12 小时内有效）
         │ PUT /api/articles/1  X-Admin-Token: token
         │ ────────────────────────────►  校验通过才真的写

     密码在哪看：启动服务时那个黑窗口里会打印「管理员密码 xxx」。
     想换成自己的：设环境变量 ADMIN_PASSWORD，或者直接改 db/admin.secret 里那一行。
     注意 db/admin.secret 不进 git（已写进 .gitignore）。

   ▍本地模式（直接双击 html，没跑 server.js）
     没有服务器核对密码，所以**不允许登录**，只给一句提示「请启动 server.js」。
     这也是为什么发布到 GitHub Pages 之后管理员登录用不了 —— Pages 是纯静态的。

   ▍说清楚一件事：它不是「防盗门」，是「开关」
     就算 token 对了，也只是服务器认这个请求；
     发布到 GitHub Pages 之后，访客改的只是他自己浏览器里的那份，仓库一行都不会变。
     所以这里的定位是「自己看着舒服、访客界面干净」。

   ▍页面里怎么配合
     想让某个按钮只在管理员登录时出现，给它加一个属性：
         <button data-admin-only>✎ 编辑</button>
     没登录时，这个按钮会被 CSS 直接收起来。
     另外在真正动手改数据之前，JS 里也会再问一次 Auth.isAdmin()，
     双保险 —— 就算按钮被强行显示出来，也改不动东西（服务端还会再查一次 token）。
   ========================================================================== */

const Auth = {

  /* ------------------------------------------------------------------
     账号名就在这里改（密码不在这里，在服务端）
     ------------------------------------------------------------------ */
  ADMIN: {
    user: 'admin'
  },

  /* 登录状态存在浏览器里的钥匙名 */
  KEY: 'shuoscape_role',
  /* 登录凭证 —— 服务端换回来的那串字符，写数据时放在请求头里带上 */
  TOKEN_KEY: 'shuoscape_admin_token',

  /* 当前身份：'admin' 管理员 / '' 还没登录 */
  role: '',

  init() {
    this.role = this.read();
    this.buildAdminBar();
    this.buildModal();
    this.bind();
    this.apply();
  },

  /* ------------------------------------------------------------------
     页面最顶上那条身份条（永远在最上面，怎么滚都不动）
     不用改每个 html —— 这里生成好直接插到 <body> 最前面，
     样式在 css/base.css 里（.adminbar）。
     ------------------------------------------------------------------ */
  buildAdminBar() {
    if (document.getElementById('adminBar')) { return; }

    const bar = document.createElement('div');
    bar.className = 'adminbar';
    bar.id = 'adminBar';
    bar.innerHTML =
      '<div class="adminbar__inner">' +
        '<span class="adminbar__dot" aria-hidden="true"></span>' +
        '<b class="adminbar__who" data-bar-role>未登录</b>' +
        '<span class="adminbar__sep">·</span>' +
        '<span class="adminbar__tip" data-bar-tip>现在是只读模式，管理员登录后可增删改</span>' +
        '<span class="adminbar__acts">' +
          '<button class="adminbar__btn adminbar__btn--main" type="button" data-bar-admin>管理员登录</button>' +
        '</span>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-adminbar');
    this.bar = bar;

    const self = this;
    const adminBtn = bar.querySelector('[data-bar-admin]');
    if (adminBtn) {
      adminBtn.addEventListener('click', function () {
        if (self.isAdmin()) { self.logout(); return; }
        self.open();
      });
    }
  },

  /* ---------- 读写身份 ---------- */
  read() {
    try {
      return localStorage.getItem(this.KEY) || '';
    } catch (e) {
      return '';   /* 有些浏览器禁了存储，那就当游客，不影响看内容 */
    }
  },

  save(role) {
    try { localStorage.setItem(this.KEY, role); } catch (e) { /* 存不了就算了 */ }
  },

  /* ---------- 登录凭证（服务端换回来的那串） ----------
     所有写操作都要带上它：js/data.js 的 DbStore 和 js/comments.js 的 remove()
     会调 Auth.token() 取，放进 X-Admin-Token 请求头。 */
  token() {
    try { return localStorage.getItem(this.TOKEN_KEY) || ''; } catch (e) { return ''; }
  },
  saveToken(token) {
    try { localStorage.setItem(this.TOKEN_KEY, token); } catch (e) { /* 同上 */ }
  },
  clearToken() {
    try { localStorage.removeItem(this.TOKEN_KEY); } catch (e) { /* 同上 */ }
  },

  isAdmin() { return this.role === 'admin'; },

  /* 有后端吗？登录必须要后端 —— 密码只存在服务端 */
  backendReady() {
    if (typeof SiteAPI === 'undefined' || !SiteAPI.whenReady) {
      return Promise.resolve(false);
    }
    return SiteAPI.whenReady().then(function () { return SiteAPI.isDb(); });
  },

  /* ---------- 身份变了之后，刷新整站的界面 ---------- */
  apply() {
    const isAdmin = this.isAdmin();
    document.body.classList.toggle('is-admin', isAdmin);

    /* 右上角那颗小徽章 */
    document.querySelectorAll('[data-role-badge]').forEach(function (node) {
      node.textContent = isAdmin ? '管理员' : '未登录';
      node.classList.toggle('is-admin', isAdmin);
      node.title = isAdmin ? '你是管理员，可以改内容。点这里退出' : '点这里登录';
    });

    /* 关于页头像上的小角标 */
    document.querySelectorAll('[data-avatar-badge]').forEach(function (node) {
      node.textContent = isAdmin ? '管理员' : '登录';
      node.hidden = false;
    });

    /* 最顶上那条身份条 */
    const bar = document.getElementById('adminBar');
    if (bar) {
      const who = bar.querySelector('[data-bar-role]');
      const tip = bar.querySelector('[data-bar-tip]');
      const adminBtn = bar.querySelector('[data-bar-admin]');

      if (who) { who.textContent = isAdmin ? '管理员' : '未登录'; }
      if (tip) {
        tip.textContent = isAdmin
          ? '可以增删改内容；再点右边按钮退出'
          : '现在是只读模式，登录后才能改内容';
      }
      if (adminBtn) { adminBtn.textContent = isAdmin ? '退出登录' : '管理员登录'; }
    }
  },

  /* ---------- 登录框 ---------- */
  buildModal() {
    if (document.getElementById('authModal')) { return; }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'authModal';
    modal.innerHTML =
      '<div class="modal__box auth-box" tabindex="-1">' +
        '<button class="auth-box__close" type="button" data-auth-close title="关闭">✕</button>' +
        '<p class="auth-box__eyebrow">SIGN IN</p>' +
        '<h3 class="auth-box__title">登录</h3>' +
        '<p class="auth-box__desc">' +
          '管理员登录后可以增删改内容；不登录只能看。' +
        '</p>' +

        '<div class="field">' +
          '<label for="authUser">账号</label>' +
          '<input id="authUser" type="text" autocomplete="username" placeholder="admin">' +
        '</div>' +
        '<div class="field">' +
          '<label for="authPass">密码</label>' +
          '<input id="authPass" type="password" autocomplete="current-password" placeholder="••••••••">' +
        '</div>' +

        '<p class="auth-box__err" data-auth-err hidden></p>' +

        '<div class="auth-box__actions">' +
          '<button class="btn btn--primary" type="button" data-auth-admin>登录</button>' +
        '</div>' +

        '<p class="auth-box__note">' +
          '密码不写在网页里 —— 提交后由 server.js 核对，通过才发一个临时凭证。<br>' +
          '密码就在启动服务那个黑窗口里；没启动 server.js 的话登录不了（纯静态页面没人能核对）。' +
        '</p>' +
      '</div>';

    document.body.appendChild(modal);
    this.modal = modal;
  },

  open() {
    if (!this.modal) { this.buildModal(); }
    const err = this.modal.querySelector('[data-auth-err]');
    if (err) { err.hidden = true; }
    const pass = this.modal.querySelector('#authPass');
    if (pass) { pass.value = ''; }

    this.modal.classList.add('is-open');
    const user = this.modal.querySelector('#authUser');
    if (user) { setTimeout(function () { user.focus(); }, 60); }
  },

  close() {
    if (this.modal) { this.modal.classList.remove('is-open'); }
  },

  /* ---------- 事件 ---------- */
  bind() {
    const self = this;
    const modal = this.modal;

    /* 关于页的头像、右上角徽章、任何标了 data-login 的东西，点了都开登录框 */
    document.querySelectorAll('[data-login], [data-role-badge], .about-hero__avatar img, .profile__photo img')
      .forEach(function (node) {
        node.classList.add('is-login-trigger');
        node.addEventListener('click', function () {
          /* 已经是管理员了，再点一次就是退出，不用再输密码 */
          if (self.isAdmin()) { self.logout(); return; }
          self.open();
        });
      });

    if (!modal) { return; }

    modal.addEventListener('click', function (e) {
      /* 点遮罩（弹窗以外的灰背景）关闭 */
      if (e.target === modal) { self.close(); }
    });

    const closeBtn = modal.querySelector('[data-auth-close]');
    if (closeBtn) { closeBtn.addEventListener('click', function () { self.close(); }); }

    const adminBtn = modal.querySelector('[data-auth-admin]');
    if (adminBtn) {
      adminBtn.addEventListener('click', function () { self.loginAdmin(); });
    }

    /* 回车直接登录，不用去点按钮 */
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { self.loginAdmin(); }
      if (e.key === 'Escape') { self.close(); }
    });
  },

  /* 真正要动手改数据之前，先问一句。
     CSS 只是把按钮藏起来 —— 万一有人改了样式把按钮弄出来，
     这一步还是会拦住，所以叫双保险。 */
  gate() {
    if (this.isAdmin()) { return true; }
    App.toast('想改内容得先登录 —— 点页面最上面那条身份条上的「管理员登录」');
    return false;
  },

  /* ------------------------------------------------------------------
     登录：把密码交给服务器，换一张临时凭证回来
     ------------------------------------------------------------------
     为什么不在这里比对密码？
     因为源码谁都能下载 —— 把密码（或者它的哈希）放在这里，
     等于把钥匙挂在门上。交给服务端才是对的。 */
  loginAdmin() {
    const userEl = this.modal && this.modal.querySelector('#authUser');
    const passEl = this.modal && this.modal.querySelector('#authPass');
    const err = this.modal && this.modal.querySelector('[data-auth-err]');
    const btn = this.modal && this.modal.querySelector('[data-auth-admin]');

    const user = (userEl && userEl.value || '').trim();
    const pass = (passEl && passEl.value || '');

    const sayErr = function (msg) {
      if (err) { err.hidden = false; err.textContent = msg; }
    };

    if (!user || !pass) { sayErr('账号和密码都要填'); return; }

    const self = this;
    if (btn) { btn.disabled = true; btn.textContent = '登录中…'; }
    sayErr('正在核对…');
    if (err) { err.hidden = false; }

    this.backendReady().then(function (hasBackend) {
      /* 没跑 server.js（直接双击 html / 纯静态托管）—— 没人能核对密码，直接说清楚 */
      if (!hasBackend) {
        sayErr('现在是本地模式，没有服务器能核对密码。双击 start.bat 启动服务后再登录。');
        if (btn) { btn.disabled = false; btn.textContent = '登录'; }
        throw new Error('no-backend');
      }
      return fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user, password: pass })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) {
          return { ok: r.ok, data: d };
        });
      }).then(function (r) {
        if (!r.ok || !r.data || !r.data.token) {
          sayErr((r.data && r.data.error) || '账号或密码不对');
          if (btn) { btn.disabled = false; btn.textContent = '登录'; }
          return;
        }
        self.role = 'admin';
        self.save('admin');
        self.saveToken(r.data.token);
        self.apply();
        self.close();
        if (btn) { btn.disabled = false; btn.textContent = '登录'; }
        App.toast('管理员已登录 —— 现在可以改内容了');
      });
    }).catch(function (e) {
      /* 上面没法登录时抛出来的那个 no-backend 已经提示过了，这里不再重复报错 */
      if (e && e.message === 'no-backend') { return; }
      sayErr('连不上服务器 —— 确认 start.bat 那个黑窗口还开着');
      if (btn) { btn.disabled = false; btn.textContent = '登录'; }
    });
  },

  logout() {
    const token = this.token();
    this.role = '';
    this.save('');
    this.clearToken();
    this.apply();
    /* 服务端那边也把这张凭证作废（不影响本地，失效了就重新登录） */
    if (token) {
      fetch('/api/session?token=' + encodeURIComponent(token), { method: 'DELETE' })
        .catch(function () { /* 服务器关着就算了 */ });
    }
    App.toast('已退出登录，界面回到只读');
  }
};

document.addEventListener('DOMContentLoaded', function () {
  Auth.init();
});
