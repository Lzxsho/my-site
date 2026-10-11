/* ==========================================================================
   auth.js —— 三种身份：管理员 / 注册用户（游客登录）/ 未登录
   --------------------------------------------------------------------------
   它做的事：
     1. 点身份条 / 右上角徽章 → 弹出登录卡片（登录 / 注册两个页签）
     2. 记住登录状态（本机凭证或云端会话都存浏览器，关掉再开还在）
     3. 刷新整站界面：按钮显不显示（data-admin-only）、身份条写什么

   ▍谁能干什么（权限就这一张表）
     ┌ 管理员 ──── 增删改文章 / 小诗 / 唱片 / 自我介绍 / 技能 / 英语资料；
     │             删除留言（本机模式）；云端评论自动带身份
     ├ 注册用户 ── 云端只能**留言**（自动带邮箱身份）；
     │             导入英语资料 → 只存自己浏览器（IndexedDB），不上云
     └ 未登录 ──── 只能看；留言走匿名（填个名字就行）

   ▍三种运行模式，登录通道不一样
     · 云端（config.js 填了 Supabase）→ 注册 + 登录都走 Supabase Auth：
         注册  POST {url}/auth/v1/signup {email, password, data:{nickname}}
         登录  POST {url}/auth/v1/token?grant_type=password {email, password}
         续期  POST {url}/auth/v1/token?grant_type=refresh_token
       谁是管理员：js/config.js 的 adminEmails 名单（前端按钮）
                   + supabase.sql 的 admins 表（数据库真闸），两边填同一批。
     · 本机（双击 start.bat）→ 只有管理员一个账号（lizhixu），
       密码由 server.js 核对（POST /api/session）。注册功能不开放。
     · 纯本地（直接双击 html）→ 没人能核对密码，不允许登录。

   ▍安全底线（改之前先想清楚）
     前端的名单、按钮只是「界面开关」；真正拦住乱写的是两端：
       · 云端 —— supabase.sql 的 RLS 写策略 is_shuo_admin()（查 admins 表）
       · 本机 —— server.js 的 X-Admin-Token 校验
     就算有人改前端代码把按钮弄出来，云端 / 服务端照样拒收。

   ▍页面里怎么配合
     想让某个按钮只在管理员登录时出现，给它加属性： data-admin-only
     动手改数据前，JS 里再问一次 Auth.isAdmin()（双保险）。
   ========================================================================== */

