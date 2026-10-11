/* ==========================================================================
   progress-sync.js —— 练习记录上云（个人版）
   --------------------------------------------------------------------------
   干什么：
     把练习记录（错题本 / 每日练习 / 没练完的一轮 / C 语言打卡）
     在 localStorage 和云端 user_progress 表之间双向搬运。
     登录后换设备也能接着练 —— 记录跟着账号走。

   ▍设计底线：不动 english.js / study.js 一行代码
     它们照旧读写 localStorage（运行时永远用本地，快、断网也能练）；
     本模块在背后做三件事：
       1. 登录后：云端拉一份 → 和本地合并 → 写回 localStorage → 推云端
       2. 每 20 秒看一眼本地记录的指纹，变了就推云端
       3. 退出登录就停，记录留在本机
     对练习界面来说，存 localStorage 的手感一点没变。

   ▍合并策略（云端一份、本机一份，听谁的？）
     · 错题本：按题目 key 合并，两边都有的取 last（最近一次练习）更新的
     · 每日练习：同一天取做题量 / 答对数的较大值
     · 未完成的一轮 / C 语言打卡：谁非空听谁的，本地优先
     合并永远不删数据，最坏情况是「两边都练了，算多的那份」。

   ▍涉及哪些 localStorage 钥匙
     shuoscape_en_wrong / en_daily / en_round   英语练习（js/english.js）
     shuoscape_study_progress / study_extra     C 语言打卡（js/study.js）
     英语资料本身（en_materials）不在这 —— 那是全站共享的，走 en_materials 表。
   ========================================================================== */

