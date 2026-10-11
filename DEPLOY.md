# 上线说明：什么传 GitHub，什么传云端

> 站点根目录：`D:\WorkBuddy\2026-09-16-17-18-32\my-site`
> Git 仓库已经建好并提交过（`main` 分支），**但还没连到 GitHub** —— 下面第一节讲怎么连。

先记住一句话：

| 东西 | 放哪 |
|---|---|
| **网页的样子**（HTML / CSS / JS / 图片 / 音乐） | 传 **GitHub** |
| **站点的内容**（文章、小诗、留言、学习资料） | 传到 **Supabase 云端数据库** |
| **你的密码**（管理员密码、数据库本体） | **哪儿都不传**，留在本机 |

分开的意义：以后改文章内容，不用再传 GitHub，网页上登录改完，别人刷新就能看到。

---

## 一、直接上传 GitHub 的部分

也就是整个 `my-site` 目录 —— 下面这些**一个不落都要传**（共 650 个文件，约 86MB）：

```
my-site/
├── index.html  articles.html  poems.html  study.html
│   english.html  about.html  note.html  404.html      ← 各个页面
├── css/            全站样式
├── js/             全站脚本（含 config.js，注意见第二节）
├── assets/         英雄图、6 首背景音乐 mp3
├── c/              C 语言子站（含 559 张真题卷面图）
├── vendor/         站内用到的现成库
├── db/
│   ├── schema.sql            表结构说明（文本，可传）
│   ├── README.md             数据库说明（可传）
│   └── export-to-supabase.js 迁移脚本（本机跑，可传）
├── supabase.sql    云端建表脚本（文本，可传）
├── server.js       本机后端源码（可传，Pages 用不到）
├── start.bat       本机一键启动（可传）
├── package.json  README.md  feed.xml
└── .gitignore
```

**已经自动排除、绝对不会传上去的**（写在 `.gitignore` 里）：

| 文件 | 为什么不能传 |
|---|---|
| `db/site.db` | 里面是你全部文章内容 + 密码哈希 |
| `db/admin.secret` | 管理员明文密码 |
| `_bak/` | 本机备份 |
| `.tmp-*` | 临时排查脚本 |

> 我用 `git check-ignore` 逐个验过：这三个现在都是"已忽略"状态，可以放心。
> GitHub 单个文件上限 100MB，仓库里最大的是 `assets/audio/Echoes.mp3`（9MB），安全。

---

## 二、需要你「复制粘贴」到云端的部分

这部分不是传文件，是把几段内容粘到 Supabase 后台。一共 4 样：

### ① `supabase.sql` 的整段内容 → 粘到 Supabase 的 SQL Editor

- 用记事本/VS Code 打开仓库根目录的 `supabase.sql`，**全选复制**
- Supabase 后台左侧 **SQL Editor** → New query → 粘贴 → **Run**
- 作用：在云端建好 7 张表和权限规则

### ② Supabase 的网址 + 公开钥匙 → 粘到 `js/config.js`（要粘两遍）

Supabase 后台 **Settings → API** 里拿这两个值：

- `Project URL`（形如 `https://abcdefgh.supabase.co`）
- `anon public`（很长一串 `eyJhbGciOi...`）

粘到 `js/config.js` 里标着 `↓↓↓` 的地方：

```js
content:  { supabaseUrl: '粘贴 Project URL', supabaseKey: '粘贴 anon key' }
comments: { supabaseUrl: '粘贴 Project URL', supabaseKey: '粘贴 anon key' }
```

> anon key 是"公开钥匙"，本来就写在网页源码里被人看得到，不怕；
> 真正拦住别人乱改的是 `supabase.sql` 里那些权限规则（RLS）。

### ③ 你的邮箱 → 粘两处

- `js/config.js` 的 `adminEmails: [ '你的邮箱' ]`
- Supabase 后台 **Table Editor → admins 表** → 插一行同样的邮箱

两处必须一致，否则登录后按钮不显示。

### ④ service_role key → 只在命令行里用一次

Supabase 后台同一个 API 页面下方那条 **service_role**（也是 `eyJ...`）。
它只用来在本机把旧数据搬上云，**不要粘进任何文件、不要传到 GitHub**。

---

## 三、怎么把文件传到 GitHub（图形界面，最省事）

你装了 GitHub Desktop，用这个：

1. 打开 **GitHub Desktop**
2. 菜单 **File → Add local repository**
3. 目录选 `D:\WorkBuddy\2026-09-16-17-18-32\my-site`
   （如果它提示"这个目录还不是仓库"，先勾选 create a repository，但它其实已经是了）
