/* ==========================================================================
   api.js —— 全站唯一的数据出入口
   --------------------------------------------------------------------------
   ▍现在（纯静态版）
       所有内容都从仓库里的 data/*.json 读，不连任何云端服务：

         data/profile.json       自我介绍 + 技能
         data/articles.json      文章
         data/poems.json         小诗
         data/music.json         唱片
         data/photos.json        照片（只存路径，图片在 assets/photos/）
         data/collections.json   照片合集

       要改内容，直接用编辑器改这几个 JSON 就行，改完 push，所有人刷新可见。

   ▍以后想接 CloudBase（或别的后端）
       ★ 只改本文件里 marked 的 _load() 一个函数，其他页面一行都不用动 ★
       把 fetch('data/articles.json') 换成
         db.collection('articles').orderBy('date','desc').get()
       返回同样的数组即可。文件末尾那批「评论 / 留言 / 登录」的占位函数
       也是给你留好的，填上就是完整功能。

   ▍三级兜底（断网、文件被误删也不会白屏）
       ① 网络读到最新 JSON   → 绿点
       ② 读不到时用 localStorage 缓存（上次读到的）  → 黄点
       ③ 缓存也没有 → 返回空数组 / 空对象，页面自己显示空状态

   ▍缓存策略
       先给缓存里的数据（立刻出画面），同时后台静默拉新的，
       拉到之后存缓存 + 广播 api:update，页面如果监听了就自动刷新。
   ========================================================================== */