const ProgressSync = {

  /* 同步的 localStorage 钥匙名单 */
  KEYS: [
    'shuoscape_en_wrong',
    'shuoscape_en_daily',
    'shuoscape_en_round',
    'shuoscape_study_progress',
    'shuoscape_study_extra'
  ],

  active: false,     /* 同步开着吗（登录 + 有云端才有资格开） */
  timer: null,       /* 轮询句柄 */
  lastPush: '',      /* 上次推上去的指纹（防重复推） */
  busy: false,       /* 一次同步没跑完，下一轮先跳过 */

  /* ------------------------------------------------------------------
     启动入口：页面加载后先看一眼现在的登录态
     （auth:change 事件也听着 —— 登录 / 退出当场生效）
     ------------------------------------------------------------------ */
  init() {
    document.addEventListener('auth:change', (e) => {
      const d = e.detail || {};
      if (d.role) { this.start(); } else { this.stop(); }
    });
    /* 初始化时已经登录着的情况（Auth.init 的广播可能早于本文件加载完成） */
    if (window.Auth && Auth.isLogin()) { this.start(); }
  },

  /* ---------- 开关 ---------- */
  start() {
    const s = window.Auth && Auth.readSession();
    if (!s || !s.accessToken || !s.email) { return; }   /* 没有云端会话，免谈 */
    if (this.active && this.email === s.email) { return; }
    this.active = true;
    this.email = s.email;

    this.syncAll().catch(function () { /* 首轮失败不打扰，下轮再试 */ });
    if (!this.timer) {
      const self = this;
      this.timer = setInterval(function () {
        if (self.active && !document.hidden) { self.tick(); }
      }, 20000);
    }
  },

  stop() {
    this.active = false;
    this.email = '';
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  /* 每 20 秒一格：本地指纹变了才推 */
  tick() {
    const h = this.fingerprint(this.readLocal());
    if (h === this.lastPush) { return; }   /* 没变，别浪费流量 */
    this.syncAll().catch(function () { /* 网络不好下轮再说 */ });
  },

  /* ---------- 一次完整的「拉 → 合并 → 存 → 推」 ---------- */
  async syncAll() {
    if (this.busy || !this.active) { return; }
    this.busy = true;
    try {
      const cfg = window.Auth && Auth.cloudCfg();
      const token = window.Auth && Auth.token();
      if (!cfg || !token) { return; }

      const local = this.readLocal();
      const remote = await this.pull(cfg, token);
      const merged = remote ? this.merge(local, remote) : local;

      /* 合并结果写回本地 —— 练习界面下次 load() 就用的是它 */
      this.writeLocal(merged);

      /* 推云端（没变化就不推） */
      const h = this.fingerprint(merged);
      if (remote || h !== this.fingerprint(local)) {
        await this.push(cfg, token, merged);
      }
      this.lastPush = h;
    } finally {
      this.busy = false;
    }
  },

  /* ---------- 本地读写 ---------- */
  readLocal() {
    const o = {};
    this.KEYS.forEach((k) => {
      try { o[k] = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { o[k] = null; }
    });
    return o;
  },

  writeLocal(o) {
    this.KEYS.forEach((k) => {
      try {
        if (o[k] === null || o[k] === undefined) { return; }   /* 空的不覆盖 */
        localStorage.setItem(k, JSON.stringify(o[k]));
      } catch (e) { /* 存不进去就算了（隐私模式） */ }
    });
  },

  fingerprint(o) {
    let s = '';
    this.KEYS.forEach((k) => { s += JSON.stringify(o[k] || null) + '|'; });
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return String(h);
  },

  /* ---------- 云端读写（REST，和 CloudStore 同款姿势） ---------- */
  async pull(cfg, token) {
    const url = cfg.url + '/rest/v1/user_progress?select=data&email=eq.' +
      encodeURIComponent(this.email) + '&limit=1';
    const r = await fetch(url, {
      headers: { apikey: cfg.key, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) { return null; }                 /* 401 / 网络问题：当云端没有 */
    const rows = await r.json().catch(() => []);
    return (rows && rows[0] && rows[0].data) || null;
  },

  async push(cfg, token, data) {
    await fetch(cfg.url + '/rest/v1/user_progress', {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'      /* 主键撞了就更新（upsert） */
      },
      body: JSON.stringify({
        email: this.email,
        data: data,
        updatedAt: new Date().toISOString()
      })
    });
    /* 401 = 登录过期：不重试，等页面下次加载 restoreCloud 换新 token */
  },

  /* ---------- 合并：local 和 remote 各是一把钥匙 → 值 ---------- */
  merge(local, remote) {
    const out = {};
    this.KEYS.forEach((k) => {
      const a = local[k], b = remote[k];
      if (a === null || a === undefined) { out[k] = b; return; }
      if (b === null || b === undefined) { out[k] = a; return; }

      if (k === 'shuoscape_en_wrong' && Array.isArray(a) && Array.isArray(b)) {
        out[k] = this.mergeWrong(a, b); return;
      }
      if (k === 'shuoscape_en_daily' && !Array.isArray(a) && !Array.isArray(b)) {
        out[k] = this.mergeDaily(a, b); return;
      }
      /* 其余（round / 打卡）：两边都是对象就浅合并（本地优先），否则听本地的 */
      if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
        out[k] = Object.assign({}, b, a); return;
      }
      out[k] = a;
    });
    return out;
  },

  /* 错题本：按 key 合并，同 key 取 last（最后练习时间）更新的 */
  mergeWrong(a, b) {
    const map = {};
    (b || []).forEach((w) => { if (w && w.key) { map[w.key] = w; } });
    (a || []).forEach((w) => {
      if (!w || !w.key) { return; }
      const old = map[w.key];
      if (!old || (Number(w.last) || 0) >= (Number(old.last) || 0)) { map[w.key] = w; }
    });
    return Object.keys(map).map((k) => map[k]);
  },

  /* 每日练习：同一天取做题量 / 答对数的较大值 */
  mergeDaily(a, b) {
    const out = Object.assign({}, b);
    Object.keys(a || {}).forEach((d) => {
      const x = a[d] || {}, y = out[d] || {};
      out[d] = {
        t: Math.max(Number(x.t) || 0, Number(y.t) || 0),
        r: Math.max(Number(x.r) || 0, Number(y.r) || 0)
      };
    });
    return out;
  }
};

window.ProgressSync = ProgressSync;

document.addEventListener('DOMContentLoaded', function () {
  ProgressSync.init();
});
