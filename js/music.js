/* ==========================================================================
   music.js —— 唱片机脚本（只服务音乐页）
   --------------------------------------------------------------------------
   它做的事：
     1. 渲染碟架（[data-records]）—— **按分类分组**，同类的歌摆在一起
     2. 切换唱片 / 播放 / 暂停 / 上一首 / 下一首 / 随机
     3. 播放：src 指向的文件在 assets/audio/ 里就真的有声音
        · 后缀随便 —— 写的是 .mp3，你放的是 .m4a / .ogg / .wav / .flac 也认
        · 放法随便 —— 平铺（assets/audio/歌名.mp3）或者
          分文件夹（assets/audio/摇滚/歌名.mp3、assets/audio/梁博/歌名.mp3）都行
          （两种都在下面 audioCandidates() 里展开成候选，先找到哪个用哪个）
        · 文件不在 → 只转唱片不出声，并明确告诉你「缺哪个文件」
        · 碟架和唱片机下面都会实时标出「本地有声 / 待放文件」
     4. 键盘左右键切换唱片，空格播放 / 暂停
     5. 「＋ 添加唱片」和每张碟右上角的「✎」→ 在弹窗里增删改
        · 跑了 server.js（数据库模式）→ 写进 db/site.db
        · 直接双击打开（本地模式）  → 存在浏览器里
     6. 网址后面带 ?id=m3 进来 → 直接选中那一首
        （首页歌单点一首，走的就是这条路）

   ▍为什么全站没有「外部链接」
     早先有过「跳去网易云 / B站」和一版网易云外链播放器，9-17 都去掉了 ——
     想让听歌这件事只有一个口径：**文件在自己手里就放得出来**。
     所以页面上不再有任何跳转出口，也不联网取任何东西。

   ▍它现在长在首页
     10-10 起音乐不再单独占一页：整台唱片机搬到了 index.html 底部的
     「曲音拾集」区块（#music）。脚本还是这一个，页面换了而已。
     播放界面全站只有这一套，不用维护两份。

   ▍关于本地音频
     这六首都是有版权的商业歌曲，站点不提供下载，
     只负责「你自己手上的文件就放出来」。文件名对得上就自动生效，
     对不上就在弹窗里改一下「本地音频」那一栏。

     注意：QQ音乐 / 网易云下载的加密格式（.mgg / .qmc0 / .ncm / .mflac 之类）
     浏览器放不了，得先有普通音频格式的文件才行。
   ========================================================================== */

/* 本地音频认这些后缀，按顺序试。
   data.js 里统一写 .mp3，但你实际放进来的文件是什么后缀都行 ——
   写了 .mp3 而文件夹里是 .m4a，照样能找出来。
   mp3 排第一：体积小、所有浏览器都认，是首选。 */
const AUDIO_EXTS = ['mp3', 'm4a', 'ogg', 'wav', 'flac', 'aac', 'opus'];

/* 把一个地址展开成一份「候选清单」，挨个去试。
   两个维度都能容错：**后缀**和**放法**。

   ① 后缀：data.js 里统一写 .mp3，你实际放的是 .m4a / .ogg / .wav 也行。
   ② 放法：平铺和分文件夹都认 ——

        assets/audio/Echoes.mp3            ← 平铺（首选，最省事）
        assets/audio/氛围/Echoes.mp3       ← 按分类分文件夹
        assets/audio/梁博/Echoes.mp3       ← 按歌手分文件夹

     分类文件夹的名字从哪来？由调用方把「分类」「歌手」当候选目录传进来
     （folders 参数）。不递归扫盘 —— `file://` 下脚本读不了目录，
     只能拿已知的名字去试。要是你把文件放进了一个别的名字的文件夹，
     直接在弹窗里把「本地音频」改成完整路径就行。

   平铺排在前面，命中率最高、也最少请求。

   三种情况原样返回、不展开：
     · 网络地址（http / https）—— 后缀是服务器的事，乱换只会试出一堆 404
     · 带 ? 或 # 的地址 —— 在后面拼后缀会拼出一个无效地址
     · 末端没有点（没有文件名）—— 那就直接把后缀接上去 */