window.Api = (function () {
  'use strict';

  /* JSON 文件放哪儿。GitHub Pages 上站点可能在子目录（/my-site/），
     所以用相对路径 —— 浏览器会按当前页面的地址去拼，子目录也不会错。
     真要写死就在 js/config.js 里配 dataBase（例如 './data/'）。 */
  var BASE = (window.SHUOSCAPE_CONFIG && window.SHUOSCAPE_CONFIG.dataBase) || 'data/';

  var FILES = {
    profile: 'profile.json',
    articles: 'articles.json',
    poems: 'poems.json',
    music: 'music.json',
    photos: 'photos.json',
    collections: 'collections.json'
  };

  var CACHE_KEY = 'shuoscape_json_cache_v1';
  var REFRESH_GAP = 60 * 1000;   /* 同一份数据 60 秒内不重复后台刷新，省流量 */

  /* 正在飞的请求（同一个数据只发一次，别的地方共用同一个 Promise） */
  var inflight = {};
  /* 上次后台刷新的时间 */
  var lastFetch = {};

  /* 读取状态：'json' = 刚从文件读到；'cache' = 用的是本地缓存 */
  var status = 'json';

  /* ---------- localStorage 缓存 ---------- */
  function cacheAll() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function cacheGet(kind) {
    var box = cacheAll()[kind];
    return (box && box.data !== undefined) ? box.data : null;
  }
  function cacheSet(kind, data) {
    try {
      var all = cacheAll();
      all[kind] = { t: Date.now(), data: data };
      localStorage.setItem(CACHE_KEY, JSON.stringify(all));
    } catch (e) {
      /* 存不下（隐私模式 / 空间满了）就算了，不影响看 */
    }
  }

  function setStatus(next) {
    if (status === next) { return; }
    status = next;
    try {
      document.dispatchEvent(new CustomEvent('api:status', { detail: { status: status } }));
    } catch (e) { /* 老浏览器没有 CustomEvent 构造器，忽略 */ }
  }

  /* ---------- 真正去拿数据 ----------
     ★ 以后接 CloudBase：只改这里 ★                                        */
  function _load(kind) {
    var file = FILES[kind];
    if (!file) { return Promise.reject(new Error('未知的数据类型：' + kind)); }

    /* —— CloudBase 版本长这样（把下面 fetch 那几行换掉即可）——
       if (window.cloudbase && window.SHUOSCAPE_CONFIG.cloudbaseEnv) {
         var app = cloudbase.init({ env: window.SHUOSCAPE_CONFIG.cloudbaseEnv });
         var db  = app.database();
         var q   = db.collection(kind === 'profile' ? 'profile' : kind);
         if (kind === 'articles' || kind === 'poems') { q = q.orderBy('date', 'desc'); }
         if (kind === 'music')                         { q = q.orderBy('sort', 'asc'); }
         return q.get().then(function (res) {
           return kind === 'profile' ? (res.data[0] || {}) : (res.data || []);
         });
       }
       ———————————————————————————————————————————— */

    return fetch(BASE + file, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) { throw new Error('读 ' + file + ' 失败（' + res.status + '）'); }
      return res.json();
    });
  }

  /* ---------- 归一化：不管谁来都按同一个形状返回 ---------- */
  function normalize(kind, data) {
    if (kind === 'profile') { return data && typeof data === 'object' ? data : {}; }
    if (!Array.isArray(data)) { return []; }
    if (kind === 'articles') {
      return data.slice().sort(function (a, b) {
        return String(a.date || '') < String(b.date || '') ? 1 : -1;
      });
    }
    if (kind === 'music') {
      return data.slice().sort(function (a, b) {
        return (Number(a.sort) || 0) - (Number(b.sort) || 0);
      });
    }
    return data.slice();
  }

  /* ---------- 盖上「本机改过的内容」 ----------
     管理员在页面上改文章 / 传照片，静态版没有后端，
     这些改动存在浏览器 localStorage 里（js/data.js 的 LocalStore）。
     读 JSON 的时候叠上去，这样改过的东西自己看得到。
     LocalStore 不存在（比如 Node 里跑脚本）就原样返回。 */
  function overlay(kind, base) {
    if (typeof LocalStore === 'undefined' || typeof LocalStore.read !== 'function') { return base; }
    try {
      var store = LocalStore.read();
      if (kind === 'articles' && LocalStore.mergeArticles) { return LocalStore.mergeArticles(store, base); }
      if (kind === 'poems' && LocalStore.mergePoems) { return LocalStore.mergePoems(store, base); }
      if (kind === 'music' && LocalStore.mergeMusic) { return LocalStore.mergeMusic(store, base); }
      if (kind === 'profile' && LocalStore.mergeProfile) { return LocalStore.mergeProfile(store, base); }
      if (kind === 'photos' && LocalStore.mergePhotos) { return LocalStore.mergePhotos(store, base); }
      if (kind === 'collections' && LocalStore.mergeCollections) { return LocalStore.mergeCollections(store, base); }
    } catch (e) {
      console.warn('[Api] 合并本机改动失败，先用原始数据', e);
    }
    return base;
  }

  /* ---------- 一次「取数据」的完整流程 ---------- */
  function get(kind) {
    var cached = cacheGet(kind);

    /* ① 有缓存 → 先把缓存交出去（画面立刻就有东西），后台再拉新的 */
    if (cached !== null) {
      refresh(kind);
      return Promise.resolve(overlay(kind, normalize(kind, cached)));
    }

    /* ② 没缓存 → 这次必须等网络 */
    if (inflight[kind]) { return inflight[kind]; }

    inflight[kind] = _load(kind).then(function (raw) {
      var data = normalize(kind, raw);
      cacheSet(kind, data);
      lastFetch[kind] = Date.now();
      setStatus('json');
      delete inflight[kind];
      return overlay(kind, data);
    }).catch(function (err) {
      delete inflight[kind];
      setStatus('cache');
      console.warn('[Api] 读 ' + FILES[kind] + ' 失败：' + ((err && err.message) || err));
      /* 连缓存都没有：返回空，页面自己显示空状态，别整页崩掉 */
      return overlay(kind, normalize(kind, kind === 'profile' ? {} : []));
    });

    return inflight[kind];
  }

  /* 后台静默刷新：拉到新的就存缓存 + 广播，页面监听 api:update 可以自动重画 */
  function refresh(kind) {
    var now = Date.now();
    if (lastFetch[kind] && now - lastFetch[kind] < REFRESH_GAP) { return; }
    if (inflight[kind]) { return; }
    lastFetch[kind] = now;

    _load(kind).then(function (raw) {
      var data = normalize(kind, raw);
      cacheSet(kind, data);
      setStatus('json');
      try {
        document.dispatchEvent(new CustomEvent('api:update', {
          detail: { kind: kind, data: overlay(kind, data) }
        }));
      } catch (e) { /* 忽略 */ }
    }).catch(function () {
      setStatus('cache');
    });
  }

  /* ------------------------------------------------------------------
     对外的方法
     ------------------------------------------------------------------ */

  /* 文章：可以按栏目 / 关键字过滤，也能只取前几条 */
  function getArticles(options) {
    var opt = options || {};
    return get('articles').then(function (list) {
      var out = list;
      if (opt.category && opt.category !== '全部') {
        out = out.filter(function (a) { return a.category === opt.category; });
      }
      if (opt.keyword) {
        var kw = String(opt.keyword).toLowerCase();
        out = out.filter(function (a) {
          var text = [a.title, a.summary || a.excerpt, (a.tags || []).join(''), a.series || ''].join(' ');
          return String(text).toLowerCase().indexOf(kw) > -1;
        });
      }
      return opt.limit ? out.slice(0, opt.limit) : out;
    });
  }

  function getProfile() { return get('profile'); }

  function getPoems(options) {
    var opt = options || {};
    return get('poems').then(function (list) {
      return opt.limit ? list.slice(0, opt.limit) : list;
    });
  }

  function getMusic() { return get('music'); }

  function getPhotos() { return get('photos'); }

  function getCollections() { return get('collections'); }

  /* 单张大图：静态版照片本来就是文件，直接把地址给回去。
     本机上传过的照片是 base64，也存在 p.data 里，同样能用。 */
  function getPhotoFull(id) {
    return getPhotos().then(function (list) {
      var key = String(id);
      var hit = list.find(function (p) { return String(p.id) === key; });
      return hit ? (hit.data || hit.url || '') : '';
    });
  }

  /* ------------------------------------------------------------------
     下面是给「以后接 CloudBase」留的位置
     ------------------------------------------------------------------
     现在全是空实现（返回空数组 / 空对象 / false），页面不会报错；
     等云端接好了，把这里换成真的请求就行，页面那边不用改。
     ------------------------------------------------------------------ */

  /* —— 以后接 CloudBase 评论用 —— 取某篇文章的评论 */
  function getComments(articleId) {
    /* db.collection('comments').where({ articleId: articleId }).orderBy('date','asc').get() */
    return Promise.resolve([]);
  }

  /* —— 以后接 CloudBase 评论用 —— 发表评论 */
  function addComment(data) {
    /* db.collection('comments').add(Object.assign({ date: new Date().toISOString() }, data)) */
    return Promise.resolve(false);
  }

  /* —— 以后接 CloudBase 留言用 —— 取留言板 */
  function getGuestbook() {
    /* db.collection('guestbook').orderBy('date','desc').get() */
    return Promise.resolve([]);
  }

  /* —— 以后接 CloudBase 留言用 —— 写留言 */
  function addGuestbook(data) {
    /* db.collection('guestbook').add(Object.assign({ date: new Date().toISOString() }, data)) */
    return Promise.resolve(false);
  }

  /* —— 以后接 CloudBase 管理员登录用 ——
     现在没后端，管理员身份走 js/auth.js 的本机账号（lizhixu） */
  function adminLogin() {
    /* const auth = cloudbase.init({ env: ENV_ID }).auth()
       return auth.signInWithEmailAndPassword(email, password) */
    return Promise.resolve(null);
  }

  /* ------------------------------------------------------------------
     杂项
     ------------------------------------------------------------------ */

  /* 当前状态：'json'（读到文件）/ 'cache'（用的本地缓存） */
  function getStatus() { return status; }

  /* 想显示状态点的地方：Api.onStatus(function (s) { … })
     状态变化时也会收到一次回调 */
  function onStatus(fn) {
    if (typeof fn !== 'function') { return; }
    fn(status);
    document.addEventListener('api:status', function () { fn(status); });
  }

  /* 手动刷新某一类数据（后台拉一次，不阻塞） */
  function refreshAll() {
    Object.keys(FILES).forEach(function (k) { lastFetch[k] = 0; refresh(k); });
  }

  /* 清空缓存（内容改了想立刻看新的时候用） */
  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* 忽略 */ }
  }

  return {
    getProfile: getProfile,
    getArticles: getArticles,
    getPoems: getPoems,
    getMusic: getMusic,
    getPhotos: getPhotos,
    getCollections: getCollections,
    getPhotoFull: getPhotoFull,

    getComments: getComments,
    addComment: addComment,
    getGuestbook: getGuestbook,
    addGuestbook: addGuestbook,
    adminLogin: adminLogin,

    getStatus: getStatus,
    onStatus: onStatus,
    refreshAll: refreshAll,
    clearCache: clearCache
  };
})();
