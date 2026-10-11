/* ==========================================================================
   home.js —— 首页脚本
   --------------------------------------------------------------------------
   它做的事：
     1. 把 SITE_DATA 里的文案填进首屏（标题、副标题、标签）
     2. 渲染「关于我」小卡片
     3. 渲染「近期文章」3 篇
     4. 渲染「小诗」预告
     5. 渲染「近期推荐」大卡（取最新的一篇，含封面）
     6. 渲染「今天学了什么」两根进度条（学习页的预览）
     7. 首屏副标题的打字机效果

   ▍音乐现在就在本页
     10-10 起唱片机整台搬到了首页底部「曲音拾集」，由 js/music.js 负责。
     这里不再渲染歌单 —— 播放器就在下面，不用再跳一次。
   ========================================================================== */

const HomePage = {

  init() {
    this.renderHero();
    this.renderAbout();
    this.renderPosts();
    this.renderPoems();
    this.renderFeature();
    this.renderStudy();
  },

  /* ---------- 1. 首屏文案 ---------- */
  renderHero() {
    SiteAPI.getProfile().then(function (p) {
      const eyebrow = App.qs('[data-hero-eyebrow]');
      const title = App.qs('[data-hero-title]');
      const desc = App.qs('[data-hero-desc]');
      const tags = App.qs('[data-hero-tags]');

      if (eyebrow) { eyebrow.textContent = p.heroEyebrow; }
      if (title) { title.textContent = p.siteName; }
      if (tags) {
        tags.innerHTML = p.heroTags.map(function (t) {
          return '<span class="tag">' + App.escape(t) + '</span>';
        }).join('');
      }
      /* 副标题用打字机慢慢敲出来 */
      if (desc) { HomePage.typewriter(desc, p.heroDesc); }
    });
  },

  /* 打字机效果：一个字一个字显示
     打字时给元素加 is-typing，光标用 CSS 的 ::after 画出来 */
  typewriter(node, text, speed) {
    const step = speed || 62;
    let index = 0;
    node.textContent = '';
    node.classList.add('is-typing');

    function tick() {
      if (index >= text.length) {
        node.classList.remove('is-typing'); /* 打完了就把光标去掉 */
        return;
      }
      node.textContent += text.charAt(index);
      index += 1;
      setTimeout(tick, step);
    }
    setTimeout(tick, 600);
  },

  /* ---------- 2. 关于我小卡片 ---------- */
  renderAbout() {
    const box = App.qs('[data-about-card]');
    if (!box) { return; }
    SiteAPI.getProfile().then(function (p) {
      box.innerHTML =
        '<div class="about-card__avatar">' +
          /* 头像直接用 assets/avatar.jpg，换头像覆盖那个文件就行 */
          '<img src="assets/avatar.jpg" alt="' + App.escape(p.owner) + '">' +
        '</div>' +
        '<div>' +
          '<div class="about-card__eyebrow">ABOUT ME</div>' +
          '<div class="about-card__name">' + App.escape(p.owner) + '</div>' +
          '<div class="about-card__sub">' + App.escape(p.slogan) + '</div>' +
          '<p class="about-card__text">' + App.escape(p.intro) + '</p>' +
        '</div>';
    });
  },

  /* ---------- 3. 近期文章 ---------- */
  renderPosts() {
    const grid = App.qs('[data-recent-posts]');
    if (!grid) { return; }

    SiteAPI.getArticles({ limit: 3 }).then(function (list) {
      grid.innerHTML = list.map(function (a, i) {
        /* 封面交给 App.coverHtml 处理：
           文章放了照片就显示照片，没放就显示渐变色块 */
        const cls = i === 0 ? 'card post-card' : 'card post-card post-card--plain';
        return '' +
          '<article class="' + cls + '" data-id="' + a.id + '">' +
            App.coverHtml(a.cover, 'cover', a.title) +
            '<div class="post-card__body">' +
              '<div class="meta">' +
                '<span class="tag tag--pink">' + App.escape(a.category) + '</span>' +
                '<span>' + App.formatDate(a.date) + '</span>' +
              '</div>' +
              '<h3 class="post-card__title">' + App.escape(a.title) + '</h3>' +
              '<p class="post-card__desc">' + App.escape(a.excerpt) + '</p>' +
              '<div class="post-card__foot">' +
                '<span>' + a.words + ' 字</span>' +
                '<span>阅读 →</span>' +
              '</div>' +
            '</div>' +
          '</article>';
      }).join('');

      /* 绑定点击：跳到文章页并带上 id */
      App.qsa('.post-card', grid).forEach(function (card) {
        card.addEventListener('click', function () {
          window.location.href = 'articles.html?id=' + card.getAttribute('data-id');
        });
      });
    });
  },

  /* ---------- 4. 小诗预览 ---------- */
  renderPoems() {
    const box = App.qs('[data-home-poems]');
    if (!box) { return; }

    SiteAPI.getPoems().then(function (list) {
      /* 取 3 条 —— 右边那栏装了台唱片机，本来就比左边高；
         只放 2 条的话小诗卡底下会空一大截，两栏看着不像一对。 */
      const top = list.slice(0, 3);
      box.innerHTML = top.map(function (p) {
        return '' +
          '<a class="duo-item" href="poems.html">' +
            '<div class="duo-item__top">' +
              '<span>小诗</span>' +
              '<span class="meta__dot"></span>' +
              '<span>' + App.formatDate(p.date) + '</span>' +
            '</div>' +
            '<div class="duo-item__name">' + App.escape(p.title) + '</div>' +
            '<p class="duo-item__text">' + App.escape(p.text.replace(/\n/g, ' ')) + '</p>' +
          '</a>';
      }).join('');
    });
  },

  /* ---------- 5. 近期推荐大卡 ----------
     挑最新的一篇。原来这块的标题是写死在 HTML 里的（「游泳」），
     跟站里真实的文章对不上；现在从数据里取，改了文章它自己就跟着变。
     封面走 App.coverHtml：有照片显示照片，没照片就是粉紫渐变。 */
  renderFeature() {
    const card = App.qs('[data-feature]');
    if (!card) { return; }

    const titleBox = App.qs('[data-feature-title]');
    const metaBox = App.qs('[data-feature-meta]');
    const descBox = App.qs('[data-feature-desc]');
    const coverBox = App.qs('[data-feature-cover]');

    SiteAPI.getArticles({ limit: 1 }).then(function (list) {
      const a = list[0];

      /* 一篇文章都没有的时候别留一张空壳卡片 */
      if (!a) {
        if (titleBox) { titleBox.textContent = '暂无推荐'; }
        if (descBox) { descBox.textContent = '还没有文章，去文章页写第一篇吧。'; }
        return;
      }

      card.setAttribute('data-id', a.id);
      if (titleBox) { titleBox.textContent = a.title; }
      if (metaBox) { metaBox.textContent = a.category + ' · ' + App.formatDate(a.date); }
      if (descBox) { descBox.textContent = a.excerpt; }

      /* 封面：有照片显示照片（铺满裁切，不变形）；
         没照片就是一块粉紫渐变 —— 再在渐变上压一个分类大字当装饰，
         否则那一大块浅色看着就像「图没加载出来」。
         字写进 data-mark，样式是 .cover--mark::before（见 home.css）。 */
      if (coverBox) {
        coverBox.innerHTML = App.coverHtml(a.cover, 'cover', a.title);
        if (!App.isImageUrl(a.cover)) {
          const coverEl = App.qs('.cover', coverBox);
          if (coverEl) {
            coverEl.classList.add('cover--mark');
            coverEl.setAttribute('data-mark', a.category || '文');
          }
        }
      }
    });

    /* 点整张卡（包括右边那张封面）都跳去这篇文章。
       id 是渲染完才有的，所以在这里现取，不能提前闭包住。 */
    card.addEventListener('click', function () {
      const id = card.getAttribute('data-id');
      window.location.href = id ? ('articles.html?id=' + id) : 'articles.html';
    });
  },

  /* ---------- 6. 学习进度预览 ----------
     左右两栏：C 语言一栏、英语一栏。
     每栏 = 进度条 + 一句话现状 + 几个直接进去的入口，
     这样在首页就能一键跳到「章节练习」「真题」「词汇复习」这些地方，
     不用先经过学习页再找。真正的练习仍在学习页里，这里只做门。 */
  renderStudy() {
    const box = App.qs('[data-home-study]');
    if (!box || !SiteAPI.getStudy) { return; }

    Promise.all([SiteAPI.getStudy(), SiteAPI.getStudyProgress()]).then(function (res) {
      const study = res[0];
      const prog = res[1];
      const count = function (map) {
        return Object.keys(map || {}).filter(function (k) { return map[k]; }).length;
      };

      /* 英语的现状（词库多少词、多少待巩固）在浏览器里，english.js 存的那几把钥匙 */
      let words = 0, pending = 0, mats = 0;
      try {
        const list = JSON.parse(localStorage.getItem('shuoscape_en_materials') || '[]') || [];
        const wrong = JSON.parse(localStorage.getItem('shuoscape_en_wrong') || '[]') || [];
        const seen = {};
        list.forEach(function (m) {
          (m.words || []).forEach(function (w) {
            const k = String((w && w.en) || '').toLowerCase().trim();
            if (!k || seen[k]) { return; }
            seen[k] = 1; words += 1;
          });
        });
        mats = list.length;
        wrong.forEach(function (r) { if (r && !r.mastered) { pending += 1; } });
      } catch (e) { /* 没存过就是 0，照常显示 */ }

      /* 知识点条数：直接读 data.js 里存的数字。
         以前为了这个数把 js/notes-data.js（119KB 全文）也拉下来了，
         首页只是显示一个「23 条笔记」，不值当。 */
      const noteCount = (study.en && study.en.noteCount) || 0;

      const s = study.c.stats || {};
      const doneC = count(prog.c);
      const pctC = study.c.total ? Math.round((doneC / study.c.total) * 100) : 0;

      const colC = '' +
        '<div class="study-peek__col">' +
          '<a class="sp-head" href="study.html#c">' +
            '<span class="sp-head__name">C 语言</span>' +
            '<span class="sp-head__num"><b>' + doneC + '</b> / ' + study.c.total + '</span>' +
          '</a>' +
          '<span class="sp-bar"><i style="width:' + pctC + '%"></i></span>' +
          '<span class="sp-now">' + pctC + '% · ' +
            App.escape((s.chapters || 0) + ' 章 / ' + (s.total || 0) + ' 题 / ' + (s.papers || 0) + ' 套卷') +
          '</span>' +
          '<span class="sp-links">' +
            '<a href="c/index.html">学习总览</a>' +
            '<a href="c/practice.html">章节练习</a>' +
            '<a href="c/papers-image.html">真题试卷</a>' +
            '<a href="study.html#c">知识点清单</a>' +
          '</span>' +
        '</div>';

      const colEn = '' +
        '<div class="study-peek__col">' +
          '<a class="sp-head" href="study.html#en">' +
            '<span class="sp-head__name">英语</span>' +
            '<span class="sp-head__num"><b>' + words + '</b> 词汇</span>' +
          '</a>' +
          '<span class="sp-bar"><i style="width:' + (words ? 100 : 0) + '%"></i></span>' +
          '<span class="sp-now">' + mats + ' 份资料 · ' + pending + ' 条待巩固 · ' + noteCount + ' 条笔记</span>' +
          '<span class="sp-links">' +
            '<a href="english.html#vocab">词汇复习</a>' +
            '<a href="english.html#wrong">错题本</a>' +
            '<a href="english.html#materials">学习资料</a>' +
            '<a href="english.html#notes">知识点</a>' +
          '</span>' +
        '</div>';

      box.innerHTML = colC + colEn;
    });
  }
};

document.addEventListener('DOMContentLoaded', function () {
  HomePage.init();
});
