/* ==========================================================================
   photos.js —— 照片页
   --------------------------------------------------------------------------
   数据流：
     · 读  SiteAPI.getPhotos / getCollections —— 公开，谁都能看
       （db 模式读 sqlite，云端模式读 Supabase；云端读不到就空状态）
     · 写  savePhoto / saveCollection / delete* —— 只有管理员
       （页面按钮 data-admin-only 门禁 + Auth.gate()，后端还有 token 闸）

   页面两块：
     · 主视图 —— 合集卡片（封面 + 名字 + 一段话）+ 没归集的照片墙
     · 合集视图 —— 点开一个合集：那段话 + 里面的照片

   照片分两档：thumb（长边 400px，网格用）+ data（长边 1600px，灯箱点开才取）。
   ========================================================================== */

const PhotosPage = {

  state: {
    list: [],        /* 全部照片 [{id,name,date,desc,thumb,collectionId}] */
    cols: [],        /* 全部合集 [{id,name,date,note,cover}] */
    viewCol: '',     /* 当前打开的合集 id，'' = 主视图 */
    lb: -1,          /* 灯箱当前显示的下标（在当前视图的照片数组里），-1 = 关着 */
    files: []        /* 待上传的 File 列表 */
  },

  init() {
    this.bind();
    this.load();
  },

  /* ---------- 事件 ---------- */
  bind() {
    const self = this;

    App.qs('#uploadBtn').addEventListener('click', function () {
      if (!Auth.gate()) { return; }
      self.openUpload();
    });
    App.qs('#newColBtn').addEventListener('click', function () {
      if (!Auth.gate()) { return; }
      self.openColModal();
    });

    App.qs('#photoFiles').addEventListener('change', function (e) { self.pickFiles(e.target.files); });
    App.qs('[data-upload-ok]').addEventListener('click', function () { self.upload(); });
    App.qs('[data-upload-cancel]').addEventListener('click', function () { self.closeUpload(); });
    App.qs('[data-col-cancel]').addEventListener('click', function () { self.closeColModal(); });
    App.qs('[data-col-ok]').addEventListener('click', function () { self.createCol(); });

    /* 合集视图的返回 / 删除 */
    App.qs('[data-col-back]').addEventListener('click', function () { self.closeCol(); });
    App.qs('[data-col-del]').addEventListener('click', function () { self.delCol(); });

    /* 照片流的左右箭头 */
    App.qs('[data-strip-prev]').addEventListener('click', function () { self.slideStrip(-1); });
    App.qs('[data-strip-next]').addEventListener('click', function () { self.slideStrip(1); });

    /* 灯箱 */
    App.qs('[data-lb-close]').addEventListener('click', function () { self.closeLb(); });
    App.qs('[data-lb-prev]').addEventListener('click', function () { self.navLb(-1); });
    App.qs('[data-lb-next]').addEventListener('click', function () { self.navLb(1); });
    App.qs('[data-lb-del]').addEventListener('click', function () { self.delCurrent(); });

    document.addEventListener('keydown', function (e) {
      if (self.state.lb < 0) { return; }
      if (e.key === 'Escape') { self.closeLb(); }
      if (e.key === 'ArrowLeft') { self.navLb(-1); }
      if (e.key === 'ArrowRight') { self.navLb(1); }
    });

    document.addEventListener('auth:change', function () { self.render(); });
  },

  /* ---------- 读 ---------- */
  load() {
    const self = this;
    Promise.all([SiteAPI.getPhotos(), SiteAPI.getCollections()]).then(function (res) {
      self.state.list = res[0] || [];
      self.state.cols = res[1] || [];
      self.render();
    });
  },

  /* 当前视图下该显示的照片（合集视图 = 该合集的；主视图 = 没归集的） */
  viewPhotos() {
    const self = this;
    return this.state.list.filter(function (p) {
      return self.state.viewCol ? p.collectionId === self.state.viewCol : !p.collectionId;
    });
  },

  /* ---------- 画 ---------- */
  render() {
    this.renderStrip();
    this.renderCols();
    this.renderGrid();
    this.renderColView();
  },

  /* 照片流：所有照片排成一排，左右滑动，点开大图（不挑合集，全量展示） */
  renderStrip() {
    const sec = App.qs('[data-strip-section]');
    const strip = App.qs('[data-strip]');
    if (!sec || !strip) { return; }
    const list = this.state.list;
    if (!list.length) { sec.hidden = true; return; }
    sec.hidden = false;

    const self = this;
    strip.innerHTML = list.map(function (p) {
      const idx = list.indexOf(p);
      return '' +
        '<figure class="strip-card" data-photo-idx="' + idx + '" title="' + App.escape(p.name || '照片') + '">' +
          '<img class="strip-card__img" loading="lazy" decoding="async" src="' + App.escape(p.thumb || '') + '" alt="' + App.escape(p.name || '照片') + '">' +
          '<figcaption class="strip-card__cap">' +
            '<span class="strip-card__name">' + App.escape(p.name || '未命名') + '</span>' +
            (p.date ? '<span class="strip-card__date">' + App.escape(p.date) + '</span>' : '') +
          '</figcaption>' +
        '</figure>';
    }).join('');

    App.qsa('[data-photo-idx]', strip).forEach(function (card) {
      card.addEventListener('click', function () {
        self.openLb(Number(card.getAttribute('data-photo-idx')));
      });
    });
  },

  /* 照片流左右箭头：一屏一屏地滑（滑不到头时自动到边） */
  slideStrip(dir) {
    const strip = App.qs('[data-strip]');
    if (!strip) { return; }
    strip.scrollBy({ left: dir * Math.max(strip.clientWidth * 0.8, 260), behavior: 'smooth' });
  },

  renderCols() {
    const box = App.qs('[data-col-section]');
    const grid = App.qs('[data-col-grid]');
    if (!box || !grid) { return; }
    if (!this.state.cols.length) { box.hidden = true; return; }
    box.hidden = false;

    const self = this;
    grid.innerHTML = this.state.cols.map(function (c) {
      const n = self.state.list.filter(function (p) { return p.collectionId === c.id; }).length;
      /* 封面：优先用合集自己存的，没有就拿合集里第一张的缩略图 */
      const first = self.state.list.filter(function (p) { return p.collectionId === c.id; })[0];
      const cover = c.cover || (first && first.thumb) || '';
      return '' +
        '<figure class="col-card" data-col-id="' + App.escape(c.id) + '">' +
          '<span class="col-card__cover">' +
            (cover ? '<img loading="lazy" src="' + App.escape(cover) + '" alt="">' : '<i class="col-card__ph">▦</i>') +
            '<b class="col-card__num">' + n + ' 张</b>' +
          '</span>' +
          '<figcaption class="col-card__cap">' +
            '<span class="col-card__name">' + App.escape(c.name) + '</span>' +
            (c.note ? '<span class="col-card__note">' + App.escape(c.note.slice(0, 46)) + (c.note.length > 46 ? '…' : '') + '</span>' : '') +
          '</figcaption>' +
        '</figure>';
    }).join('');

    App.qsa('[data-col-id]', grid).forEach(function (card) {
      card.addEventListener('click', function () {
        self.openCol(card.getAttribute('data-col-id'));
      });
    });
  },

  renderGrid() {
    const grid = App.qs('[data-photo-grid]');
    const empty = App.qs('[data-photo-empty]');
    const count = App.qs('[data-photo-count]');
    const looseTitle = App.qs('[data-loose-title]');
    const looseSec = App.qs('[data-loose-section]');
    if (count) { count.textContent = String(this.state.list.length); }
    if (looseTitle) { looseTitle.textContent = this.state.cols.length ? '零散照片' : '照片'; }
    if (!grid) { return; }

    /* 没归合集的照片才铺在这里；全都进了合集时，整块收起来
       （上面已有照片流，别再挂一块「这里还空着」） */
    const photos = this.state.list.filter(function (p) { return !p.collectionId; });
    if (!photos.length) {
      grid.innerHTML = '';
      if (looseSec) { looseSec.hidden = !!this.state.cols.length; }
      if (empty) { empty.hidden = !!this.state.cols.length; }
      return;
    }
    if (looseSec) { looseSec.hidden = false; }
    if (empty) { empty.hidden = true; }
    this._paintGrid(grid, photos);
  },

  /* 合集视图 */
  renderColView() {
    const view = App.qs('#colView');
    if (!view) { return; }
    if (!this.state.viewCol) { view.hidden = true; return; }
    view.hidden = false;

    const c = this._findCol(this.state.viewCol);
    const nameEl = App.qs('[data-col-name]');
    const noteEl = App.qs('[data-col-note]');
    const del = App.qs('[data-col-del]');
    if (nameEl) { nameEl.textContent = c ? c.name : ''; }
    if (noteEl) {
      noteEl.textContent = c ? c.note : '';
      noteEl.hidden = !(c && c.note);
    }
    if (del) {
      del.hidden = !(typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin());
      del.style.display = del.hidden ? 'none' : '';
    }

    const grid = App.qs('[data-col-photo-grid]');
    const empty = App.qs('[data-col-empty]');
    const photos = this.viewPhotos();
    if (!photos.length) {
      if (grid) { grid.innerHTML = ''; }
      if (empty) { empty.hidden = false; }
      return;
    }
    if (empty) { empty.hidden = true; }
    this._paintGrid(grid, photos);
  },

  _findCol(id) {
    return this.state.cols.filter(function (c) { return c.id === id; })[0] || null;
  },

  /* 把一组照片画进一个网格容器（主视图和合集视图共用） */
  _paintGrid(grid, photos) {
    const self = this;
    grid.innerHTML = photos.map(function (p) {
      const idx = self.state.list.indexOf(p);
      return '' +
        '<figure class="photo-card" data-photo-idx="' + idx + '" title="' + App.escape(p.name || '照片') + '">' +
          '<img class="photo-card__img" loading="lazy" decoding="async" src="' + App.escape(p.thumb || '') + '" alt="' + App.escape(p.name || '照片') + '">' +
          '<figcaption class="photo-card__cap">' +
            '<span class="photo-card__name">' + App.escape(p.name || '未命名') + '</span>' +
            '<span class="photo-card__date">' + App.escape(p.date || '') + '</span>' +
          '</figcaption>' +
        '</figure>';
    }).join('');

    App.qsa('[data-photo-idx]', grid).forEach(function (card) {
      card.addEventListener('click', function () {
        self.openLb(Number(card.getAttribute('data-photo-idx')));
      });
    });
  },

  /* ---------- 打开 / 关闭合集视图 ---------- */
  openCol(id) {
    this.state.viewCol = id;
    this.state.lb = -1;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  },

  closeCol() {
    this.state.viewCol = '';
    this.render();
  },

  delCol() {
    const self = this;
    const c = this._findCol(this.state.viewCol);
    if (!c) { return; }
    if (!window.confirm('删掉合集「' + c.name + '」？里面的照片会回到照片墙，不会丢。')) { return; }
    SiteAPI.deleteCollection(c.id).then(function () {
      self.state.viewCol = '';
      self.load();
      App.toast('合集已删除，照片回到了照片墙');
    }).catch(function (e) { App.toast('删除失败：' + ((e && e.message) || '未知错误')); });
  },

  /* ---------- 灯箱 ---------- */
  openLb(i) {
    this.state.lb = i;
    const lb = App.qs('#lightbox');
    if (!lb) { return; }
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    this.renderLb();
  },

  closeLb() {
    this.state.lb = -1;
    const lb = App.qs('#lightbox');
    if (lb) { lb.hidden = true; }
    document.body.style.overflow = '';
  },

  navLb(d) {
    const n = this.state.list.length;
    if (!n || this.state.lb < 0) { return; }
    /* 在全部照片里转圈 —— 照片流和照片墙都指向全量列表，语义一致 */
    this.state.lb = (this.state.lb + d + n) % n;
    this.renderLb();
  },

  renderLb() {
    const p = this.state.list[this.state.lb];
    if (!p) { this.closeLb(); return; }
    const img = App.qs('[data-lb-img]');
    const name = App.qs('[data-lb-name]');
    const meta = App.qs('[data-lb-meta]');
    const del = App.qs('[data-lb-del]');
    if (img) {
      /* 先用缩略图顶上（不闪空白），大图到了再换 */
      img.src = p.thumb || '';
      this._loadFull(p, img);
    }
    if (name) { name.textContent = p.name || '未命名'; }
    if (meta) {
      const meta2 = [p.date, p.desc, (this.state.lb + 1) + ' / ' + this.state.list.length];
      meta.textContent = meta2.filter(Boolean).join(' · ');
    }
    if (del) { del.hidden = !(typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin()); }
  },

  /* 大图懒加载：每张只取一次，缓存在照片对象上（_full） */
  _loadFull(p, img) {
    if (p._full) { img.src = p._full; return; }
    if (p._loading) { return; }
    p._loading = true;
    SiteAPI.getPhotoFull(p.id).then(function (data) {
      p._loading = false;
      if (data) { p._full = data; if (img.isConnected) { img.src = data; } }
    }).catch(function () { p._loading = false; });
  },

  delCurrent() {
    const self = this;
    const p = this.state.list[this.state.lb];
    if (!p) { return; }
    if (!window.confirm('删掉「' + (p.name || '未命名') + '」？删了就找不回来了。')) { return; }
    SiteAPI.deletePhoto(p.id).then(function () {
      self.state.list = self.state.list.filter(function (x) { return x.id !== p.id; });
      self.state.lb = -1;
      self.closeLb();
      self.render();
      App.toast('已删除');
    }).catch(function (e) {
      App.toast('删除失败：' + ((e && e.message) || '未知错误'));
    });
  },

  /* ---------- 上传 ---------- */
  openUpload() {
    const m = App.qs('#uploadModal');
    if (!m) { return; }
    this.state.files = [];
    const th = App.qs('[data-upload-thumbs]');
    if (th) { th.innerHTML = ''; }
    const prog = App.qs('[data-upload-progress]');
    if (prog) { prog.hidden = true; }
    const files = App.qs('#photoFiles');
    if (files) { files.value = ''; }
    const ok = App.qs('[data-upload-ok]');
    if (ok) { ok.disabled = true; }
    const date = App.qs('#photoDate');
    if (date && !date.value) { date.value = new Date().toISOString().slice(0, 10); }
    this._fillColSelect();
    m.classList.add('is-open');
  },

  closeUpload() {
    const m = App.qs('#uploadModal');
    if (m) { m.classList.remove('is-open'); }
  },

  /* 上传弹窗里的「归入合集」下拉 */
  _fillColSelect() {
    const sel = App.qs('[data-photo-col]');
    if (!sel) { return; }
    const keep = sel.value;
    sel.innerHTML = '<option value="">不归入合集</option>' +
      this.state.cols.map(function (c) {
        return '<option value="' + App.escape(c.id) + '">' + App.escape(c.name) + '</option>';
      }).join('');
    sel.value = keep;
  },

  pickFiles(fileList) {
    const self = this;
    const th = App.qs('[data-upload-thumbs]');
    if (!th) { return; }
    this.state.files = Array.prototype.slice.call(fileList || []).filter(function (f) {
      return /^image\//.test(f.type);
    });
    th.innerHTML = '';
    this.state.files.forEach(function (f) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.onload = function () { URL.revokeObjectURL(img.src); };
      th.appendChild(img);
    });
    const ok = App.qs('[data-upload-ok]');
    if (ok) { ok.disabled = !this.state.files.length; }
    const name = App.qs('#photoName');
    /* 标题留空时，默认拿第一张的文件名（去掉扩展名） */
    if (name && !name.value && this.state.files.length) {
      name.value = this.state.files[0].name.replace(/\.[a-z0-9]+$/i, '').slice(0, 40);
    }
    void self;
  },

  /* 把一张图压成指定长边的 JPEG，返回 dataURL */
  compress(file, max, quality) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = function () {
        try {
          let w = img.naturalWidth, h = img.naturalHeight;
          if (Math.max(w, h) > max) {
            const k = max / Math.max(w, h);
            w = Math.round(w * k); h = Math.round(h * k);
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', quality));
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('这张图读不出来')); };
      img.src = url;
    });
  },

  upload() {
    const self = this;
    const files = this.state.files;
    if (!files.length) { return; }

    const name = (App.qs('#photoName') || {}).value || '';
    const date = (App.qs('#photoDate') || {}).value || '';
    const desc = (App.qs('#photoDesc') || {}).value || '';
    const colId = (App.qs('[data-photo-col]') || {}).value || '';
    const prog = App.qs('[data-upload-progress]');
    const okBtn = App.qs('[data-upload-ok]');
    if (okBtn) { okBtn.disabled = true; }
    if (prog) { prog.hidden = false; }

    let done = 0, fail = 0;
    const next = function (i) {
      if (i >= files.length) {
        if (prog) { prog.textContent = '完成：成功 ' + (done - fail) + ' 张' + (fail ? '，失败 ' + fail + ' 张' : ''); }
        if (okBtn) { okBtn.disabled = false; }
        self.state.files = [];
        const th = App.qs('[data-upload-thumbs]');
        if (th) { th.innerHTML = ''; }
        self.load();
        if (!fail) { setTimeout(function () { self.closeUpload(); }, 700); }
        return;
      }
      if (prog) { prog.textContent = '正在上传 ' + (i + 1) + ' / ' + files.length + ' …'; }
      self.compress(files[i], 400, 0.7).then(function (thumb) {
        return self.compress(files[i], 1600, 0.82).then(function (data) {
          return SiteAPI.savePhoto({
            id: 'p' + Date.now() + '-' + i,
            name: files.length > 1 ? (name || '照片') + ' · ' + (i + 1) : (name || '照片'),
            date: date, desc: desc, thumb: thumb, data: data,
            collectionId: colId
          });
        });
      }).then(function () { done += 1; next(i + 1); })
        .catch(function (e) { fail += 1; App.toast('第 ' + (i + 1) + ' 张失败：' + ((e && e.message) || '未知')); next(i + 1); });
    };
    next(0);
  },

  /* ---------- 新建合集 ---------- */
  openColModal() {
    const m = App.qs('#colModal');
    if (!m) { return; }
    const date = App.qs('#colDate');
    if (date) { date.value = new Date().toISOString().slice(0, 10); }
    const name = App.qs('#colName');
    const note = App.qs('#colNote');
    if (name) { name.value = ''; }
    if (note) { note.value = ''; }
    m.classList.add('is-open');
  },

  closeColModal() {
    const m = App.qs('#colModal');
    if (m) { m.classList.remove('is-open'); }
  },

  createCol() {
    const self = this;
    const name = ((App.qs('#colName') || {}).value || '').trim();
    if (!name) { App.toast('先给合集起个名字'); return; }
    const date = (App.qs('#colDate') || {}).value || '';
    const note = (App.qs('#colNote') || {}).value || '';
    SiteAPI.saveCollection({ id: 'c' + Date.now(), name: name, date: date, note: note, cover: '' })
      .then(function () {
        self.closeColModal();
        self.load();
        App.toast('合集「' + name + '」建好了 —— 上传照片时选它就能归进去');
      })
      .catch(function (e) { App.toast('创建失败：' + ((e && e.message) || '未知错误')); });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  PhotosPage.init();
});
