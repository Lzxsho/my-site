/* ==========================================================================
   comments.js —— 文章 / 小诗下面的留言板
   --------------------------------------------------------------------------
   想达到的效果：
     · 谁都能看，谁都能写（游客不用登录 —— 本来就是给人留话的地方）
     · 发出去就一直在（不是刷新就没了）
     · 管理员可以删掉不合时宜的留言

   ▍评论存在哪？三条路，页面自己会挑（顺序就是下面这个）
     1. 云端（js/config.js 里填了 Supabase 的 url 和 key）
        留言进云端数据库 —— 谁打开这个网站看到的都是同一批留言。
        ★ 传到 GitHub Pages 之后还能「所有人看到同一批」，靠的就是这一档。
     2. 跑着 server.js 的时候（数据库模式）
        评论进 db/site.db 的 comments 表 —— 存在服务器上，
        换电脑、换浏览器、别人打开你的站，都看得到同一批留言。
     3. 直接双击打开 html 的时候（本地模式，file://）
        没有服务器，就退回到浏览器自己的 localStorage。
        这时留言只留在你自己这台机器的这个浏览器里。
        页面上会写清楚是哪种，不让人误会。

   ▍怎么用
     在页面里放一个空盒子，标明它属于谁：
         <div class="comments-box" data-comments="article-12"></div>
     然后 JS 里渲染完内容后调一句：
         Comments.mountAll(某个容器)      ← 不传就是整页扫一遍
     盒子里的列表、输入框、发布按钮都由这里生成，页面不用管细节。
   ========================================================================== */

/* 两条小工具：把一条留言补齐成「有 parentId / replies 的形状」、按时间排序 */
function commentsShape(r) {
  const row = r || {};
  return {
    id: row.id,
    target: row.target,
    name: row.name,
    content: row.content,
    parentId: (row.parentId === undefined || row.parentId === null || row.parentId === '')
      ? null : row.parentId,
    createdAt: row.createdAt,
    replies: []
  };
}
function byTime(a, b) {
  return String(a.createdAt || '') < String(b.createdAt || '') ? -1 : 1;
}