const Auth = {

  /* ------------------------------------------------------------------
     本机模式的管理员账号名（密码不在这里，在服务端 db/admin.secret）
     ------------------------------------------------------------------ */
  ADMIN: {
    user: 'lizhixu'
  },

  /* 登录状态存在浏览器里的钥匙名 */
  KEY: 'shuoscape_role',
  /* 登录凭证 —— 写数据时放进请求头（本机：X-Admin-Token / 云端：Bearer） */
  TOKEN_KEY: 'shuoscape_admin_token',
  /* 云端会话（Supabase 换回来的整包：token + 刷新用 refresh_token + 用户信息） */
  SESSION_KEY: 'shuoscape_cloud_session',

  /* 当前身份：'admin' 管理员 / 'user' 注册用户 / '' 还没登录 */
  role: '',
  /* 当前登录的人（云端注册用户）：{ email, nickname }；本机管理员没有这个 */
  user: null,

  init() {
    this.buildAdminBar();
    this.buildModal();
    this.bind();
    this.restoreCloud().then(() => {
      /* ▍曾经在这里踩过的坑（2026-10-11）：
         原来是无条件 `this.role = this.read()` —— 云端登录只把会话存进
         SESSION_KEY，从没把身份写进 localStorage 的 KEY，
         结果每跳一页都拿空值把内存里刚恢复好的身份冲掉，
         表现就是「跳转到别的界面，登录就被顶掉了」。
         现在：restoreCloud() 认定过的身份优先，没有才读存档。 */
      this.role = this.role || this.read();
      this.apply();
    });
  },

  /* ------------------------------------------------------------------
     页面最顶上那条身份条（永远在最上面，怎么滚都不动）
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
        '<span class="adminbar__tip" data-bar-tip>现在是只读模式，登录后可留言 / 管理</span>' +
        '<span class="adminbar__acts">' +
          '<button class="adminbar__btn adminbar__btn--main" type="button" data-bar-admin>登录 / 注册</button>' +
        '</span>' +
      '</div>';

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-adminbar');
    this.bar = bar;

    const self = this;
    const adminBtn = bar.querySelector('[data-bar-admin]');
    if (adminBtn) {
      adminBtn.addEventListener('click', function () {
        if (self.role) { self.logout(); return; }
        self.open();
      });
    }
  },

  /* ---------- 读写身份 ---------- */
  read() {
    try {
      return localStorage.getItem(this.KEY) || '';
    } catch (e) {
      return '';   /* 有些浏览器禁了存储，那就当没登录，不影响看内容 */
    }
  },

  save(role) {
    try { localStorage.setItem(this.KEY, role); } catch (e) { /* 存不了就算了 */ }
  },

  /* ---------- 登录凭证 ----------
     本机模式和云端模式共用同一个钥匙位（两边不会同时用）：
       · 本机：server.js 换回来的随机串，放 X-Admin-Token 请求头
       · 云端：Supabase 换回来的 access_token，放 Authorization: Bearer 请求头
     js/data.js 的 DbStore / CloudStore 和 js/comments.js 都调 Auth.token() 取。 */
  token() {
    try { return localStorage.getItem(this.TOKEN_KEY) || ''; } catch (e) { return ''; }
  },
  saveToken(token) {
    try { localStorage.setItem(this.TOKEN_KEY, token); } catch (e) { /* 同上 */ }
  },
  clearToken() {
    try { localStorage.removeItem(this.TOKEN_KEY); } catch (e) { /* 同上 */ }
  },

  /* ---------- 云端会话的存取（比 token() 多一份刷新凭证和用户信息） ----------
     ⚠️ 存进去和读出来的都是 sessionFrom() 造的对象，字段名统一用驼峰
        （accessToken / refreshToken / expiresAt）。
        别写成 Supabase 原样的 access_token —— 两边对不上会导致「刷新就掉线」。 */
  readSession() {
    try {
      const s = JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
      return (s && s.accessToken) ? s : null;
    } catch (e) { return null; }
  },
  saveSession(s) {
    try { localStorage.setItem(this.SESSION_KEY, JSON.stringify(s || {})); } catch (e) { /* 同上 */ }
  },
  clearSession() {
    try { localStorage.removeItem(this.SESSION_KEY); } catch (e) { /* 同上 */ }
  },

  /* 云端配置：{ url, key } 没填就返回 null */
  cloudCfg() {
    const c = (window.SHUOSCAPE_CONFIG && window.SHUOSCAPE_CONFIG.content) || {};
    const url = String(c.supabaseUrl || '').replace(/\/+$/, '');
    const key = String(c.supabaseKey || '');
    return (url && key) ? { url: url, key: key } : null;
  },

  /* 管理员邮箱名单（小写比较）：js/config.js 的 adminEmails */
  adminEmails() {
    const list = (window.SHUOSCAPE_CONFIG && window.SHUOSCAPE_CONFIG.adminEmails) || [];
    return list.map(function (x) { return String(x || '').trim().toLowerCase(); })
               .filter(function (x) { return x; });
  },
  isAdminEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    return !!e && this.adminEmails().indexOf(e) >= 0;
  },

  isAdmin() { return this.role === 'admin'; },
  /* 登录了吗（管理员或注册用户都算） */
  isLogin() { return !!this.role; },

  /* 有后端吗？登录必须有人能核对密码
     返回值：'cloud' 云端（可注册可登录）/ 'db' 本机 server.js（仅管理员）/ false

     ▍优先级和 SiteAPI 的内容探测保持一致：本机 → 云端 → 没有
       本机 server.js 开着时优先走它 —— 管理员账号（lizhixu）就是它核对的，
       快而且断网也能用；只有 Pages 这种没有后端的地方才走云端，
       不然本机登录会被拽去 Supabase，本机账号反而没地方登。 */
  backendReady() {
    const self = this;
    if (typeof SiteAPI !== 'undefined' && SiteAPI.whenReady) {
      return SiteAPI.whenReady().then(function () {
        if (SiteAPI.isDb()) { return 'db'; }
        return self.cloudCfg() ? 'cloud' : false;
      });
    }
    if (this.cloudCfg()) { return Promise.resolve('cloud'); }
    return Promise.resolve(false);
  },

  /* ------------------------------------------------------------------
     打开页面时恢复上次的云端会话：
     access_token 没过期 → 直接用；过期了 → 用 refresh_token 换一张新的；
     换不回来（比如被踢了）→ 安静退出登录，界面回到未登录。
     ------------------------------------------------------------------ */
  restoreCloud() {
    const self = this;
    const s = this.readSession();
    if (!s) { return Promise.resolve(false); }

    /* 没过期（留 60 秒余量）：直接恢复身份 */
    if (s.expiresAt && s.expiresAt - 60 > Math.floor(Date.now() / 1000)) {
      this.applyCloudSession(s);
      return Promise.resolve(true);
    }

    /* 过期了：拿 refresh_token 换新的 */
    const cfg = this.cloudCfg();
    if (!cfg || !s.refreshToken) { this.clearCloud(); return Promise.resolve(false); }

    return fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refreshToken })
    }).then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (d) {
        if (d && d.access_token) {
          const ns = self.sessionFrom(d);
          self.applyCloudSession(ns);
          self.saveSession(ns);
          self.saveToken(ns.accessToken);   /* 驼峰：sessionFrom 给的字段名 */
          return true;
        }
        self.clearCloud();
        return false;
      })
      .catch(function () { return false; });
  },

  /* 从 Supabase 的返回里挑出我们关心的几个字段 */
  sessionFrom(d) {
    const u = (d && d.user) || {};
    const meta = u.user_metadata || {};
    return {
      accessToken: d.access_token || '',
      refreshToken: d.refresh_token || '',
      expiresAt: d.expires_at || 0,
      email: u.email || '',
      nickname: meta.nickname || (u.email || '').split('@')[0] || '朋友'
    };
  },

  /* 把云端会话落到当前身份上 */
  applyCloudSession(s) {
    this.user = { email: s.email, nickname: s.nickname };
    this.role = this.isAdminEmail(s.email) ? 'admin' : 'user';
    /* ⚠️ 身份必须同时写进 localStorage —— 恢复会话（restoreCloud）和登录
       （loginCloud / signup）都走这里，落盘一次，跳页才不会被打回未登录 */
    this.save(this.role);
  },

  clearCloud() {
    this.clearSession();
    this.clearToken();
    this.user = null;
    this.role = '';
    this.save('');
  },

  /* ---------- 身份变了之后，刷新整站的界面 ---------- */
  apply() {
    const isAdmin = this.isAdmin();
    const isUser = this.role === 'user';
    document.body.classList.toggle('is-admin', isAdmin);
    document.body.classList.toggle('is-user', isUser);

    /* 身份条上那句话 */
    const who = isAdmin ? '管理员'
      : (isUser && this.user ? (this.user.nickname || this.user.email) : '未登录');
    const tip = isAdmin
      ? '可以增删改内容；再点右边按钮退出'
      : (isUser ? '已登录 —— 可以留言、本地练习；导入的资料只存在这台电脑上'
                : '现在是只读模式，登录后可留言 / 管理');

    /* 右上角那颗小徽章 */
    document.querySelectorAll('[data-role-badge]').forEach(function (node) {
      node.textContent = who;
      node.classList.toggle('is-admin', isAdmin);
      node.classList.toggle('is-user', isUser);
      node.title = isAdmin ? '你是管理员，可以改内容。点这里退出' : (isUser ? '已登录，点这里退出' : '点这里登录 / 注册');
    });

    /* 关于页头像上的小角标 */
    document.querySelectorAll('[data-avatar-badge]').forEach(function (node) {
      node.textContent = isAdmin ? '管理员' : (isUser ? '已登录' : '登录');
      node.hidden = false;
    });

    /* 最顶上那条身份条 */
    const bar = document.getElementById('adminBar');
    if (bar) {
      const whoEl = bar.querySelector('[data-bar-role]');
      const tipEl = bar.querySelector('[data-bar-tip]');
      const adminBtn = bar.querySelector('[data-bar-admin]');
      if (whoEl) { whoEl.textContent = who; }
      if (tipEl) { tipEl.textContent = tip; }
      if (adminBtn) { adminBtn.textContent = this.role ? '退出登录' : '登录 / 注册'; }
    }

    /* 广播身份变化 —— 进站门（js/gate.js）靠这个事件知道「登录成功了，
       可以关门放行」。谁想跟着身份联动，监听 'auth:change' 即可。 */
    document.dispatchEvent(new CustomEvent('auth:change', {
      detail: { role: this.role, user: this.user }
    }));
  },

  /* ---------- 登录卡片 ---------- */
  buildModal() {
    if (document.getElementById('authModal')) { return; }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'authModal';
    modal.innerHTML =
      /* 卡片式登录页：
         顶部品牌区 → 英文标语 → 主标题 → 页签（登录 / 注册）→ 表单
         → 错误提示 → 主色按钮 → 返回链接 → 底部小字。

         ⚠️ 这几个标记不能动，改动前先看清：
            #authUser / #authPass / #authNick     loginAdmin() / signup() 靠它们取值
            data-auth-close / data-auth-admin / data-auth-signup / data-auth-err
            data-auth-tab                         页签切换
            autocomplete="username" / "email" / "new-password"   浏览器自动填充靠它们 */
      '<div class="modal__box auth-box" tabindex="-1">' +
        '<button class="auth-box__close" type="button" data-auth-close title="关闭">✕</button>' +

        /* ① 品牌区 */
        '<div class="auth-box__brand">' +
          '<span class="auth-box__avatar" aria-hidden="true">朔</span>' +
          '<span class="auth-box__brandtext">' +
            '<b class="auth-box__sitename">朔的小窝</b>' +
            '<span class="auth-box__sitesub">Shuoscape · Undefined, still becoming.</span>' +
          '</span>' +
        '</div>' +

        /* ② 英文标语 */
        '<p class="auth-box__eyebrow">YOUR SPACE</p>' +

        /* ③ 主标题（登录 / 注册各自一版） */
        '<h3 class="auth-box__title" data-auth-title>欢迎回来。</h3>' +
        '<p class="auth-box__desc" data-auth-desc>管理员登录后可以管理整个小窝；注册一个账号就能留言、导入自己的练习资料。</p>' +

        /* ④ 页签：登录 / 注册 */
        '<div class="auth-tabs" data-auth-tabs>' +
          '<button class="auth-tab is-active" type="button" data-auth-tab="login">登录</button>' +
          '<button class="auth-tab" type="button" data-auth-tab="signup">注册</button>' +
        '</div>' +

        /* ⑤ 表单（登录注册共用邮箱 / 密码两格，注册多一格昵称） */
        '<div class="field" data-auth-nick hidden>' +
          '<label for="authNick">昵称</label>' +
          '<input id="authNick" type="text" autocomplete="nickname" placeholder="留言时显示的名字（可留空）">' +
        '</div>' +
        '<div class="field">' +
          '<label for="authUser">邮箱</label>' +
          '<input id="authUser" type="text" autocomplete="username" placeholder="lizhixu 或你的登录邮箱">' +
        '</div>' +
        '<div class="field">' +
          '<label for="authPass">密码</label>' +
          '<input id="authPass" type="password" autocomplete="current-password" placeholder="输入你的密码">' +
        '</div>' +

        '<p class="auth-box__err" data-auth-err hidden></p>' +

        /* ⑥ 主按钮：登录 / 注册各一颗，按页签切换 */
        '<div class="auth-box__actions">' +
          '<button class="btn btn--primary" type="button" data-auth-admin>登录</button>' +
          '<button class="btn btn--primary" type="button" data-auth-signup hidden>创建账号</button>' +
        '</div>' +

        /* ⑦ 返回链接：点了就是关掉弹窗，回去看内容 */
        '<button class="auth-box__back" type="button" data-auth-back>← 返回小窝首页</button>' +

        /* ⑧ 底部小字（云端 / 本机各一版，open 时按模式切换） */
        '<p class="auth-box__note" data-auth-note>' +
          '管理员可以管理内容；注册用户可以留言、练习，导入的资料只保存在你自己的电脑上。' +
        '</p>' +
      '</div>';

    document.body.appendChild(modal);
    this.modal = modal;
  },

  /* 登录卡片切页签：'login' / 'signup' */
  switchTab(which) {
    if (!this.modal) { return; }
    const login = which !== 'signup';

    this.modal.querySelectorAll('[data-auth-tab]').forEach(function (t) {
      t.classList.toggle('is-active', t.getAttribute('data-auth-tab') === which);
    });

    const q = (sel) => this.modal.querySelector(sel);
    const title = q('[data-auth-title]');
    const desc = q('[data-auth-desc]');
    const nick = q('[data-auth-nick]');
    const pass = q('#authPass');
    const loginBtn = q('[data-auth-admin]');
    const signupBtn = q('[data-auth-signup]');
    const err = q('[data-auth-err]');

    if (title) { title.textContent = login ? '欢迎回来。' : '加入朔的小窝。'; }
    if (desc) {
      desc.textContent = login
        ? '管理员登录后可以管理整个小窝；注册用户登录后可以留言、本地练习。'
        : '注册后可以留言（带你的昵称）、练习词汇；导入的资料只存自己电脑，不会上传。';
    }
    if (nick) { nick.hidden = login; }
    if (pass) { pass.setAttribute('autocomplete', login ? 'current-password' : 'new-password'); }
    if (loginBtn) { loginBtn.hidden = !login; }
    if (signupBtn) { signupBtn.hidden = login; }
    if (err) { err.hidden = true; }

    /* 注册时邮箱要独立填充，别跟本机管理员的账号记忆混了 */
    const user = q('#authUser');
    if (user) { user.setAttribute('autocomplete', login ? 'username' : 'email'); }
  },

  open(mode) {
    if (!this.modal) { this.buildModal(); }
    const err = this.modal.querySelector('[data-auth-err]');
    if (err) { err.hidden = true; }
    const pass = this.modal.querySelector('#authPass');
    if (pass) { pass.value = ''; }
    const nick = this.modal.querySelector('#authNick');
    if (nick) { nick.value = ''; }

    this.switchTab(mode === 'signup' ? 'signup' : 'login');
    this.adjustByMode();

    this.modal.classList.add('is-open');
    const user = this.modal.querySelector('#authUser');
    if (user) { setTimeout(function () { user.focus(); }, 60); }
  },

  /* 按当前运行模式调整卡片上的说明文字：
     云端 → 注册开放；本机 → 只有管理员账号，注册页签点了会说明；本地 → 都不行 */
  adjustByMode() {
    const note = this.modal && this.modal.querySelector('[data-auth-note]');
    if (!note) { return; }
    if (this.cloudCfg()) {
      note.innerHTML = '管理员可以管理内容；注册用户可以留言、练习，导入的资料只保存在你自己的电脑上。';
    } else {
      note.innerHTML = '本机模式只有管理员账号（账号见启动窗口打印的那行）。<br>注册 / 多用户功能在上云（Supabase）之后开放。';
    }
  },

  close() {
    if (this.modal) { this.modal.classList.remove('is-open'); }
    /* 进站门（js/gate.js）在等这个信号：登录卡片关了人还没进去，门要挡回来 */
    document.dispatchEvent(new CustomEvent('auth:modal-closed'));
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
          /* 已经登录了，再点一次就是退出，不用再输密码 */
          if (self.role) { self.logout(); return; }
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

    /* 「返回小窝首页」 = 关掉弹窗回到内容，不跳转也不刷新 */
    const backBtn = modal.querySelector('[data-auth-back]');
    if (backBtn) { backBtn.addEventListener('click', function () { self.close(); }); }

    /* 页签切换 */
    modal.querySelectorAll('[data-auth-tab]').forEach(function (t) {
      t.addEventListener('click', function () {
        self.switchTab(t.getAttribute('data-auth-tab'));
      });
    });

    const loginBtn = modal.querySelector('[data-auth-admin]');
    if (loginBtn) { loginBtn.addEventListener('click', function () { self.loginAdmin(); }); }

    const signupBtn = modal.querySelector('[data-auth-signup]');
    if (signupBtn) { signupBtn.addEventListener('click', function () { self.signup(); }); }

    /* 回车直接提交（登录页签走登录，注册页签走注册） */
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const isSignup = !!modal.querySelector('[data-auth-signup]:not([hidden])');
        if (isSignup) { self.signup(); } else { self.loginAdmin(); }
      }
      if (e.key === 'Escape') { self.close(); }
    });
  },

  /* 真正要动手改内容之前，先问一句（管理员专属动作用）。
     CSS 只是把按钮藏起来 —— 万一有人改了样式把按钮弄出来，
     这一步还是会拦住，所以叫双保险。 */
  gate() {
    if (this.isAdmin()) { return true; }
    App.toast(this.role === 'user'
      ? '改内容是管理员的活 —— 你登录的账号是普通用户，可以留言 / 本地练习'
      : '想改内容得先登录 —— 点页面最上面那条身份条上的「登录 / 注册」');
    return false;
  },

  /* ---------- 取表单里的值 ---------- */
  formValues() {
    const q = (sel) => (this.modal && this.modal.querySelector(sel)) || {};
    return {
      user: (q('#authUser').value || '').trim(),
      pass: q('#authPass').value || '',
      nick: (q('#authNick').value || '').trim(),
      err: q('[data-auth-err]'),
      loginBtn: q('[data-auth-admin]'),
      signupBtn: q('[data-auth-signup]')
    };
  },

  sayErr(errEl, msg) {
    if (errEl) { errEl.hidden = false; errEl.textContent = msg; }
  },

  /* ------------------------------------------------------------------
     登录：把密码交给服务器，换一张临时凭证回来
     ------------------------------------------------------------------
     为什么不在这里比对密码？
     因为源码谁都能下载 —— 把密码（或者它的哈希）放在这里，
     等于把钥匙挂在门上。交给服务端才是对的。 */
  loginAdmin() {
    const f = this.formValues();
    if (!f.user || !f.pass) { this.sayErr(f.err, '邮箱和密码都要填'); return; }

    const self = this;
    if (f.loginBtn) { f.loginBtn.disabled = true; f.loginBtn.textContent = '登录中…'; }
    this.sayErr(f.err, '正在核对…');
    if (f.err) { f.err.hidden = false; }

    this.backendReady().then(function (hasBackend) {
      /* ① 云端：密码交给 Supabase Auth 核对（GitHub Pages 上也能登录） */
      if (hasBackend === 'cloud') { return self.loginCloud(f); }

      /* ② 本机 server.js：老路子，POST /api/session（只有管理员一个账号） */
      if (hasBackend === 'db') { return self.loginDb(f); }

      /* ③ 没跑 server.js（直接双击 html / 纯静态托管）—— 没人能核对密码 */
      self.sayErr(f.err, '现在是本地模式，没有服务器能核对密码。双击 start.bat 启动服务后再登录。');
      if (f.loginBtn) { f.loginBtn.disabled = false; f.loginBtn.textContent = '登录'; }
    });
  },

  /* 本机 server.js 登录：POST /api/session */
  loginDb(f) {
    const self = this;
    return fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: f.user, password: f.pass })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return { ok: r.ok, data: d };
      });
    }).then(function (r) {
      if (!r.ok || !r.data || !r.data.token) {
        self.sayErr(f.err, (r.data && r.data.error) || '账号或密码不对');
        self.unlock(f);
        return;
      }
      self.role = 'admin';
      self.user = null;
      self.save('admin');
      self.saveToken(r.data.token);
      self.apply();
      self.close();
      self.unlock(f);
      App.toast('管理员已登录 —— 现在可以改内容了');
    }).catch(function () {
      self.sayErr(f.err, '连不上服务器 —— 确认 start.bat 那个黑窗口还开着');
      self.unlock(f);
    });
  },

  unlock(f) {
    if (f.loginBtn) { f.loginBtn.disabled = false; f.loginBtn.textContent = '登录'; }
    if (f.signupBtn) { f.signupBtn.disabled = false; f.signupBtn.textContent = '创建账号'; }
  },

  /* ------------------------------------------------------------------
     云端登录：邮箱 + 密码 → Supabase Auth 换 access_token
     ------------------------------------------------------------------
     账号在 Supabase 后台 Authentication → Users 里建（或用户自己注册）。
     换回来的 token 沿用同一个 TOKEN_KEY —— js/data.js 的 CloudStore 拿它当
     Authorization: Bearer … 用，云端靠它放行写操作。
     是不是管理员由 adminEmails 名单决定，跟密码对不对没关系。 */
  loginCloud(f) {
    const self = this;
    const cfg = this.cloudCfg();

    return fetch(cfg.url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: f.user, password: f.pass })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return { ok: r.ok, data: d };
      });
    }).then(function (r) {
      if (!r.ok || !r.data || !r.data.access_token) {
        self.sayErr(f.err, (r.data && r.data.error_description) || (r.data && r.data.msg) || '邮箱或密码不对');
        self.unlock(f);
        return;
      }
      const s = self.sessionFrom(r.data);
      self.applyCloudSession(s);
      self.saveSession(s);
      self.saveToken(s.accessToken);   /* 驼峰：sessionFrom 给的字段名 */
      self.apply();
      self.close();
      self.unlock(f);
      if (typeof App !== 'undefined' && App.toast) {
        App.toast(self.isAdmin()
          ? '管理员已登录 —— 现在可以改内容了（云端）'
          : '欢迎回来，' + (s.nickname || s.email) + ' —— 可以留言了（云端）');
      }
    }).catch(function () {
      self.sayErr(f.err, '连不上云端 —— 检查网络，或看看 js/config.js 里的配置填对没有');
      self.unlock(f);
    });
  },

  /* ------------------------------------------------------------------
     注册（只在云端开放）：邮箱 + 密码 + 昵称 → Supabase Auth 建号
     ------------------------------------------------------------------
     注册成功分两种情况：
       · Supabase 关了「邮箱确认」→ 直接返回会话，立刻登录
       · 开了「邮箱确认」→ 返回 user 但没有 session，提示去邮箱点确认链接
     注册成功的都是**普通用户**；想当管理员，把邮箱加进
     js/config.js 的 adminEmails + supabase.sql 的 admins 表。 */
  signup() {
    const f = this.formValues();
    const cfg = this.cloudCfg();

    if (!cfg) {
      this.sayErr(f.err, '注册功能在上云（Supabase）之后开放 —— 现在是本机模式。');
      return;
    }
    if (!f.user || !f.pass) { this.sayErr(f.err, '邮箱和密码都要填'); return; }
    if (f.pass.length < 6) { this.sayErr(f.err, '密码至少 6 位（Supabase 的规定）'); return; }

    const self = this;
    if (f.signupBtn) { f.signupBtn.disabled = true; f.signupBtn.textContent = '注册中…'; }
    this.sayErr(f.err, '正在创建账号…');
    if (f.err) { f.err.hidden = false; }

    fetch(cfg.url + '/auth/v1/signup', {
      method: 'POST',
      headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: f.user,
        password: f.pass,
        data: { nickname: f.nick || f.user.split('@')[0] }
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return { ok: r.ok, data: d };
      });
    }).then(function (r) {
      self.unlock(f);
      if (!r.ok) {
        const msg = (r.data && (r.data.msg || r.data.error_description)) || '';
        self.sayErr(f.err, /already/i.test(msg) ? '这个邮箱已经注册过了 —— 换「登录」页签直接登录'
                  : (msg || '注册没成功 —— 检一下邮箱格式和密码长度'));
        return;
      }
      /* 情况一：直接拿到会话（没开邮箱确认）—— 登进去 */
      if (r.data && r.data.access_token) {
        const s = self.sessionFrom(r.data);
        self.applyCloudSession(s);
        self.saveSession(s);
        self.saveToken(s.accessToken);   /* 驼峰：sessionFrom 给的字段名 */
        self.apply();
        self.close();
        App.toast('注册成功，已经帮你登录了 —— 欢迎，' + (s.nickname || '朋友'));
        return;
      }
      /* 情况二：开了邮箱确认 —— 提示去收邮件 */
      self.sayErr(f.err, '');
      if (f.err) {
        f.err.hidden = false;
        f.err.textContent = '注册成功！Supabase 给你发了一封确认邮件 —— 去邮箱点确认链接，回来就能登录了。';
      }
    }).catch(function () {
      self.sayErr(f.err, '连不上云端 —— 检查网络，或看看 js/config.js 里的配置填对没有');
      self.unlock(f);
    });
  },

  /* ---------- 退出 ---------- */
  logout() {
    const wasCloud = !!this.readSession();
    const token = this.token();

    this.clearCloud();
    this.apply();

    /* 另一端也把这张凭证作废（失败无所谓，本地已经清空了） */
    if (wasCloud && token) {
      const cfg = this.cloudCfg();
      if (cfg) {
        fetch(cfg.url + '/auth/v1/logout', {
          method: 'POST',
          headers: { apikey: cfg.key, Authorization: 'Bearer ' + token }
        }).catch(function () { /* 云端关着就算了 */ });
      }
    } else if (token) {
      fetch('/api/session?token=' + encodeURIComponent(token), { method: 'DELETE' })
        .catch(function () { /* 服务器关着就算了 */ });
    }
    App.toast('已退出登录，界面回到只读');
  }
};

/* --------------------------------------------------------------------------
   挂到 window 上 —— 这一行不能删
   --------------------------------------------------------------------------
   ⚠️ 踩过的坑：Auth 是用 `const Auth = {...}` 声明的。
      const 声明出来的名字会进「全局词法环境」，但**不会**变成 window 的属性。
      而全站各处（articles.js / poems.js / music.js / about.js）在动手改内容前
      都是这么问的：

          if (!window.Auth || !Auth.gate()) { return; }

      少了这一行，`window.Auth` 永远是 undefined，
      于是那句判断**直接 return** —— 表现就是：
      明明身份条上写着「管理员」，点「编辑」「删除」「写文章」却一点反应都没有，
      控制台还一个错都不报（因为确实没抛异常，只是提前返回了）。
      所以：只要 Auth 还是用 const 声明的，这行就必须在。 */
window.Auth = Auth;

document.addEventListener('DOMContentLoaded', function () {
  Auth.init();
});
