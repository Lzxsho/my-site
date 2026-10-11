# 数据库说明（db 文件夹）

这个文件夹里放着网站的数据库。整个数据库就是**一个文件**：`site.db`。

```
db/
├── site.db        ← 数据库本体。你的文章、小诗、唱片、自我介绍都在这里
├── schema.sql     ← 建表清单。里面的建表语句决定了有哪些表、每张表有哪些列
├── seed.js        ← 导入脚本。第一次建库时，把 js/data.js 里的内容导进来
└── README.md      ← 你正在看的这个文件
```

---

## 一、怎么用

### 第一次（只需一次）

```bash
node db/seed.js
```

它会建好 `db/site.db`，并把 `js/data.js` 里现有的 10 篇文章、6 首小诗、
6 张唱片、自我介绍和技能表全部导进去。

### 以后

不用再跑。改内容有两种方式：

| 想干什么 | 怎么做 |
|---|---|
| 加/改一篇文章 | 跑起网站，在文章页点「✎ 写文章」或文章里的「编辑」 |
| 加/改小诗 | 小诗页每条旁边的「编辑」 |
| 加/改唱片 | 音乐页「＋ 添加唱片」，或每张碟右上角的「✎」 |
| 改自我介绍 / 正在学的东西 | 关于页的「✎ 编辑资料」「✎ 编辑技能表」 |
| 直接改表里的数据 | 用 VS Code 打开 `db/site.db`（见下面第三节） |
| 清空重来 | `node db/seed.js --reset` ← **会删掉所有内容，恢复成初始数据** |

> `node db/seed.js` 不会覆盖已有的数据 —— 检测到库里已经有文章时会自动跳过。
> 只有加 `--reset` 才会真的清空重来。这个设计是为了防止手滑把写的文章冲掉。

---

## 二、五张表

数据库里一共五张表，对应网站上的五样东西。

### ① `profile` —— 自我介绍 / 站点信息

只有一行（`id` 固定是 1）。这类「全站只有一份」的数据，用一个固定主键就够，
不用自增。

| 列 | 说明 |
|---|---|
| `site_name` / `site_en` | 站点名 / 英文名 |
| `owner` `slogan` `city` `email` `github` `blog` | 昵称、签名、城市、联系方式 |
| `hero_eyebrow` `hero_desc` `hero_tags` | 首页首屏上的三处文案 |
| `intro` `about_paragraphs` `keywords` | 一句话简介、自我介绍正文、关键词 |

`hero_tags`、`keywords` 存的是 `随笔,小说,小诗,音乐` 这样的逗号串；
`about_paragraphs` 存的是一整段长文本，**段落之间空一行**。

### ② `skills` —— 「正在学的东西」

| 列 | 说明 |
|---|---|
| `name` | 技能名 |
| `value` | 进度百分比 0~100 |
| `level` | `掌握` / `在学` / `计划` |
| `note` | 一句话说明 |
| `sort` | 显示顺序，越小越靠前 |

> **为什么要有一列 `sort`？** 数据库不保证查询结果的顺序。
> 不写 `ORDER BY`，同一条 SQL 每次出来的顺序可能都不一样。
> 想要固定顺序，就得自己存一列数字排。这是很容易踩的一个坑。

### ③ `articles` —— 文章

| 列 | 说明 |
|---|---|
| `title` `category` `date` | 标题 / 分类（随笔·小说·记录·笔记）/ 日期 |
| `tags` | 逗号分隔的标签 |
| `series` | 系列名，可空 |
| `cover` | 封面：图片路径，或一段 CSS 渐变，可空 |
| `excerpt` | 列表卡片上那句话 |
| `content` | 正文，**段落之间空一行** |
| `created_at` | 建库时自动填 |

### ④ `poems` —— 小诗

`title` / `date` / `text`。`text` 里换行用 `\n`（数据库里就是真的换行符）。

### ⑤ `music` —— 唱片

`name` / `artist` / `genre`（分类）/ `note` / `duration` / `src`（本地音频路径）/
`url`（历史字段，界面已不使用）/ `sort`。

- `genre` 是分类，碟架按它**分组显示**（民谣、摇滚、影视原声……）。
  没填的歌会归进最后一组「未分类」，不会丢。
- `src` 指向 `assets/audio/` 里的文件。**六个文件名已经提前填好**，
  文件放进去就自动生效；留空 = 这张碟只会转、不出声。
  后缀不用和这里写的一致（写了 `.mp3`，放 `.m4a` / `.ogg` / `.wav` 也能认出来）；
  位置也不用死板 —— 平铺在 `assets/audio/` 下，或者按分类/歌手建子文件夹
  （`assets/audio/民谣/归去来兮.mp3`）都能被找到。
- `url` 是历史字段。早先页面上有「跳去网易云」的按钮，9-17 连按钮带字段
  一起退役了；**列还留着**（免得删列麻烦），但代码不再读它。

