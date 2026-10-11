/* ============================================================================
   schema.sql —— 数据库结构（建表语句）
   ----------------------------------------------------------------------------
   这是什么：一张「建表清单」。整个网站要用到的表都在这里定义。
   什么时候执行：运行 `npm run seed`（或 node db/seed.js）时会自动读这个文件，
                一次性建好所有的表。以后想加字段 / 加表，改这里再跑一次就行。

   ▍为什么用 SQLite？
     整个数据库就是**一个文件**（db/site.db），不用装服务、不用输密码、
     不用配端口。删掉这个文件 = 数据全没；复制这个文件 = 备份完成。
     对你来说最大的好处：**你学过的 MySQL 的 SQL 语法，在这里几乎原样能用**：

         MySQL                                SQLite（这里）
         ---------------------------------    ---------------------------------
         CREATE TABLE 建表                    一模一样
         INSERT INTO ... VALUES (...)         一模一样
         SELECT ... FROM ... WHERE ...        一模一样
         UPDATE ... SET ... WHERE ...         一模一样
         DELETE FROM ... WHERE ...            一模一样
         ORDER BY / LIMIT / COUNT / SUM      一模一样
         AUTO_INCREMENT                       AUTOINCREMENT（就换个写法）
         VARCHAR(200) / INT / TEXT            只有 TEXT / INTEGER / REAL（更省心）
         NOW()                                 datetime('now','localtime')

   ▍五张表，对应网站上五个东西
     profile    自我介绍（全站只存一行）
     skills     「正在学的东西」那一列表格
     articles   文章
     poems      小诗
     music      唱片
   ========================================================================== */


/* ----------------------------------------------------------------------------
   ① profile —— 自我介绍 / 站点信息
   ----------------------------------------------------------------------------
   这类数据的特点是「全站只有一份」，所以不用自增主键，
   直接固定 id = 1，永远只操作这一行。
   下面 CHECK (id = 1) 是给数据库加一条规矩：谁敢写 id = 2 就直接报错。

   ▍为什么 hero_tags / keywords / about_paragraphs 是 TEXT，不用单独建表？
     因为它们都是「一串简单的字符串」，不需要单独查询、排序、统计。
     最省事的做法就是存成一个长字符串，用逗号（或空行）隔开，
     取出来在前端 split 一下就行。
     什么时候该拆成单独的表？——当你需要「按标签查文章」「统计每个标签几篇」
     的时候。等真需要了再拆（那叫「数据库范式」，是后面才要学的东西）。
     现在这样叫「够用就好」，不是错。
   -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS profile (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  site_name         TEXT,      -- 朔的小窝
  site_en           TEXT,      -- Shuoscape
  brand_first       TEXT,      -- 左上角 logo 前半段：Shuo
  brand_second      TEXT,      -- 左上角 logo 后半段：scape
  owner             TEXT,      -- 昵称
  slogan            TEXT,      -- 一句话签名
  city              TEXT,      -- 城市
  email             TEXT,
  github            TEXT,
  blog              TEXT,
  hero_eyebrow      TEXT,      -- 首页小标题上面那行小字
  hero_desc         TEXT,      -- 首页副标题
  hero_tags         TEXT,      -- 逗号分隔，例如「随笔,小说,小诗,音乐」
  intro             TEXT,      -- 一句话自我介绍
  about_paragraphs  TEXT,      -- 自我介绍正文，段落之间空一行
  keywords          TEXT       -- 逗号分隔的关键词标签
);


/* ----------------------------------------------------------------------------
   ② skills —— 「正在学的东西」
   ----------------------------------------------------------------------------
   sort 这一列是「显示顺序」。数据库不保证你插入的顺序，
   想要固定顺序就必须自己存一列数字，查询时 ORDER BY sort。
   这是数据库里很容易踩的一个坑：不加 ORDER BY，每次出来的顺序可能不一样。
   -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS skills (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL,          -- 技能名
  value  INTEGER DEFAULT 0,      -- 进度百分比 0~100
  level  TEXT DEFAULT '在学',     -- 掌握 / 在学 / 计划
  note   TEXT,                   -- 一句话说明
  sort   INTEGER DEFAULT 0       -- 显示顺序（越小越靠前）
);


/* ----------------------------------------------------------------------------
   ③ articles —— 文章
   ----------------------------------------------------------------------------
   content 存的是整篇正文，段落之间用一个空行隔开：

       第一段……

       第二段……

   取出来之后在前端按空行 split 成数组，就变成一段一段的 <p> 了。
   为什么不一段存一行（一张 paragraphs 表）？
     因为文章的段落永远是「整篇一起读、整篇一起写」，不会单独查某一段。
     一行存一段反而每次都要拼、要排序，更麻烦。
   -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS articles (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  category   TEXT,               -- 随笔 / 小说 / 记录 / 笔记
  date       TEXT,               -- 'YYYY-MM-DD'
  tags       TEXT,               -- 逗号分隔
  series     TEXT,               -- 系列名，可空
  cover      TEXT,               -- 图片路径，或 CSS 渐变，可空
  excerpt    TEXT,               -- 列表卡片上那句话
  content    TEXT,               -- 正文，段落之间空一行
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

/* 文章列表默认按日期倒序、按分类筛选，所以给这两列各建一个索引。
   索引 ≈ 书的目录：不建也能用，数据多了就会变慢。
   现在数据少，加不加都感觉不出来，但这是好习惯。 */
CREATE INDEX IF NOT EXISTS idx_articles_date     ON articles (date DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles (category);


/* ----------------------------------------------------------------------------
   ④ poems —— 小诗
   ------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS poems (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT,               -- 标题，没想好就写「无题」
  date       TEXT,
  text       TEXT,               -- 诗句，中间用 \n 分行
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_poems_date ON poems (date DESC);


/* ----------------------------------------------------------------------------
   ⑤ music —— 唱片
   ----------------------------------------------------------------------------
   genre —— 分类，比如「民谣」「摇滚」「影视原声」；音乐页的碟架按它分组
   src   —— 本地音频的路径，例如 assets/audio/日落大道.mp3
            留空 = 只转唱片不出声
   url   —— 历史字段，界面已不再使用（保留是为了不破坏老库里的数据）
   -------------------------------------------------------------------------- */
CREATE TABLE IF NOT EXISTS music (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  artist   TEXT,
  note     TEXT,
  duration TEXT,                 -- '03:42'
  genre    TEXT,                 -- 分类，比如「民谣」「影视原声」；碟架按它分组
  src      TEXT,                 -- 本地音频，可空
  url      TEXT,                 -- 外部链接（历史字段，界面已不使用）
  sort     INTEGER DEFAULT 0
);