4. 左下角填好 Summary（比如"上线第一版"）→ 点 **Commit to main**
5. 右上角 **Publish repository**
   - Name 填 `shuoscape`
   - **取消勾选** "Keep this code private" 才能给别人访问（GitHub Pages 免费版要公开库）
   - 点 Publish
6. 传完去网页版 GitHub 看看文件都在不在

> 这一步我已经把活干完了：仓库初始化、`.gitignore`、首次提交都做好了，你在 Desktop 里 add 进来就能直接 Publish。

### 备用：命令行

```bash
cd /d/WorkBuddy/2026-09-16-17-18-32/my-site
git remote add origin https://github.com/你的账号/shuoscape.git
git push -u origin main
```

---

## 四、开启 GitHub Pages（传完之后做一次）

1. GitHub 仓库页面 → **Settings → Pages**
2. Source 选 **Deploy from a branch**
3. Branch 选 **main**，文件夹选 **/ (root)** → Save
4. 等 1～2 分钟，刷新，页面顶部会出现网址：
   `https://你的账号.github.io/shuoscape/`

这个网址就可以直接发给别人测试了。

---

## 五、Supabase 云端：按顺序走 7 步

1. 打开 supabase.com，用 GitHub 账号登录
2. **New project**：名字随便，地区选 **Singapore**（离国内近，快）
3. 等它建好约 2 分钟
4. **SQL Editor** → 粘 `supabase.sql` → Run  ← 第二节的 ①
5. **Settings → API** → 抄下 Project URL 和 anon key → 填进 `js/config.js`  ← ②
6. 把 `js/config.js` 保存后，**重新传一次 GitHub**（改了文件就要重传）
7. 本机把旧数据搬上去 —— 在 `my-site` 目录开命令行：
   ```bash
   node db/export-to-supabase.js --url https://xxxx.supabase.co --key <service_role_key>
   ```
   key 用第 2 节 ④ 那条 service_role。脚本会先清空再整批写入，可以重复跑。

**最后一步：给自己建云端管理员账号**
- 打开 `https://你的账号.github.io/shuoscape/`
- 右上角登录 → 切到「注册」→ 用第 ③ 步那个邮箱注册
- 注册完刷新，右上角应该显示"管理员"，写文章按钮出现

---

## 六、找人测试前，建议先自查这几项

- [ ] Pages 网址能打开，首页 6 个栏目都在
- [ ] 换成手机流量打开（确认不是只有你本机 `127.0.0.1` 能访问）
- [ ] 文章页能点开详情、能留言（留言别人也应能看到）
- [ ] 音乐页能播放
- [ ] C 语言子站的真题图片能翻
- [ ] 你自己登录后，写一篇文章 + 插一张照片，保存后别人刷新能看到

> **给测试同学的话术**：随便点，留言随便写；如果哪个页面白屏或者报错，让他按 `F12` → Console 里截图发你。

---

## 七、以后再改动，怎么更新

| 你改了什么 | 怎么更新 |
|---|---|
| 网页样式 / 功能（css、js、html） | 改完 → GitHub Desktop 里 Commit → Push origin，Pages 一两分钟后自己更新 |
| 文章内容 / 小诗 / 唱片 / 留言 | **不用传 GitHub**。网页上登录管理员直接改，云端实时生效 |
| 换自己的照片 / 音乐 | 放进 `assets/` → 按上面第一种重传 |
| 让别人在某个设备上看新内容 | 什么都不用做，他们刷新即可 |

> 你提到的"后续有修改直接覆盖"就是这个意思：改完文件 → Desktop 里 Commit + Push，
> 它会自动对比差异、覆盖到 GitHub 上，不会重复也不会丢。

---

## 八、出问题时先看这里

| 现象 | 原因 / 怎么办 |
|---|---|
| Pages 打开是 404 | Settings → Pages 没开，或分支选错；根目录必须有 `index.html` |
| 页面能开但内容还是旧的 | 云服务没接上，检查 `js/config.js` 有没有填且已推送；浏览器 Ctrl+F5 强刷 |
| 登录后没有"写文章"按钮 | `adminEmails` 和 Supabase `admins` 表的邮箱不一致 |
| 插照片后点保存没反应 | 照片太大。用编辑器的「🖼 插入照片」按钮（会自动压缩），不要手动粘 base64 |
| 音乐没声音 | `assets/audio/` 的 6 个 mp3 有没有一起传上去 |

---

最后再提醒一次：**`db/site.db` 和 `db/admin.secret` 永远不要脱离这台电脑**。
换电脑时把这两个文件单独拷走，其他都从 GitHub 拉。
