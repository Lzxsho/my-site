/* ==========================================================================
   about.js —— 关于页脚本
   --------------------------------------------------------------------------
   它做的事：
     1. 把资料填到页面上（名字、签名、自我介绍、关键词）
     2. 分段渲染自我介绍
     3. 练度进度条：滚到可见位置时才开始增长
     4. 渲染联系方式卡片
     5. 「复制邮箱」按钮
     6. 【新】「编辑资料」：昵称、签名、城市、邮箱、首页文案、
              自我介绍正文、关键词 —— 全在弹窗里改
     7. 【新】「编辑技能表」：加一条 / 删一条 / 改百分比和状态
        · 跑了 server.js（数据库模式）→ 写进 db/site.db
        · 直接双击打开（本地模式）  → 存在浏览器里

   小提醒：所有读写都通过 SiteAPI 走，这个文件不直接碰数据来源，
   所以两种模式下页面代码完全一样。
   ========================================================================== */

const AboutPage = {

  profile: null,

  /* 弹窗现在在干嘛：null 关着 / 'profile' 改资料 / 'skills' 改技能表 */
  state: { mode: null },

  /* 进度条的观察器，刷新时要先断开，不然会越攒越多 */
  _skillIO: null,

  /* 焦点还给谁（关弹窗时用） */
  _lastFocus: null,

  init() {
    const self = this;
    SiteAPI.getProfile().then(function (p) {
      self.profile = p;
      self.renderProfile(p);
      self.renderSkills(p);
      self.renderContact(p);
      self.renderVisitCount();
      self.bindCopyEmail();
      self.bindModal();
      self.bindEditButtons();
    });
  },

  /* ---------- 1. 基本资料 ---------- */
  renderProfile(p) {
    /* 注意：头像现在是 assets/avatar.jpg 里的真图片，
       写在 HTML 的 <img> 标签上，这里就不再去改它的文字内容了。
       想换头像 → 直接把 assets/avatar.jpg 覆盖掉即可。 */

    /* 换掉浏览器标签页的标题 */
    document.title = '关于 · ' + p.owner;

    const name = App.qs('[data-about-name]');
    if (name) { name.textContent = '你好，我是 ' + p.owner + '。'; }

    const slogan = App.qs('[data-about-slogan]');
    if (slogan) { slogan.textContent = p.slogan + ' · ' + p.city; }

    /* ---------- 2. 段落 ---------- */
    const body = App.qs('[data-about-body]');
    if (body) {
      body.innerHTML = (p.aboutParagraphs || []).map(function (text) {
        /* 顺手把「文字」「音乐」这类关键词标亮 */
        let html = App.escape(text);
        ['文字', '音乐', '小说', '小诗'].forEach(function (word) {
          html = html.split(word).join('<em>' + word + '</em>');
        });
        return '<p>' + html + '</p>';
      }).join('');
    }

    /* 关键词标签 */
    const kw = App.qs('[data-about-keywords]');
    if (kw) {
      kw.innerHTML = (p.keywords || []).map(function (k) {
        return '<span class="keyword">' + App.escape(k) + '</span>';
      }).join('');
    }
  },

  /* ---------- 3. 进度条 ---------- */

  /* 把中文状态翻译成 CSS 类名用的英文后缀 */
  LEVEL_CLASS: { '掌握': 'done', '在学': 'doing', '计划': 'plan' },
  LEVELS: ['掌握', '在学', '计划'],

  renderSkills(p) {
    const box = App.qs('[data-skills]');
    if (!box) { return; }

    const list = p.skills || [];

    /* ---- 3.1 顶部的三个统计小方块 ---- */
    const statsBox = App.qs('[data-skill-stats]');
    if (statsBox) {
      const groups = [
        { label: '已掌握', level: '掌握', cls: 'done' },
        { label: '正在学', level: '在学', cls: 'doing' },
        { label: '计划中', level: '计划', cls: 'plan' }
      ];
      statsBox.innerHTML = groups.map(function (g) {
        const n = list.filter(function (s) { return s.level === g.level; }).length;
        return '<span class="skill-stat is-' + g.cls + '"><b>' + n + '</b>' + g.label + '</span>';
      }).join('');
    }

    /* ---- 3.2 每一条技能 ---- */
    box.innerHTML = list.map(function (s) {
      const cls = AboutPage.LEVEL_CLASS[s.level] || 'doing';
      return '' +
        '<div class="skill is-' + cls + '" data-value="' + s.value + '">' +
          '<div class="skill__head">' +
            '<span class="skill__name">' + App.escape(s.name) + '</span>' +
            '<span class="skill__badge is-' + cls + '">' + App.escape(s.level || '在学') + '</span>' +
            '<span class="skill__num">' + s.value + '%</span>' +
          '</div>' +
          '<div class="skill__bar"><div class="skill__fill"></div></div>' +
          (s.note ? '<p class="skill__note">' + App.escape(s.note) + '</p>' : '') +
        '</div>';
    }).join('');

    /* ---- 3.3 滚到可见位置时，进度条依次填满 ---- */
    const items = App.qsa('.skill', box);

    function fillAll() {
      items.forEach(function (item, i) {
        setTimeout(function () {
          const fill = App.qs('.skill__fill', item);
          if (fill) { fill.style.width = item.getAttribute('data-value') + '%'; }
        }, i * 110);
      });
    }

    /* 重新渲染过的话，先把上一个观察器断开 */
    if (this._skillIO) { this._skillIO.disconnect(); this._skillIO = null; }

    if (!('IntersectionObserver' in window)) {
      fillAll();
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          fillAll();
          io.disconnect();
        }
      });
    }, { threshold: 0.25 });

    this._skillIO = io;
    io.observe(box);
  },

  /* ---------- 4. 联系方式 ---------- */
  renderContact(p) {
    const box = App.qs('[data-contact]');
    if (!box) { return; }

    /* 每一项都先看看值有没有填。
       GitHub / 博客这类「可能还没有」的联系方式，留空就不显示入口 ——
       宁可不出现，也不要给访客一个点开是空白页的死链。 */
    const items = [
      { icon: '✉', label: 'Email',  value: p.email,  link: 'mailto:' + p.email },
      { icon: '⌘', label: 'GitHub', value: p.github, link: 'https://' + p.github },
      { icon: '◍', label: 'Blog',   value: p.blog,   link: 'https://' + p.blog }
    ].filter(function (it) {
      return String(it.value || '').trim().length > 0;
    }).map(function (it) {
      /* 填的是「github.com/xxx」就帮它补 https://；
         已经写成完整网址（https://…）的就用原样，别再套一层。 */
      const v = String(it.value).trim();
      if (it.label === 'Email') { it.link = 'mailto:' + v; }
      else { it.link = /^https?:\/\//i.test(v) ? v : 'https://' + v; }
      it.value = v;
      return it;
    });

    /* 一条都没有（连邮箱都没填）时给句人话，而不是留一块空白 */
    if (!items.length) {
      box.innerHTML = '<p class="muted">联系方式还没填 —— 登录后点头像可以自由改。</p>';
      return;
    }

    box.innerHTML = items.map(function (it) {
      return '' +
        '<a class="card contact-item" href="' + App.escape(it.link) + '" target="_blank" rel="noopener">' +
          '<span class="contact-item__icon">' + it.icon + '</span>' +
          '<span class="contact-item__label">' + it.label + '</span>' +
          '<span class="contact-item__value">' + App.escape(it.value) + '</span>' +
        '</a>';
    }).join('');
  },

  /* ---------- 5. 访问次数 ----------
     用 localStorage 记一个数字，纯属好玩；
     以后接了数据库就可以换成真正的「访问量」。 */
  renderVisitCount() {
    const KEY = 'shuoscape_visit_times';
    let times = 1;
    try {
      times = Number(localStorage.getItem(KEY) || 0) + 1;
      localStorage.setItem(KEY, String(times));
    } catch (e) {
      times = 1; /* 隐私模式下存不了，就当第一次来 */
    }

    const slogan = App.qs('[data-about-slogan]');
    if (!slogan) { return; }

    /* 第一次来和后来来，说的话不一样 */
    if (times === 1) {
      App.toast('欢迎第一次来到小窝 ✿');
    } else {
      slogan.textContent += ' · 这是你第 ' + times + ' 次来这里';
    }
  },

  /* ---------- 6. 复制邮箱 ---------- */
  bindCopyEmail() {
    const btn = App.qs('#copyEmail');
    if (!btn) { return; }

    btn.addEventListener('click', function () {
      const email = (AboutPage.profile && AboutPage.profile.email) || '';
      if (!email) {
        App.toast('还没有填邮箱');
        return;
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () {
          App.toast('邮箱已复制：' + email);
        }).catch(function () {
          App.toast('复制失败，邮箱是：' + email);
        });
      } else {
        App.toast('邮箱是：' + email);
      }
    });
  },

  /* ==========================================================================
     7. 编辑弹窗
     ========================================================================== */

  /* 两个「编辑」按钮 */
  bindEditButtons() {
    const pBtn = App.qs('#editProfileBtn');
    if (pBtn) { pBtn.addEventListener('click', function () { AboutPage.open('profile'); }); }

    const sBtn = App.qs('#editSkillsBtn');
    if (sBtn) { sBtn.addEventListener('click', function () { AboutPage.open('skills'); }); }
  },

  /* 弹窗上的交互。
     全部挂在弹窗这一层「委托」处理 —— 因为表单是每次重新渲染出来的，
     每次都重新绑一遍事件很容易漏掉某个按钮（文章页就吃过这个亏）。 */
  bindModal() {
    const modal = App.qs('#aboutModal');
    if (!modal) { return; }

    modal.addEventListener('click', function (e) {
      const t = e.target;

      /* 点在弹窗背后的灰色区域上 → 关掉 */
      if (t === modal) { AboutPage.close(); return; }

      /* 用 closest 从点到的元素往上找，这样点按钮里面的字也算 */
      if (t.closest('[data-close]')) { AboutPage.close(); return; }
      if (t.closest('[data-save]')) { AboutPage.save(); return; }
      if (t.closest('[data-add-skill]')) { AboutPage.addSkillRow(); return; }

      const del = t.closest('[data-del-skill]');
      if (del) {
        /* 整行删掉，再把「第 N 条」重新编号 */
        const row = del.closest('[data-skill-row]');
        if (row) { row.parentNode.removeChild(row); }
        AboutPage.renumberSkillRows();
        return;
      }
    });

    /* 按 Esc 关掉 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && AboutPage.state.mode) { AboutPage.close(); }
    });
  },

  /* ---------- 7.1 打开弹窗 ---------- */
  open(mode) {
    const modal = App.qs('#aboutModal');
    const box = App.qs('[data-modal-body]');
    if (!modal || !box) { return; }

    this._lastFocus = document.activeElement;
    this.state.mode = mode;

    box.innerHTML = mode === 'profile' ? this.profileFormHtml() : this.skillsFormHtml();

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';   /* 弹窗开着时，背后不跟着滚动 */

    /* 焦点给弹窗容器（tabindex="-1"）而不是按钮：
       Tab / Esc 都能用，又不会出现难看的焦点光圈 */
    box.focus();
  },

  close() {
    const modal = App.qs('#aboutModal');
    if (!modal || !modal.classList.contains('is-open')) { return; }

    modal.classList.remove('is-open');
    this.state.mode = null;

    /* 延时解锁滚动：等淡出动画走完，页面不会突然跳一下 */
    setTimeout(function () {
      if (!modal.classList.contains('is-open')) {
        document.body.style.overflow = '';
      }
    }, 300);

    if (this._lastFocus && this._lastFocus.focus) { this._lastFocus.focus(); }
    this._lastFocus = null;
  },

  /* ---------- 7.2 表单：编辑资料 ---------- */
  profileFormHtml() {
    const p = this.profile || {};
    const v = function (x) { return App.escape(x || ''); };
    const lines = function (arr) { return App.escape((arr || []).join(', ')); };

    return '' +
      '<div class="modal__content">' +
        '<button class="modal__close" type="button" data-close title="关闭">✕</button>' +

        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">EDIT PROFILE</div>' +
          '<h2 class="editor-head__title">编辑「关于我」</h2>' +
        '</div>' +

        '<div class="form-grid">' +
          '<div class="field">' +
            '<label for="pOwner">昵称</label>' +
            '<input id="pOwner" type="text" placeholder="你希望别人怎么叫你" value="' + v(p.owner) + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="pCity">城市</label>' +
            '<input id="pCity" type="text" placeholder="比如：杭州" value="' + v(p.city) + '">' +
          '</div>' +

          '<div class="field field--full">' +
            '<label for="pSlogan">一句话签名</label>' +
            '<input id="pSlogan" type="text" placeholder="显示在名字下面那一行" value="' + v(p.slogan) + '">' +
          '</div>' +

          '<div class="field">' +
            '<label for="pEmail">邮箱</label>' +
            '<input id="pEmail" type="text" placeholder="xxx@qq.com" value="' + v(p.email) + '">' +
          '</div>' +
          '<div class="field">' +
            '<label for="pGithub">GitHub</label>' +
            '<input id="pGithub" type="text" placeholder="github.com/用户名" value="' + v(p.github) + '">' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pBlog">博客 / 其他链接</label>' +
            '<input id="pBlog" type="text" placeholder="可以留空" value="' + v(p.blog) + '">' +
          '</div>' +

          /* ---- 首页首屏上的字 ---- */
          '<div class="field field--full form-sep">' +
            '<label>—— 首页首屏上的字 ——</label>' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pHeroEyebrow">小标题（大标题上面那行小字）</label>' +
            '<input id="pHeroEyebrow" type="text" value="' + v(p.heroEyebrow) + '">' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pHeroDesc">副标题（会一个字一个字打出来）</label>' +
            '<input id="pHeroDesc" type="text" value="' + v(p.heroDesc) + '">' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pHeroTags">首屏小标签（用逗号隔开）</label>' +
            '<input id="pHeroTags" type="text" placeholder="随笔, 小说, 小诗, 音乐" value="' + lines(p.heroTags) + '">' +
          '</div>' +

          /* ---- 自我介绍 ---- */
          '<div class="field field--full form-sep">' +
            '<label>—— 自我介绍 ——</label>' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pIntro">一句话简介（首页「关于我」卡片上用）</label>' +
            '<input id="pIntro" type="text" value="' + v(p.intro) + '">' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pAbout">自我介绍正文</label>' +
            '<textarea id="pAbout" rows="10" placeholder="想说什么就写什么。&#10;中间空一行，就是新的一段。">' +
              App.escape((p.aboutParagraphs || []).join('\n\n')) +
            '</textarea>' +
            '<p class="field__tip">中间<b>空一行</b>就是新的一段。写成几段都行，会自动排版。</p>' +
          '</div>' +
          '<div class="field field--full">' +
            '<label for="pKeywords">关键词标签（用逗号隔开）</label>' +
            '<input id="pKeywords" type="text" placeholder="文字, 音乐, 前端开发" value="' + lines(p.keywords) + '">' +
            '<p class="field__tip">这些会显示在自我介绍下面，做成一个个小标签。</p>' +
          '</div>' +
        '</div>' +

        '<div class="form-foot">' +
          '<div class="form-foot__left">' +
            '<span class="field__tip">' + this.saveWhereTip() + '</span>' +
          '</div>' +
          '<div class="form-foot__right">' +
            '<button class="btn btn--sm btn--ghost" type="button" data-close>取消</button>' +
            '<button class="btn btn--sm btn--primary" type="button" data-save>保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  /* ---------- 7.3 表单：编辑技能表 ---------- */
  skillsFormHtml() {
    const list = (this.profile && this.profile.skills) || [];

    return '' +
      '<div class="modal__content">' +
        '<button class="modal__close" type="button" data-close title="关闭">✕</button>' +

        '<div class="editor-head">' +
          '<div class="editor-head__eyebrow">EDIT SKILLS</div>' +
          '<h2 class="editor-head__title">编辑「正在学的东西」</h2>' +
        '</div>' +

        '<p class="field__tip" style="margin-bottom:14px;">' +
          '这里的顺序就是页面上显示的顺序。<b>进度</b>填 0~100 的数字，' +
          '<b>状态</b>决定标签颜色（掌握=绿、在学=蓝、计划=灰）。' +
        '</p>' +

        '<div data-skill-list>' +
          (list.length ? list.map(function (s, i) {
            return AboutPage.skillRowHtml(i, s);
          }).join('') : AboutPage.skillRowHtml(0, {})) +
        '</div>' +

        '<button class="btn btn--sm" type="button" data-add-skill>＋ 加一条</button>' +

        '<div class="form-foot">' +
          '<div class="form-foot__left">' +
            '<span class="field__tip">' + this.saveWhereTip() + '</span>' +
          '</div>' +
          '<div class="form-foot__right">' +
            '<button class="btn btn--sm btn--ghost" type="button" data-close>取消</button>' +
            '<button class="btn btn--sm btn--primary" type="button" data-save>保存</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  /* 一行技能：上面是「第 N 条 + 删除」，下面是四个输入框 */
  skillRowHtml(index, s) {
    const skill = s || {};
    const levelOptions = AboutPage.LEVELS.map(function (lv) {
      return '<option value="' + lv + '"' + (skill.level === lv ? ' selected' : '') + '>' + lv + '</option>';
    }).join('');

    return '' +
      '<div class="row-item skill-row" data-skill-row>' +
        '<div class="row-item__head">' +
          '<span class="row-item__no">第 ' + (index + 1) + ' 条</span>' +
          '<button class="row-item__del" type="button" data-del-skill title="删掉这一条">✕</button>' +
        '</div>' +
        '<div class="skill-row__fields">' +
          '<div class="field">' +
            '<label>名称</label>' +
            '<input type="text" name="name" placeholder="比如：JavaScript" value="' + App.escape(skill.name || '') + '">' +
          '</div>' +
          '<div class="field">' +
            '<label>进度 %</label>' +
            '<input type="number" name="value" min="0" max="100" placeholder="0-100" value="' +
              (skill.value === undefined || skill.value === null ? '' : skill.value) + '">' +
          '</div>' +
          '<div class="field">' +
            '<label>状态</label>' +
            '<select name="level">' + levelOptions + '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label>一句话说明（可留空）</label>' +
            '<input type="text" name="note" placeholder="现在练到哪儿了" value="' + App.escape(skill.note || '') + '">' +
          '</div>' +
        '</div>' +
      '</div>';
  },

  /* 新加一行：直接往 DOM 里插，不重新渲染 ——
     重新渲染会把用户已经敲进去、还没保存的内容冲掉。 */
  addSkillRow() {
    const list = App.qs('[data-skill-list]');
    if (!list) { return; }

    const index = App.qsa('[data-skill-row]', list).length;
    list.insertAdjacentHTML('beforeend', this.skillRowHtml(index, {}));
    this.renumberSkillRows();

    /* 把光标放到新那行的「名称」上，可以接着敲 */
    const rows = App.qsa('[data-skill-row]', list);
    const last = rows[rows.length - 1];
    const input = last && App.qs('[name="name"]', last);
    if (input) {
      input.focus();
      last.scrollIntoView({ block: 'nearest' });
    }
  },

  /* 删掉一行之后，把「第 N 条」重新排一遍 */
  renumberSkillRows() {
    App.qsa('[data-skill-row]').forEach(function (row, i) {
      const no = App.qs('.row-item__no', row);
      if (no) { no.textContent = '第 ' + (i + 1) + ' 条'; }
    });
  },

  /* ---------- 7.4 保存 ---------- */
  save() {
    if (this.state.mode === 'profile') { this.saveProfile(); }
    else { this.saveSkills(); }
  },

  saveProfile() {
    if (!window.Auth || !Auth.gate()) { return; }
    const self = this;
    const val = function (id) {
      const node = App.qs('#' + id);
      return node ? node.value.trim() : '';
    };

    const patch = {
      owner: val('pOwner') || '无题',
      city: val('pCity'),
      slogan: val('pSlogan'),
      email: val('pEmail'),
      github: val('pGithub'),
      blog: val('pBlog'),
      heroEyebrow: val('pHeroEyebrow'),
      heroDesc: val('pHeroDesc'),
      heroTags: val('pHeroTags'),          /* SiteAPI 会自己把逗号字符串转成数组 */
      intro: val('pIntro'),
      aboutParagraphs: val('pAbout'),      /* 空行分段，SiteAPI 会自己转成数组 */
      keywords: val('pKeywords')
    };

    SiteAPI.updateProfile(patch).then(function (ok) {
      if (!ok) {
        App.toast('保存失败，看看控制台里的提示');
        return;
      }
      return SiteAPI.getProfile().then(function (p) {
        self.profile = p;
        self.renderProfile(p);
        self.renderContact(p);     /* 邮箱 / GitHub / 博客可能改了，联系方式也要刷 */
        self.close();
        App.toast('资料已保存');
      });
    });
  },

  saveSkills() {
    const self = this;

    /* 逐行读出来。什么都没填的空行直接丢掉。 */
    const list = App.qsa('[data-skill-row]').map(function (row) {
      const get = function (name) {
        const node = App.qs('[name="' + name + '"]', row);
        return node ? node.value.trim() : '';
      };
      let value = Number(get('value'));
      if (!isFinite(value)) { value = 0; }
      /* 收进 0~100，免得填了 500 进度条爆掉 */
      value = Math.max(0, Math.min(100, Math.round(value)));

      return {
        name: get('name'),
        value: value,
        level: get('level') || '在学',
        note: get('note')
      };
    }).filter(function (s) { return s.name; });   /* 没写名字的行不要 */

    SiteAPI.updateSkills(list).then(function (ok) {
      if (!ok) {
        App.toast('保存失败，看看控制台里的提示');
        return;
      }
      return SiteAPI.getProfile().then(function (p) {
        self.profile = p;
        self.renderSkills(p);
        self.close();
        App.toast(list.length ? ('技能表已保存（' + list.length + ' 条）') : '技能表已清空');
      });
    });
  },

  /* 底部那行小灰字：说明这次改动会存到哪 */
  saveWhereTip() {
    if (SiteAPI.isCloud()) {
      return '会写进' + SiteAPI.storeLabel() + '，换浏览器、换设备也还在。';
    }
    return SiteAPI.isDb()
      ? '会写进' + SiteAPI.storeLabel() + '，换浏览器也还在。'
      : '现在没连数据库，会存在浏览器里。想存进数据库请双击 <code>start.bat</code>。';
  }
};

document.addEventListener('DOMContentLoaded', function () {
  AboutPage.init();
});