> `genre` 是后加的列，`embed`（网易云外链播放器，已随功能一起移除）是删掉的列。
> 加列靠 `server.js` 里的 `MIGRATIONS` 自动 `ALTER TABLE`；删列靠它旁边的 `DROPS`
> 自动 `DROP COLUMN`（SQLite 要 3.35+ 才支持，不支持就留着不影响使用）。
> 两件事都**不会动你已有的数据**（详见根目录 README 的常见问题）。

想批量换歌单：改 `js/data.js` 的 `music[]`，然后跑

```bash
node db/sync-music.js
```

**只动 `music` 一张表**，文章 / 小诗 / 个人资料都保留。
（`node db/seed.js --reset` 会把五张表全清空重建，换了歌单但写过文章的话别用它。）

---

## 三、怎么在 VS Code 里看数据库

装两个插件就够了（`Ctrl + Shift + X` 打开扩展面板，搜名字安装）：

### 1. `SQLite Viewer`（作者 Florian Klämpfl / qwtel）

**最推荐先装这个。** 装完之后，在 VS Code 左侧的文件列表里
**双击 `db/site.db`**，就会直接打开一个表格界面：左边是表名，右边是数据。
不用敲任何命令，看数据最直观。

命令行安装：

```
code --install-extension qwtel.sqlite-viewer
```

### 2. `SQLite`（作者 alexcvzz）

这个偏「干活」用：侧边栏多一个数据库图标，能像浏览文件夹一样看表结构，
还能写 SQL 查询、以表格看结果、直接改数据。

命令行安装：

```
code --install-extension alexcvzz.vscode-sqlite
```

两个插件不冲突，是互补的：
**看数据用 SQLite Viewer，写 SQL 用 SQLite。**

### ⚠️ 装完发现打不开 / 显示一堆乱码？

九成是这三个原因：

1. **文件路径里有中文或空格。** 你现在这个项目路径是
   `D:\WorkBuddy\2026-09-16-17-18-32\my-site\db\site.db`，全是英文，没问题。
   但如果以后把项目放到「我的文档/项目」这种中文目录下，就可能打不开。
2. **文件被别的程序占着。** 比如 `node server.js` 还开着。
   一般不影响读取，但如果要改数据就先把服务停掉（关掉那个黑窗口）。
3. **VS Code 没信任这个文件夹。** 右下角弹出
   "Do you trust the authors of this folder?" 时点 **Trust Folder**。

另外：如果双击 `.db` 打开的是乱码，在该文件上右键 →
「打开方式」→「SQLite Viewer」即可（默认打开方式被别的扩展抢了）。

### 想用独立软件也行

**DB Browser for SQLite**（免费开源，官网 sqlitebrowser.org）——
不用装 VS Code 插件也能看，界面更像 Excel，还能导入导出 CSV。

---

## 四、几条能直接用的 SQL

装了 alexcvzz 的 SQLite 插件之后，新建一个查询面板，把这些粘进去试试
（都是你学过的语法，跟 MySQL 一样）：

```sql
-- 看看所有文章（按日期从新到旧）
SELECT id, title, category, date, tags FROM articles ORDER BY date DESC;

-- 一共几篇，每篇多少字
SELECT COUNT(*) AS 篇数, SUM(LENGTH(content)) AS 总字数 FROM articles;

-- 按分类统计，每类几篇
SELECT category, COUNT(*) AS 篇数 FROM articles GROUP BY category ORDER BY 篇数 DESC;

-- 搜索：标题或正文里带「信」的
SELECT id, title FROM articles WHERE title LIKE '%信%' OR content LIKE '%信%';

-- 找标签最多的那几篇（按逗号数量粗略估）
SELECT title, tags, (LENGTH(tags) - LENGTH(REPLACE(tags, ',', '')) + 1) AS 标签数
FROM articles ORDER BY 标签数 DESC LIMIT 5;

-- 技能表按进度排序
SELECT name, value, level FROM skills ORDER BY value DESC;

-- 统计每种学习状态各几条
SELECT level, COUNT(*) FROM skills GROUP BY level;
```

---

## 五、想换成 MySQL 怎么办

先泼一盆冷水：**不用换。** 这个站的规模，SQLite 完全够用，而且更省事
（就一个文件，不用装服务、不用配账号密码、不用管端口）。

但如果以后想练手 MySQL，改动比想象中小：

1. **SQL 语句几乎不用改** —— 建表语句里的
   `AUTOINCREMENT` 换成 `AUTO_INCREMENT`，
   `TEXT`/`INTEGER` 换成 `VARCHAR(200)`/`INT`，
   `datetime('now','localtime')` 换成 `NOW()`。就这些。见 `schema.sql` 开头的对照表。
2. **真正要改的只有一处：`server.js` 里连数据库那几行。**
   把 `node:sqlite` 换成 `mysql2` 这个包，再把几个 `db.prepare(...).run/get/all`
   换成 `connection.execute(...)`。接口函数的逻辑一行都不用动。
3. 网页前端（`js/` 里所有文件）**完全不用改** ——
   因为它们只认 `/api/...` 这个地址，不关心后面接的是什么数据库。

这就是当初把「数据从哪来」和「页面怎么显示」分开写的好处。