function audioCandidates(src, folders) {
  if (!src) { return []; }
  if (/^(https?:)?\/\//i.test(src) || /[?#]/.test(src)) { return [src]; }

  const dot = src.lastIndexOf('.');
  const slash = Math.max(src.lastIndexOf('/'), src.lastIndexOf('\\'));

  if (dot <= slash) {
    return AUDIO_EXTS.map(function (ext) { return src + '.' + ext; });
  }

  const base = src.slice(0, dot);          /* assets/audio/Echoes */
  const own = src.slice(dot + 1).toLowerCase();
  const file = base.slice(slash + 1);      /* Echoes */
  const dir = base.slice(0, slash + 1);    /* assets/audio/ */

  /* 候选目录：先平铺，再分类、歌手。同一个名字只留一次 */
  const prefixes = [''];
  (folders || []).forEach(function (f) {
    const folder = String(f == null ? '' : f).trim();
    if (!folder) { return; }
    /* 斜杠和反斜杠都收拾干净，免得拼出 assets/audio//摇滚/ 这种地址 */
    const clean = folder.replace(/^[\/\\]+|[\/\\]+$/g, '');
    if (!clean) { return; }
    if (prefixes.indexOf(clean + '/') >= 0) { return; }
    prefixes.push(clean + '/');
  });

  /* 后缀顺序：src 自己写的那个排第一，其余按 AUDIO_EXTS 的顺序兜底 */
  const exts = [own].concat(AUDIO_EXTS.filter(function (e) { return e !== own; }));

  const list = [];
  prefixes.forEach(function (prefix) {
    exts.forEach(function (ext) {
      list.push(dir + prefix + file + '.' + ext);
    });
  });
  return list;
}

const MusicPage = {

  state: {
    all: [],        /* 全部唱片 */
    currentIndex: 0,
    playing: false,
    hinted: false,  /* 「还没有音频文件」这句提示只说一次，不反复弹 */
    userWantsPlay: false,  /* 用户点过「播放」才置真。页面加载时 resolveSrc
                              也会 audio.load() 那个地址、缺文件就报 error，
                              那时不算用户想听 —— 别弹提示，
                              免得一进页面就被糊一句「没找到文件」 */
    editingId: null,/* 弹窗里正在编辑哪张碟；新增时是 null */
    seeking: false, /* 是不是正拖着进度条（true 时别让 timeupdate 抢方向盘） */
    /* 探过的 src → 真正命中的那个地址（字符串），没探到则是 false。
       同一个地址不重复探第二次。 */
    probe: {},
    /* 正在探、还没出结果的地址 → 排队的回调数组。
       同一首要是在探测途中被点了两次，就等同一个结果，不重复发请求。 */
    probing: {}
  },

  init() {
    this.bindControls();
    this.bindKeyboard();
    this.bindAudio();
    this.bindModal();
    this.load();
  },

  /* ---------- 读数据 ---------- */
  load() {
    const self = this;
    return SiteAPI.getMusic().then(function (list) {
      self.state.all = list;
      self.renderRecords();       /* 碟架 */
      /* 选中哪一张、但不自动播放 —— 浏览器会拦「不是用户点出来」的播放 */
      self.select(self.initialIndex(list), false);
    });
  },

  /* 该选中第几张。
     网址后面带 ?id=3 进来（首页歌单点的那一首）就直接选它；
     没有参数、或者 id 对不上（比如那首歌被删了），退回第一张。

     ▍两边 id 的类型不一样，必须都转成字符串再比：
       · 本地模式（file://）→ data.js 里写的是 'm1'、'm2'
       · 数据库模式        → 库里的主键是数字 1、2
     而网址参数取出来一定是字符串（'1'），直接 === 比数字永远不相等。 */
  initialIndex(list) {
    const total = list.length;
    if (!total) { return 0; }

    let wanted = '';
    try {
      wanted = new URLSearchParams(window.location.search).get('id') || '';
    } catch (e) { wanted = ''; }   /* 老浏览器没有 URLSearchParams，就当没传 */

    if (wanted) {
      for (let i = 0; i < total; i += 1) {
        if (String(list[i].id) === wanted) { return i; }
      }
    }
    return Math.min(this.state.currentIndex, total - 1);
  },

  /* ---------- 1. 唱片列表 ---------- */

  /* 探一下本地到底有没有这个音频文件，顺便问出它是哪个后缀。

     为什么不用 fetch(src, {method:'HEAD'})：直接双击打开网页时是 file://，
     浏览器不允许脚本读本地文件，HEAD 一定失败，会把「有文件」误判成「没有」。
     造一个临时 <audio> 只读元数据就没这个限制：
       读得到 metadata → 文件在
       触发 error      → 这个后缀下没有，换下一个后缀试

     回调收到两个参数：done(ok, 真正命中的那个地址)。
     没探到时是 done(false, null)。

     folders 是额外的候选目录名（分类、歌手），交给 audioCandidates 去拼 ——
     这样文件放平铺还是放分类文件夹里都能找出来。

     结果缓存在 state.probe 里，同一首切回来不用再探一次。 */
  probeLocal(src, folders, done) {
    if (!src) { done(false, null); return; }

    const cache = this.state.probe;
    if (Object.prototype.hasOwnProperty.call(cache, src)) {
      const hit = cache[src];
      done(!!hit, hit || null);
      return;
    }

    /* 已经在探同一个地址了：挂在后面等同一个结果，别再发一轮 */
    if (this.state.probing[src]) {
      this.state.probing[src].push(done);
      return;
    }
    this.state.probing[src] = [done];

    /* 一次探测里所有候选共用这个总预算。
       候选可能不少（平铺 + 分类 + 歌手，每个再乘 7 种后缀），
       不总量限时的话，挨个等 4 秒能拖到一分多钟。
       正常情况文件在本地，几十毫秒就命中了，这个值只决定「多久之后放弃」。 */
    const deadline = Date.now() + 12000;
    const list = audioCandidates(src, folders);
    let i = 0;

    const settle = function (ok, url) {
      const waiting = MusicPage.state.probing[src] || [];
      delete MusicPage.state.probing[src];
      cache[src] = ok ? url : false;
      waiting.forEach(function (fn) { fn(ok, url); });
    };

    const tryNext = function () {
      if (i >= list.length) { settle(false, null); return; }

      const url = list[i];
      i += 1;

      /* http(s) 打开时先用 HEAD 问一下服务器（快、也最可靠）；
         404 或 file://（脚本不允许读本地文件，HEAD 必失败）再走下面的
         临时 <audio> 元素兜底。 */
      if (/^https?:/i.test(location.protocol)) {
        fetch(encodeURI(url).replace(/%3A/gi, ':').replace(/%2F/gi, '/'), { method: 'HEAD' })
          .then(function (r) {
            if (r.ok) { settle(true, url); } else { tryNext(); }
          })
          .catch(function () { probeWithAudio(url); });
        return;
      }

      probeWithAudio(url);
    };

    /* file:// 兜底：造一个临时 <audio> 只读元数据 —— 浏览器不许脚本读
       本地文件，但允许媒体元素加载，读得到 metadata 就是文件在。 */
    function probeWithAudio(url) {
      const probe = new Audio();
      let settled = false;

      const finish = function (ok) {
        if (settled) { return; }
        settled = true;
        clearTimeout(timer);
        /* 把探测用的元素放掉，别占着文件句柄 */
        probe.removeAttribute('src');

        if (ok) { settle(true, url); } else { tryNext(); }
      };

      /* 兜底：万一两个事件都没来（文件被占用、盘符掉线之类），
         别让界面永远停在「检查中…」。
         单个后缀最多等 4 秒，整体不超过上面那个总预算。
         正常情况本地文件几十毫秒就回来了，这个值只影响「多久之后放弃等待」。 */
      const left = Math.max(1200, deadline - Date.now());
      const timer = setTimeout(function () { finish(false); }, Math.min(left, 4000));

      probe.addEventListener('loadedmetadata', function () { finish(true); });
      probe.addEventListener('error', function () { finish(false); });

      probe.preload = 'metadata';
      probe.src = url;
    }

    tryNext();
  },

  /* 把「当前这首」真正要播的地址挂到页面底部那个 <audio> 上。
     会先探测一遍 —— 因为 data.js 里写的是 .mp3，
     而实际文件可能是 .m4a / .ogg / .flac，得找出真正存在的那个。

     探过的地址会同步回调，所以常规切歌不会有一点点延迟。
     done(ok, url)：ok 表示找到了可用文件。 */
  resolveSrc(done) {
    const audio = this.audio();
    const m = this.state.all[this.state.currentIndex];
    const self = this;

    if (!audio) { if (done) { done(false, null); } return; }

    if (!m || !m.src) {
      audio.pause();
      audio.removeAttribute('src');
      if (done) { done(false, null); }
      return;
    }

    /* 分类名和歌手名都当候选目录名传进去 ——
       文件放在 assets/audio/摇滚/ 里或者 assets/audio/梁博/ 里都能被找到 */
    this.probeLocal(m.src, [m.genre, m.artist], function (ok, found) {
      /* 探不到也把 data.js 里写的地址挂上去：
         浏览器会自己报错，用户能拿到「缺哪个文件」的明确提示，
         比什么都不挂、点了没反应要好。 */
      const url = ok ? found : m.src;

      /* 探测是异步的，回来时用户可能已经切歌了 —— 结果对不上就丢掉 */
      const now = self.state.all[self.state.currentIndex];
      if (!now || now.src !== m.src) { return; }

      if (audio.getAttribute('src') !== url) {
        /* 先把上一首停掉，免得「画面已经是下一首、耳朵里还是上一首」 */
        audio.pause();
        audio.setAttribute('src', url);
        audio.load();          /* 重置一下状态，让新地址生效 */
      }
      self.syncProgress();
      /* 探出结果了，把碟架上那颗小标签和下面那行提示刷新一下
         （这两个都不再自己发请求，只是读缓存） */
      self.markLocalAudio();
      self.updateHint();
      if (done) { done(ok, url); }
    });
  },

  /* 碟架上给每张碟标一句「本地有没有文件」

     ★ 这里以前是「每首歌都探一遍」—— 页面一打开就对 6 个 mp3 发 HEAD 请求，
       而音频是本地文件、本来就不该预加载，那些请求还常被切歌打断、全成废请求。
       现在改成：只显示「已经探过的」（也就是你点过播放的那几首），
       没探过就写「未检测」，等你点播放再去问一次，结果就记住了。 */
  markLocalAudio() {
    const self = this;

    App.qsa('[data-local-index]').forEach(function (badge) {
      const index = Number(badge.getAttribute('data-local-index'));
      const m = self.state.all[index];
      if (!m) { return; }

      if (!m.src) {
        badge.textContent = '未配音频';
        badge.className = 'chip chip--local is-off';
        return;
      }

      const hit = self.state.probe[m.src];
      if (hit === true || (typeof hit === 'string' && hit)) {
        badge.textContent = '本地有声';
        badge.className = 'chip chip--local is-ok';
      } else if (hit === false) {
        badge.textContent = '待放文件';
        badge.className = 'chip chip--local is-off';
      } else {
        badge.textContent = '未检测';
        badge.className = 'chip chip--local';
      }
    });
  },

  /* 唱片机下面那行提示：按当前这张碟有没有文件实时改写 */
  updateHint() {
    const box = App.qs('#audioHint');
    if (!box) { return; }

    const m = this.state.all[this.state.currentIndex];
    if (!m) { box.textContent = ''; return; }

    if (!m.src) {
      box.innerHTML = '这首歌没有配本地音频，点那张碟的「✎」把路径填上就行。';
      return;
    }

    const src = m.src;

    /* ★ 懒加载：页面打开时不探（省掉 6 个没必要的请求），
       只有你点过播放、这首歌被探过之后，这里才有话要说。 */
    const hit = this.state.probe[src];
    if (hit === undefined) {
      box.innerHTML = '音频是点「播放」时才加载的 —— 页面打开不预先下载，省点流量。';
      return;
    }

    const done = function (ok, found) {
      /* 探测是异步的，回来的时候用户可能已经切歌了。
         比对一下 src 还是不是当前这首，不是就丢弃这次结果。 */
      const now = MusicPage.state.all[MusicPage.state.currentIndex];
      if (!now || now.src !== src) { return; }

      if (ok) {
        /* 把「实际用的是哪个文件」说出来 —— 连它所在的子文件夹一起说。
           这样「我明明放了文件怎么不响」这种疑问不用问第二遍，
           也能一眼看出程序是从分类文件夹里找到的。 */
        const shown = String(found).replace(/^.*?assets\/audio\//, '');
        box.innerHTML = '本地音频已就位：实际用的是 <code>' + App.escape(shown) +
          '</code>，点「播放」就有声音了。';
      } else {
        box.innerHTML = '还没找到 <code>' + App.escape(src) + '</code> —— ' +
          '把文件放进 <code>assets/audio/</code> 就行：' +
          '平铺（<code>assets/audio/Echoes.mp3</code>）或者' +
          '按分类建文件夹（<code>assets/audio/民谣/Far From Home.mp3</code>）都认，' +
          '名字对得上就自动生效，不用回来改配置。';
      }
    };

    /* 探过了就直接用缓存里的结果（true = 找到了，字符串 = 真正命中的地址），
       不再发第二次请求 */
    done(hit !== false, typeof hit === 'string' ? hit : src);
  },

  renderRecords() {
    const box = App.qs('[data-records]');
    if (!box) { return; }

    if (!this.state.all.length) {
      box.innerHTML = '<p class="records__empty">碟架还是空的，点右上角的「＋ 添加唱片」放一张上去。</p>';
      return;
    }

    /* ── 按分类分组 ──────────────────────────────────────────────
       分组顺序 = 分类「第一次出现」的顺序，也就是 data.js 里的书写顺序，
       不另外排序 —— 想调顺序，在数据里挪一下就有了。
       没写分类的（genre 空）统一归到「未分类」，不会丢。 */
    const groups = [];
    const seen = {};
    this.state.all.forEach(function (m, i) {
      const name = String(m.genre || '').trim() || '未分类';
      if (!seen[name]) {
        seen[name] = { name: name, items: [] };
        groups.push(seen[name]);
      }
      seen[name].items.push({ track: m, index: i });
    });

    box.innerHTML = groups.map(function (group) {
      return '' +
        '<div class="record-group">' +
          '<div class="record-group__head">' +
            '<h3 class="record-group__name">' + App.escape(group.name) + '</h3>' +
            '<span class="record-group__count">' + group.items.length + ' 首</span>' +
          '</div>' +
          '<div class="records__grid">' +
            group.items.map(function (cell) {
              const m = cell.track;
              const i = cell.index;
              return '' +
                '<article class="card record" data-index="' + i + '">' +
                  '<button class="record__edit" type="button" data-admin-only data-edit-index="' + i +
                    '" title="编辑这张唱片" aria-label="编辑 ' + App.escape(m.name) + '">✎</button>' +
                  '<div class="record__cover"><i></i></div>' +
                  '<div class="record__body">' +
                    '<div class="record__name">' + App.escape(m.name) + '</div>' +
                    '<div class="record__artist">' + App.escape(m.artist) + ' · ' + App.escape(m.duration) + '</div>' +
                    '<p class="record__note">' + App.escape(m.note) + '</p>' +
                    /* 卡片上只留「本地有声 / 待放文件」这一枚状态标 */
                    '<div class="record__links">' +
                      '<span class="chip chip--local" data-local-index="' + i + '"></span>' +
                    '</div>' +
                  '</div>' +
                '</article>';
            }).join('') +
          '</div>' +
        '</div>';
    }).join('');

    App.qsa('.record', box).forEach(function (item) {
      const index = Number(item.getAttribute('data-index'));

      /* 点卡片本身：切换到这张唱片 */
      item.addEventListener('click', function () {
        MusicPage.select(index, true);
      });

      /* 点「✎」：打开编辑弹窗。
         这个按钮在卡片里面，它的事件会先触发；stopPropagation 之后
         就不会再顺带触发卡片的「切换唱片」了。 */
      const edit = App.qs('[data-edit-index]', item);
      if (edit) {
        edit.addEventListener('click', function (e) {
          e.stopPropagation();
          MusicPage.openEditor(index);
        });
      }
    });

    /* 列表画完了，接着去探每张碟的本地文件在不在 */
    this.markLocalAudio();
  },

  /* ---------- 2. 切换到某张唱片 ---------- */
  select(index, autoPlay) {
    if (!this.state.all.length) { return; }
    /* 循环：最后一张往后回到第一张 */
    if (index < 0) { index = this.state.all.length - 1; }
    if (index >= this.state.all.length) { index = 0; }

    this.state.currentIndex = index;
    const m = this.state.all[index];

    /* 更新唱片机上的信息 */
    const nameBox = App.qs('[data-player-name]');
    const artistBox = App.qs('[data-player-artist]');
    const noteBox = App.qs('[data-player-note]');
    const labelBox = App.qs('[data-disc-label]');
    const indexBox = App.qs('[data-player-index]');

    if (nameBox) { nameBox.textContent = m.name; }
    if (artistBox) { artistBox.textContent = m.artist + ' · ' + m.duration; }
    if (noteBox) { noteBox.textContent = m.note; }
    if (labelBox) { labelBox.textContent = m.name; }
    if (indexBox) {
      indexBox.textContent = App.pad(index + 1) + ' / ' + App.pad(this.state.all.length);
    }

    /* 高亮列表里对应的那张 */
    App.qsa('.record').forEach(function (item, i) {
      item.classList.toggle('is-active', i === index);
    });

    /* 换歌时把 <audio> 的地址也换掉。
       地址交给 resolveSrc —— 它会探出「真正存在的那个后缀」
       （data.js 里写 .mp3，你放的是 .m4a 也能认）。

       注意 audio 的 preload 是 none：这里只挂地址，不去取文件，
       真正取是点「播放」那一刻 —— 本地文件很可能还没放进来，
       提前去要只会在控制台刷一串 404，没意义。 */
    this.updateHint();

    /* ★ 懒加载：换碟 / 页面打开时不去解析地址（那会立刻发一个探测请求），
       只有真要出声（点播放、或带 ?id= 自动播放）才去解析。
       play() 里也会走一遍 resolveSrc，所以点播放这条路不受影响。 */
    if (autoPlay) {
      const self = this;
      this.resolveSrc(function () { self.play(); });
    } else {
      this.pause();
    }
  },

  /* ---------- 3. 播放 / 暂停 ---------- */
  play() {
    this.state.playing = true;
    this.state.userWantsPlay = true;   /* 从这一刻起，放不出来才允许自动降级 */
    const disc = App.qs('.disc');
    const tonearm = App.qs('.tonearm');
    const eq = App.qs('.eq');
    const btn = App.qs('#playBtn');

    if (disc) { disc.classList.add('is-playing'); }
    if (tonearm) { tonearm.classList.add('is-down'); }
    if (eq) { eq.classList.add('is-playing'); }
    if (btn) { btn.innerHTML = '⏸ 暂停'; }

    const m = this.state.all[this.state.currentIndex];
    const audio = this.audio();

    /* 没配本地音频：只转唱片，提示一次就够了 */
    if (!audio || !m || !m.src) {
      this.hintNoAudio();
      return;
    }

    /* 地址可能还没解析成真实后缀（.mp3 写成 .mp3、实际文件是 .m4a）。
       resolveSrc 会先把它敲定再播；命中缓存的回调是同步的，
       所以这里通常不会有一点点延迟。 */
    this.resolveSrc(function () {
      const task = audio.play();
      if (task && typeof task.catch === 'function') {
        task.catch(function (err) {
          MusicPage.pause();
          /* 这里有两种完全不同的失败，别混成一句话：
               NotSupportedError → 地址指向的文件根本不存在（最常发生）
               其它（NotAllowedError 等）→ 浏览器拦了「不是用户点出来的」播放 */
          if (err && err.name === 'NotSupportedError') {
            App.toast('本地没找到这个音频文件 —— 把 mp3 放进 assets/audio/ 里就好');
            MusicPage.state.probe[m.src] = false;
            MusicPage.markLocalAudio();
            MusicPage.updateHint();
          } else {
            App.toast('浏览器拦下了播放，再点一次按钮就好');
          }
        });
      }
    });
  },

  pause() {
    this.state.playing = false;
    const disc = App.qs('.disc');
    const tonearm = App.qs('.tonearm');
    const eq = App.qs('.eq');
    const btn = App.qs('#playBtn');

    if (disc) { disc.classList.remove('is-playing'); }
    if (tonearm) { tonearm.classList.remove('is-down'); }
    if (eq) { eq.classList.remove('is-playing'); }
    if (btn) { btn.innerHTML = '▶ 播放'; }

    const audio = this.audio();
    if (audio && !audio.paused) { audio.pause(); }
  },

  /* 这首歌压根没配 src 时提醒一次就够了，不用每次点都弹。
     （配了 src 但文件还没放进来，走的是播放失败那条路，提示不一样） */
  hintNoAudio() {
    if (this.state.hinted) { return; }
    this.state.hinted = true;
    App.toast('这首没有配本地音频，点那张碟的「✎」把文件路径填上就行');
  },

  toggle() {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  },

  /* ---------- 4. 真正的音频播放 ---------- */

  /* 页面底部那个 <audio> 元素 */
  audio() {
    return App.qs('#audioEl');
  },

  /* 把秒数变成 03:42 这种样子 */
  clock(sec) {
    if (!isFinite(sec) || sec < 0) { sec = 0; }
    return App.pad(Math.floor(sec / 60)) + ':' + App.pad(Math.floor(sec % 60));
  },

  bindAudio() {
    const audio = this.audio();
    if (!audio) { return; }

    /* 播放过程中不断刷新进度条 */
    audio.addEventListener('timeupdate', function () {
      /* 正拖着进度条就别来插一脚 —— 不然刚拖到 1:20 又被刷回原处 */
      if (MusicPage.state.seeking) { return; }
      MusicPage.syncProgress();
    });
    /* 拿到文件信息就知道总时长了 */
    audio.addEventListener('loadedmetadata', function () { MusicPage.syncProgress(); });
    /* 一首放完，自动下一首 */
    audio.addEventListener('ended', function () {
      MusicPage.select(MusicPage.state.currentIndex + 1, true);
    });
    /* 地址填错了 / 文件没放对位置，会走到这里 */
    audio.addEventListener('error', function () {
      const src = audio.getAttribute('src');
      if (!src) { return; }
      MusicPage.pause();
      /* 记下来，碟架上那张碟的标记也跟着变成「待放文件」。
         缓存的键是 data.js 里配的那条地址，不是这里解析出来的地址 ——
         两个可能不是同一个后缀，写错了键下次会重新探一遍。 */
      const m = MusicPage.state.all[MusicPage.state.currentIndex];
      if (m && m.src) { MusicPage.state.probe[m.src] = false; }
      MusicPage.markLocalAudio();
      MusicPage.updateHint();
      /* 页面刚加载时的探测失败（resolveSrc 会 audio.load() 那个地址）
         也会走到这里，那会儿用户什么都没点 —— 只更新碟标和提示行，
         不弹 toast，免得一进页面就被糊一句「没找到文件」。 */
      if (!MusicPage.state.userWantsPlay) { return; }
      /* 用户点过播放才提示。play() 的 catch 也盯着同一次失败，
         两边文案一样，真撞上了看起来只是提示闪了一下。 */
      App.toast('本地没找到 ' + src + ' —— 把 mp3 放进 assets/audio/ 就好');
    });

    /* 进度条：点一下跳过去、**按住拖着走**也能跟着走
       ------------------------------------------------
       以前只绑了 click：必须「点一下定一个位置」，想微调来回点半天。
       现在用 Pointer 事件，鼠标和手指共用一套：
         pointerdown  按下 → 开始拖，立刻跳到按的那个位置
         pointermove  移动 → 跟着手指/鼠标实时走
         pointerup    松手 → 收尾
       拖动过程中暂停 timeupdate 对进度条的刷新，
       否则「我拖到 1:20，它又给我刷回原来的位置」。
       另外给键盘留了后路：← → 每次 5 秒，Home / End 直接跳到头尾。 */
    const bar = App.qs('#progressBar');
    if (bar) {
      const ratioAt = function (clientX) {
        const rect = bar.getBoundingClientRect();
        if (!rect.width) { return 0; }
        return Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
      };

      const seekTo = function (clientX) {
        const a = MusicPage.audio();
        if (!a || !isFinite(a.duration) || !a.duration) { return; }
        a.currentTime = ratioAt(clientX) * a.duration;
        MusicPage.syncProgress();
      };

      bar.addEventListener('pointerdown', function (e) {
        const a = MusicPage.audio();
        if (!a || !isFinite(a.duration) || !a.duration) { return; }
        MusicPage.state.seeking = true;   /* 告诉 timeupdate 先别插手 */
        bar.classList.add('is-dragging');
        /* 指针捕获：拖到进度条外面（甚至页面外）也还跟得住 */
        if (bar.setPointerCapture) {
          try { bar.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器没有就算了 */ }
        }
        seekTo(e.clientX);
        e.preventDefault();
      });

      bar.addEventListener('pointermove', function (e) {
        if (!MusicPage.state.seeking) { return; }
        seekTo(e.clientX);
      });

      const finish = function (e) {
        if (!MusicPage.state.seeking) { return; }
        MusicPage.state.seeking = false;
        bar.classList.remove('is-dragging');
        if (bar.releasePointerCapture && e && e.pointerId != null) {
          try { bar.releasePointerCapture(e.pointerId); } catch (err) { /* 同上 */ }
        }
        MusicPage.syncProgress();
      };
      bar.addEventListener('pointerup', finish);
      bar.addEventListener('pointercancel', finish);

      /* 键盘：← → 快退快进 5 秒，Home / End 跳到头尾 */
      bar.addEventListener('keydown', function (e) {
        const a = MusicPage.audio();
        if (!a || !isFinite(a.duration) || !a.duration) { return; }

        if (e.key === 'Home') { a.currentTime = 0; MusicPage.syncProgress(); e.preventDefault(); return; }
        if (e.key === 'End')  { a.currentTime = Math.max(a.duration - 0.5, 0); MusicPage.syncProgress(); e.preventDefault(); return; }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }

        const step = e.key === 'ArrowRight' ? 5 : -5;
        const next = Math.min(Math.max((a.currentTime || 0) + step, 0), a.duration);
        a.currentTime = next;
        MusicPage.syncProgress();
        e.preventDefault();
      });
    }
  },

  /* 把「播到哪儿了」同步到进度条和时间文字上 */
  syncProgress() {
    const a = this.audio();
    const fill = App.qs('[data-progress-fill]');
    const now = App.qs('[data-time-now]');
    const total = App.qs('[data-time-total]');

    const cur = a ? (a.currentTime || 0) : 0;
    const dur = (a && isFinite(a.duration)) ? a.duration : 0;
    const percent = dur ? (cur / dur) * 100 : 0;

    if (fill) { fill.style.width = percent + '%'; }
    if (now) { now.textContent = this.clock(cur); }

    /* 顺手告诉读屏软件「现在是百分之几」，前面 ARIA 那三个属性才有意义 */
    const bar = App.qs('#progressBar');
    if (bar) { bar.setAttribute('aria-valuenow', String(Math.round(percent))); }

    /* 拿不到真实时长时（本地文件还没放进来，就永远不会 loadedmetadata），
       先显示数据里写好的那个时长，总比一直挂着 --:-- 好看。
       真开始播之后 dur 有值了，会自动换成文件自己的真实时长。 */
    const m = this.state.all[this.state.currentIndex];
    const fallback = (m && m.duration) ? m.duration : '--:--';
    if (total) { total.textContent = dur ? this.clock(dur) : fallback; }
  },

  /* ---------- 5. 按钮 & 键盘 ---------- */
  bindControls() {
    const playBtn = App.qs('#playBtn');
    if (playBtn) {
      playBtn.addEventListener('click', function () { MusicPage.toggle(); });
    }

    const prevBtn = App.qs('#prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        MusicPage.select(MusicPage.state.currentIndex - 1, true);
      });
    }

    const nextBtn = App.qs('#nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        MusicPage.select(MusicPage.state.currentIndex + 1, true);
      });
    }

    /* 随机挑一张 */
    const shuffleBtn = App.qs('#shuffleBtn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', function () {
        const total = MusicPage.state.all.length;
        if (!total) { return; }
        let next = Math.floor(Math.random() * total);
        if (next === MusicPage.state.currentIndex) { next = (next + 1) % total; }
        MusicPage.select(next, true);
        App.toast('随机播放：' + MusicPage.state.all[next].name);
      });
    }

    /* 添加一张新唱片 */
    const addBtn = App.qs('#addRecordBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () { MusicPage.openEditor(null); });
    }
  },

  /* 键盘：← → 切歌，空格播放 / 暂停。
     整页都是播放器的地盘（首页那台播放器已经撤掉了），所以全天候接管；
     只有在输入框里打字、或者编辑弹窗开着的时候让出去。 */
  bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      /* 弹窗开着的时候不响应快捷键，
         不然在改备注时按空格会顺带把唱片「播放」起来 */
      if (document.querySelector('#musicModal.is-open')) { return; }

      /* 在输入框里打字时不响应 */
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') { return; }

      if (e.key === 'ArrowLeft') {
        MusicPage.select(MusicPage.state.currentIndex - 1, true);
      } else if (e.key === 'ArrowRight') {
        MusicPage.select(MusicPage.state.currentIndex + 1, true);
      } else if (e.key === ' ') {
        e.preventDefault();
        MusicPage.toggle();
      }
    });
  },

  /* ==========================================================================
     6. 唱片编辑弹窗
     ========================================================================== */

  /* 弹窗上的交互全部「委托」挂在弹窗这一层。
     表单是每次重新渲染出来的，一个个绑事件很容易漏掉某个按钮。 */
  bindModal() {
    const modal = App.qs('#musicModal');
    if (!modal) { return; }

    modal.addEventListener('click', function (e) {
      const t = e.target;
      if (t === modal) { MusicPage.closeEditor(); return; }       /* 点灰色背景 */
      if (t.closest('[data-close]')) { MusicPage.closeEditor(); return; }
      if (t.closest('[data-save]')) { MusicPage.saveEditor(); return; }
      if (t.closest('[data-del]')) { MusicPage.removeTrack(); return; }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        MusicPage.closeEditor();
      }
    });
  },

  /* ---------- 6.1 打开弹窗 ----------
     index 传数字 = 编辑第几张碟；传 null = 新增一张 */
  openEditor(index) {
    if (!window.Auth || !Auth.gate()) { return; }
    const modal = App.qs('#musicModal');
    const box = App.qs('[data-modal-body]');
    if (!modal || !box) { return; }

    const track = (index === null || index === undefined)
      ? null : this.state.all[index];

    this.state.editingId = track ? track.id : null;
    box.innerHTML = this.editorFormHtml(track);

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    box.focus();
    const first = App.qs('#mName', box);
    if (first && !track) { first.focus(); }   /* 新增时直接把光标放到名字上 */
  },

  closeEditor() {
    const modal = App.qs('#musicModal');
    if (!modal || !modal.classList.contains('is-open')) { return; }

    modal.classList.remove('is-open');
    this.state.editingId = null;

    setTimeout(function () {
      if (!modal.classList.contains('is-open')) {
        document.body.style.overflow = '';
      }
    }, 300);
  },

  /* ---------- 6.2 表单 ---------- */
  editorFormHtml(track) {
    const m = track || {};
    const isNew = !track;

    /* 分类输入框配一份候选清单（datalist）：把碟架上已经出现过的分类
       列出来，下次直接挑，不用记之前写的是什么。 */
    const genres = [];
    this.state.all.forEach(function (x) {
      const g = String(x.genre || '').trim();
      if (g && genres.indexOf(g) < 0) { genres.push(g); }
    });
    const genreOptions = genres.map(function (g) {
      return '<option value="' + App.escape(g) + '"></option>';
    }).join('');

    return '' +
      '<div class="modal__content">' +
        '<button class="modal__close" type="button" data-close title="关闭">✕</button>' +

        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">RECORD</div>' +
          '<h2 class="editor-head__title">' + (isNew ? '添加一张唱片' : '编辑唱片') + '</h2>' +
        '</div>' +

        '<div class="form-grid">' +
          '<div class="field">' +
            '<label for="mName">曲名</label>' +
            '<input id="mName" type="text" placeholder="这首歌叫什么" value="' + App.escape(m.name || '') + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="mArtist">歌手 / 来源</label>' +
            '<input id="mArtist" type="text" placeholder="比如：朔的歌单" value="' + App.escape(m.artist || '') + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="mDuration">时长</label>' +
            '<input id="mDuration" type="text" placeholder="03:42" value="' + App.escape(m.duration || '') + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="mGenre">分类</label>' +
            '<input id="mGenre" type="text" list="genreList" placeholder="民谣 / 摇滚 / 影视原声…" value="' + App.escape(m.genre || '') + '">' +
            '<datalist id="genreList">' + genreOptions + '</datalist>' +
          '</div>' +

          '<div class="field field--full">' +
            '<label for="mNote">写一句话</label>' +
            '<input id="mNote" type="text" placeholder="适合在什么时候听" value="' + App.escape(m.note || '') + '">' +
          '</div>' +

          '<div class="field field--full">' +
            '<label for="mSrc">本地音频（文件名对得上就有声音）</label>' +
            '<input id="mSrc" type="text" placeholder="assets/audio/Echoes.mp3" value="' + App.escape(m.src || '') + '">' +
            '<p class="field__tip">' +
              '把文件放进 <code>assets/audio/</code>，文件名和曲名保持一致就行。<br>' +
              '两种放法都认：平铺 <code>assets/audio/Echoes.mp3</code>，' +
              '或者按分类建文件夹 <code>assets/audio/氛围/Echoes.mp3</code>' +
              '（按歌手建 <code>assets/audio/梁博/Echoes.mp3</code> 也一样）。<br>' +
              '后缀也不挑：mp3 / m4a / ogg / wav / flac 都能找出来。' +
              '这六首的路径都已经提前填好了，<b>放进去就能响，不用回来改</b>。<br>' +
              '也可以填 <code>https://</code> 开头的在线音频地址。' +
              '<b>留空</b>的话，这张碟只会转、不会出声。' +
            '</p>' +
          '</div>' +
        '</div>' +

        '<div class="form-foot">' +
          '<div class="form-foot__left">' +
            (isNew ? '' :
              '<button class="btn btn--sm btn--danger" type="button" data-del>删掉这张</button>') +
          '</div>' +
          '<div class="form-foot__right">' +
            '<button class="btn btn--sm btn--ghost" type="button" data-close>取消</button>' +
            '<button class="btn btn--sm btn--primary" type="button" data-save>保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  /* ---------- 6.3 保存 ---------- */
  saveEditor() {
    if (!window.Auth || !Auth.gate()) { return; }
    const val = function (id) {
      const node = App.qs('#' + id);
      return node ? node.value.trim() : '';
    };

    const data = {
      name: val('mName'),
      artist: val('mArtist'),
      genre: val('mGenre'),
      duration: val('mDuration'),
      note: val('mNote'),
      src: val('mSrc')
    };

    if (!data.name) {
      App.toast('还没填曲名呢');
      const input = App.qs('#mName');
      if (input) { input.focus(); }
      return;
    }

    const id = this.state.editingId;
    const self = this;

    /* 两种情况返回的东西不一样：
         改 → SiteAPI.updateMusic 返回 true
         加 → SiteAPI.addMusic 返回新唱片对象（带 id）
       两个都是「真值」，所以统一判断就好。 */
    const task = id
      ? SiteAPI.updateMusic(id, data)
      : SiteAPI.addMusic(data);

    task.then(function (result) {
      if (!result) {
        App.toast('保存失败，看看控制台里的提示');
        return;
      }
      /* 刚改过 src 的话，之前探出来的结果就不算数了。
         清掉缓存，让碟架上的「本地有声 / 待放文件」重新探一次。 */
      self.state.probe = {};
      self.state.probing = {};
      return self.load().then(function () {
        self.closeEditor();
        App.toast(id ? '已经改好了' : '新唱片已经放上碟架了');
      });
    });
  },

  /* ---------- 6.4 删除 ---------- */
  removeTrack() {
    if (!window.Auth || !Auth.gate()) { return; }
    const id = this.state.editingId;
    if (!id) { return; }

    const track = this.state.all.find(function (m) { return m.id === id; });
    const name = track ? track.name : '';

    const msg = SiteAPI.isRemote()
      ? '确定从碟架上拿走《' + name + '》吗？\n' + SiteAPI.storeLabel() + '里删掉就真的没有了，mp3 文件不会跟着删。'
      : '确定从碟架上拿走《' + name + '》吗？\n（写在 js/data.js 里的只是隐藏，点「恢复默认」能找回来）';

    if (!window.confirm(msg)) { return; }

    const self = this;
    SiteAPI.removeMusic(id).then(function () {
      return self.load().then(function () {
        self.closeEditor();
        self.pause();
        App.toast('已经拿下碟架了');
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  MusicPage.init();
});