const Comments = {

  /* 本地模式下，评论存在浏览器里的钥匙名 */
  KEY: 'shuoscape_comments',
  /* 昵称记一下，下次再来不用重新输 */
  NICK: 'shuoscape_nickname',

  /* 'cloud' = 云端数据库；'db' = 服务器数据库；'local' = 浏览器本地。等 ready 之后才准 */
  mode: null,
  /* 内存缓存：同一个 target 在一页里被问好几次，不用每次都跑一趟 */
  cache: {},

  /* ------------------------------------------------------------------
     云端配置（js/config.js）
     ------------------------------------------------------------------ */
  cfg() {
    const all = window.SHUOSCAPE_CONFIG || {};
    const c = all.comments || {};
    const content = all.content || {};
    /* 留言这块没填、但内容那块填了 —— 一般就是同一个 Supabase 项目，
       那就直接借用它的地址，省得同一串 key 抄两遍还抄错。 */
    return {
      url: String(c.supabaseUrl || content.supabaseUrl || '').replace(/\/+$/, ''),
      key: String(c.supabaseKey || content.supabaseKey || ''),
      table: String(c.table || 'comments')
    };
  },
  hasCloud() {
    const c = this.cfg();
    return !!(c.url && c.key);
  },

  /* 云端一次请求（Supabase 的 REST 接口，不用装任何库） */
  cloudReq(path, opts) {
    const c = this.cfg();
    const o = opts || {};
    const headers = {
      apikey: c.key,
      Authorization: 'Bearer ' + c.key,
      'Content-Type': 'application/json'
    };
    if (o.headers) { Object.keys(o.headers).forEach(function (k) { headers[k] = o.headers[k]; }); }
    return fetch(c.url + '/rest/v1/' + c.table + path, {
      method: o.method || 'GET',
      headers: headers,
      body: o.body ? JSON.stringify(o.body) : undefined
    });
  },

  /* 数据库那边的字段名是 created_at / parent_id（下划线），页面里用驼峰 */
  fromRow(r) {
    return {
      id: r.id,
      target: r.target,
      name: r.name,
      content: r.content,
      parentId: r.parent_id === undefined ? (r.parentId === undefined ? null : r.parentId) : r.parent_id,
      createdAt: r.created_at || r.createdAt || r.createdat
    };
  },

  /* 把「一串平铺的留言」整理成「带孩子的两级结构」：
     顶层留言按时间排，每条下面挂自己的回复（回复内部也按时间排）。
     只做两级 —— 再深缩进就没地儿了，看着也累。 */
  nest(rows) {
    const list = (rows || []).map(function (r) { return commentsShape(r); });
    const top = [];
    const kids = {};
    list.forEach(function (r) {
      if (r.parentId === null || r.parentId === undefined || String(r.parentId) === '') { top.push(r); return; }
      const key = String(r.parentId);
      if (!kids[key]) { kids[key] = []; }
      kids[key].push(r);
    });
    top.sort(byTime);
    Object.keys(kids).forEach(function (k) { kids[k].sort(byTime); });
    top.forEach(function (t) { t.replies = kids[String(t.id)] || []; });
    /* 回复的父亲可能已经被删了（云端尤其常见），那就把它挂到顶层，别丢 */
    Object.keys(kids).forEach(function (k) {
      const exists = top.some(function (t) { return String(t.id) === k; });
      if (!exists) { kids[k].forEach(function (r) { top.push(r); }); }
    });
    top.sort(byTime);
    return top;
  },

  /* ------------------------------------------------------------------
     模式探测：能用云端吗？有后端吗？都没有就本地
     ------------------------------------------------------------------ */
  ready() {
    const self = this;
    if (this.mode) { return Promise.resolve(this.mode); }
    /* 填了云端配置就优先走云端 —— 这样本地发的留言，传到 GitHub 上也在 */
    if (this.hasCloud()) {
      this.mode = 'cloud';
      return Promise.resolve('cloud');
    }
    if (typeof SiteAPI === 'undefined' || !SiteAPI.whenReady) {
      this.mode = 'local';
      return Promise.resolve('local');
    }
    return SiteAPI.whenReady().then(function () {
      self.mode = SiteAPI.isDb() ? 'db' : 'local';
      return self.mode;
    });
  },

  /* ------------------------------------------------------------------
     读：某个 target 下面的全部留言
     ------------------------------------------------------------------ */
  list(target) {
    const self = this;
    return this.ready().then(function () {
      if (self.mode === 'cloud') {
        return self.cloudReq('?select=*&target=eq.' + encodeURIComponent(target) +
            '&order=created_at.asc')
          .then(function (r) {
            if (!r.ok) { throw new Error('云端读留言失败（' + r.status + '）'); }
            return r.json();
          })
          .then(function (rows) {
            return (Array.isArray(rows) ? rows : []).map(function (r) { return self.fromRow(r); });
          })
          .catch(function (e) {
            /* 云端读不到 → 退回本机存的留言（可能不全，但不会一片空白） */
            if (typeof console !== 'undefined') { console.warn('[comments]', e.message); }
            return self.localAll()[target] || [];
          });
      }
      if (self.mode === 'db') {
        return fetch('/api/comments/' + encodeURIComponent(target))
          .then(function (r) { return r.json(); })
          .then(function (d) { return (d && d.items) ? d.items : []; })
          .catch(function () { return []; });
      }
      const all = self.localAll();
      return all[target] || [];
    }).then(function (rows) {
      self.cache[target] = rows;
      return rows;
    });
  },

  /* ------------------------------------------------------------------
     写：发一条
     ------------------------------------------------------------------ */
  add(target, name, content, parentId) {
    const self = this;
    return this.ready().then(function () {
      /* 回复的话，把父亲的 id 一起交给后端 —— 后端会自己校验它是否存在 */
      const pid = (parentId === undefined || parentId === null || String(parentId) === '')
        ? null : parentId;

      /* 登录了（管理员或注册用户）→ 留言自动带上你的邮箱身份，
         游客留言则不带。name 用表单里填的（登录后会预填昵称，还能改）。 */
      const who = (typeof Auth !== 'undefined' && Auth.user && Auth.user.email)
        ? Auth.user.email : null;

      if (self.mode === 'cloud') {
        const extra = {};
        /* 登录用户的留言带 access_token —— RLS 的 insert 策略认它；
           没登录就是 anon，同样能发（游客留言）。 */
        if (typeof Auth !== 'undefined' && Auth.token && Auth.token()) {
          extra.Authorization = 'Bearer ' + Auth.token();
        }
        const row = {
          target: target,
          name: name,
          content: content,
          parent_id: pid,
          created_at: new Date().toISOString()
        };
        if (who) { row.userEmail = who; }
        return self.cloudReq('', {
          method: 'POST',
          headers: Object.assign({ Prefer: 'return=representation' }, extra),
          body: row
        }).then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && (d.error || d.message)) {
              throw new Error(d.message || d.error || '云端没写上');
            }
            const got = Array.isArray(d) ? d[0] : d;
            return got && got.id
              ? self.fromRow(got)
              : { id: 'c' + Date.now(), target: target, name: name, content: content,
                  createdAt: new Date().toISOString() };
          })
          .catch(function (e) {
            /* 云端写不进去（网络不通 / 免费项目被暂停）→ 先存到本机。
               访客这条留言不至于丢，也不会看到干巴巴的「发送失败」。 */
            if (typeof console !== 'undefined') {
              console.warn('[comments] 云端没写进去，先存本机：', (e && e.message) || e);
            }
            const all = self.localAll();
            const row = {
              id: 'L' + Date.now(), target: target, name: name, content: content,
              parentId: pid, createdAt: new Date().toISOString()
            };
            if (who) { row.userEmail = who; }
            if (!all[target]) { all[target] = []; }
            all[target].push(row);
            self.localSave(all);
            return row;
          });
      }
      if (self.mode === 'db') {
        return fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: target, name: name, content: content, parentId: pid })
        }).then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.error) { throw new Error(d.error); }
            return d;
          });
      }
      const all = self.localAll();
      const row = {
        id: 'L' + Date.now(),
        target: target,
        name: name,
        content: content,
        parentId: pid,
        createdAt: new Date().toISOString()
      };
      if (who) { row.userEmail = who; }
      if (!all[target]) { all[target] = []; }
      all[target].push(row);
      self.localSave(all);
      return row;
    });
  },

  /* 删：只有管理员能删（按钮上加了 data-admin-only，这里再问一次）

     ▍为什么云端（Supabase）反而不能直接删？
       Supabase 的权限是写在建表 SQL 里的。要做到「只有站长能删」，
       就得让网页在调用 API 时带上登录身份，而那会把密钥权限放大 ——
       任何访客绕过网页直接调 REST 接口就能删光留言。
       所以云端那条 DELETE 策略干脆不给：网页上的 ✕ 改成提示你去后台删。
       数据库模式（本机 server.js）走的是 X-Admin-Token 鉴权，照旧可以删。 */
  remove(id, target) {
    const self = this;
    if (typeof Auth !== 'undefined' && !Auth.isAdmin()) { return Promise.resolve(false); }
    return this.ready().then(function () {
      if (self.mode === 'cloud') {
        if (typeof App !== 'undefined' && App.toast) {
          App.toast('云端留言需要到 Supabase 后台的 Table Editor 里手动删除');
        }
        return false;
      }
      if (self.mode === 'db') {
        const headers = {};
        if (typeof Auth !== 'undefined' && Auth.token) {
          const token = Auth.token();
          if (token) { headers['X-Admin-Token'] = token; }
        }
        return fetch('/api/comments/' + encodeURIComponent(String(id)),
                     { method: 'DELETE', headers: headers })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            /* 403 = 服务端没认这张凭证，多半是登录过期了，重登一次就好 */
            if (d && d.error) { throw new Error(d.error); }
            return true;
          })
          .catch(function (e) {
            if (typeof App !== 'undefined' && App.toast) { App.toast(e.message || '没删掉'); }
            return false;
          });
      }
      const all = self.localAll();
      if (all[target]) {
        all[target] = all[target].filter(function (r) {
          /* 连回复一起删 —— 留下一堆找不着爹的回复更让人糊涂 */
          return String(r.id) !== String(id) && String(r.parentId || '') !== String(id);
        });
        self.localSave(all);
      }
      return true;
    });
  },

  /* ---------- 本地模式的读写 ---------- */
  localAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY) || '{}') || {}; }
    catch (e) { return {}; }
  },
  localSave(all) {
    try { localStorage.setItem(this.KEY, JSON.stringify(all)); }
    catch (e) { /* 存不下就算了，不影响看 */ }
  },
  nick() {
    try { return localStorage.getItem(this.NICK) || ''; } catch (e) { return ''; }
  },
  saveNick(n) {
    try { localStorage.setItem(this.NICK, n); } catch (e) { /* 同上 */ }
  },

  /* ------------------------------------------------------------------
     把 ISO 时间变成「10-10 23:04」这种人看得懂的样子
     ------------------------------------------------------------------ */
  time(iso) {
    if (!iso) { return ''; }
    const d = new Date(iso);
    if (isNaN(d.getTime())) { return String(iso).slice(0, 10); }
    const p = function (n) { return n < 10 ? '0' + n : String(n); };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  },

  /* ------------------------------------------------------------------
     渲染一个留言盒子
     ------------------------------------------------------------------ */
  mount(box) {
    if (!box || box.dataset.cmounted === '1') { return; }
    /* 收在折叠区里的盒子（小诗没展开时）先别管它 —— 等展开再加载，
       免得一次打开网页就把所有留言都拉一遍。 */
    if (box.offsetParent === null) { return; }
    box.dataset.cmounted = '1';

    const target = box.getAttribute('data-comments') || '';
    if (!target) { return; }
    const self = this;

    box.innerHTML =
      '<div class="comments__head">' +
        '<b class="comments__title">留言</b>' +
        '<span class="comments__count" data-c-count>加载中…</span>' +
      '</div>' +
      '<div class="comments__list" data-c-list></div>' +
      '<div class="comments__form">' +
        '<div class="comments__row">' +
          '<input type="text" class="comments__nick" data-c-nick maxlength="24" placeholder="你的名字（可不填）">' +
        '</div>' +
        '<textarea class="comments__text" data-c-text maxlength="1000" rows="2" ' +
          'placeholder="说点什么吧 —— 不用登录，写完点「留言」就留下来了"></textarea>' +
        '<div class="comments__foot">' +
          '<span class="comments__hint" data-c-hint></span>' +
          '<button class="btn btn--sm btn--primary" type="button" data-c-send>留言</button>' +
        '</div>' +
      '</div>';

    const listEl = box.querySelector('[data-c-list]');
    const countEl = box.querySelector('[data-c-count]');
    const hintEl = box.querySelector('[data-c-hint]');
    const nickEl = box.querySelector('[data-c-nick]');
    const textEl = box.querySelector('[data-c-text]');
    const sendEl = box.querySelector('[data-c-send]');

    if (nickEl && self.nick()) { nickEl.value = self.nick(); }
    /* 登录了就把昵称预填进名字框（仍可改）—— 留言身份一目了然 */
    if (nickEl && !nickEl.value && typeof Auth !== 'undefined' && Auth.user) {
      nickEl.value = Auth.user.nickname || '';
    }

    /* 画列表 */
    const paint = function (rows) {
      const total = (rows || []).length;
      if (!total) {
        listEl.innerHTML = '<p class="comments__empty">还没有人留言 —— 你可以是第一个。</p>';
        countEl.textContent = '0 条';
        return;
      }
      countEl.textContent = total + ' 条';

      /* 「回复某层楼」的小输入框：一次只开一个，点哪条就在哪条下面展开 */
      const replyTo = { id: null };

      const oneHtml = function (r, isReply) {
        return '' +
          '<div class="comment' + (isReply ? ' comment--reply' : '') + '" data-cid="' + App.escape(String(r.id)) + '">' +
            '<div class="comment__top">' +
              '<span class="comment__name">' + App.escape(r.name || '匿名') + '</span>' +
              (isReply ? '<span class="comment__arrow" aria-hidden="true">↳</span>' : '') +
              '<span class="comment__time">' + App.escape(self.time(r.createdAt)) + '</span>' +
              '<button class="icon-mini comment__reply" type="button" data-c-reply ' +
                'title="回复这条">↩</button>' +
              '<button class="icon-mini comment__del" type="button" data-c-del ' +
                'data-admin-only title="删除这条留言">✕</button>' +
            '</div>' +
            '<p class="comment__text">' + App.escape(r.content || '').replace(/\n/g, '<br>') + '</p>' +
          '</div>';
      };

      const render = function () {
        const top = self.nest(rows);
        let html = '';
        top.forEach(function (t) {
          html += oneHtml(t, false);
          /* 回复区：有自己的小框，缩进一点点，看着像「楼中楼」 */
          html += '<div class="comment__kids" data-kids="' + App.escape(String(t.id)) + '">' +
            (t.replies || []).map(function (k) { return oneHtml(k, true); }).join('') +
          '</div>';
        });
        listEl.innerHTML = html;
        bind(listEl);
      };

      /* 渲染完再绑事件：节点是临时生成的，每次重画都要重新挂一次 */
      const bind = function (root) {
        App.qsa('[data-c-del]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (typeof Auth !== 'undefined' && !Auth.gate()) { return; }
            const cid = btn.closest('.comment').getAttribute('data-cid');
            /* 站点自带确认框就用它，没有（老版本 main.js）退回浏览器原生的 */
            const ask = (typeof App.confirm === 'function')
              ? App.confirm({
                  title: '删掉这条留言？',
                  desc: '连同它下面的回复一起删，删了就找不回来了。',
                  okText: '删掉',
                  danger: true
                })
              : Promise.resolve(window.confirm('连同回复一起删掉这条留言？'));

            ask.then(function (yes) {
              if (!yes) { return; }
              self.remove(cid, target).then(function () { return self.list(target); })
                .then(paint);
            });
          });
        });

        App.qsa('[data-c-reply]', root).forEach(function (btn) {
          btn.addEventListener('click', function () {
            const box = btn.closest('.comment');
            const cid = box.getAttribute('data-cid');
            /* 点同一个人的「回复」= 收起，算个开关 */
            const old = App.qs('.comment-reply', listEl);
            if (old) { old.remove(); }
            if (replyTo.id === cid) { replyTo.id = null; return; }
            replyTo.id = cid;
            openReplyBox(box, cid);
          });
        });
      };

      /* 在某一楼下面插一个小输入框 */
      const openReplyBox = function (box, cid) {
        const wrap = document.createElement('div');
        wrap.className = 'comment-reply';
        wrap.innerHTML =
          '<textarea class="comment-reply__text" rows="2" maxlength="1000" ' +
            'placeholder="回复这一条…"></textarea>' +
          '<div class="comment-reply__foot">' +
            '<button class="btn btn--sm" type="button" data-r-cancel>取消</button>' +
            '<button class="btn btn--sm btn--primary" type="button" data-r-send>回复</button>' +
          '</div>';
        box.appendChild(wrap);

        const text = wrap.querySelector('.comment-reply__text');
        text.focus();

        wrap.querySelector('[data-r-cancel]').addEventListener('click', function () {
          wrap.remove();
          replyTo.id = null;
        });
        const sendReply = function () {
          const val = (text.value || '').trim();
          if (!val) { App.toast('先写点什么再回复'); text.focus(); return; }
          const name = (nickEl.value || '').trim() || '匿名';
          self.saveNick(name === '匿名' ? '' : name);
          const btn = wrap.querySelector('[data-r-send]');
          btn.disabled = true; btn.textContent = '发送中…';
          self.add(target, name, val, cid).then(function () { return self.list(target); })
            .then(function (rows2) {
              paint(rows2);
              App.toast('回复已发布');
            }).catch(function (e) {
              App.toast(e.message || '没发出去，再试一次');
              btn.disabled = false; btn.textContent = '回复';
            });
        };
        wrap.querySelector('[data-r-send]').addEventListener('click', sendReply);
        text.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { sendReply(); }
        });
      };

      render();
    };

    /* 第一次拉数据；顺手把「存在哪」说清楚 */
    self.list(target).then(function (rows) {
      paint(rows);
      if (hintEl) {
        hintEl.textContent =
          self.mode === 'cloud' ? '留言存在云端 —— 任何人打开这个网站都能看到'
          : self.mode === 'db'  ? '留言保存在站点数据库里，同一台服务器上的访客都能看到'
          : '还没配置云端存储 —— 留言只留在你自己这台设备的浏览器里';
      }
    });

    /* 发送 */
    const send = function () {
      const content = (textEl.value || '').trim();
      if (!content) {
        if (typeof App !== 'undefined' && App.toast) { App.toast('先写点内容再发'); }
        textEl.focus();
        return;
      }
      const name = (nickEl.value || '').trim() || '匿名';
      self.saveNick(name === '匿名' ? '' : name);

      sendEl.disabled = true;
      sendEl.textContent = '发送中…';
      self.add(target, name, content).then(function () {
        textEl.value = '';
        return self.list(target);
      }).then(function (rows) {
        paint(rows);
        if (typeof App !== 'undefined' && App.toast) { App.toast('留言已发布'); }
      }).catch(function (e) {
        if (typeof App !== 'undefined' && App.toast) { App.toast(e.message || '没发出去，再试一次'); }
      }).then(function () {
        sendEl.disabled = false;
        sendEl.textContent = '留言';
      });
    };

    if (sendEl) { sendEl.addEventListener('click', send); }
    /* Ctrl + Enter 直接发 */
    if (textEl) {
      textEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { send(); }
      });
    }
  },

  /* 扫一遍容器里所有留言盒子。不传 scope 就整页扫 */
  mountAll(scope) {
    const root = scope || document;
    const boxes = App.qsa('[data-comments]', root);
    const self = this;
    boxes.forEach(function (b) { self.mount(b); });
    return boxes.length;
  }
};

window.Comments = Comments;

/* 页面一打开，先把页面上写死的那些盒子挂上。
   后来动态渲染出来的（比如点开一篇文章的弹窗、展开一条小诗），
   由各自的 js 在渲染完调一句 Comments.mountAll(容器)。 */
document.addEventListener('DOMContentLoaded', function () {
  Comments.mountAll();
});
