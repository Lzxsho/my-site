# 上线说明：什么传 GitHub，怎么让人看到

> 站点根目录：`D:\WorkBuddy\2026-09-16-17-18-32\my-site`
> Git 仓库已建好、已连到 GitHub（`Lzxsho/shuoscape`）。
> **按你现在的决定：不配云端数据库**，整站走「本机服务 + GitHub Pages 静态站」两条路。

先记住一句话：

| 路线 | 谁用 | 有什么 |
|---|---|---|
| **本机服务**（start.bat） | 你自己写内容、手机测试 | 全功能：登录、写文章、传照片、留言 |
| **GitHub Pages**（网上） | 找来测试的人、所有访客 | 纯浏览：看文章、听音乐、翻真题卷 |

---

## 一、直接上传 GitHub 的部分

整个 `my-site` 目录 —— **一个不落都要传**（共 650 个文件，约 86MB）：

```
my-site/
├── index.html  articles.html  poems.html  study.html
│   english.html  about.html  note.html  404.html      ← 各个页面
├── css/  js/  assets/  c/  vendor/                     ← 样式、脚本、图片、音乐、C 子站
├── db/             schema.sql / README / 两个导出脚本（文本，可传）
├── supabase.sql  server.js  start.bat                  ← 可传，Pages 用不到但留着无害
├── package.json  README.md  DEPLOY.md  feed.xml  .gitignore
```

**自动排除、绝不传上去的**（`.gitignore` 已生效，我逐个验过）：

| 文件 | 为什么 |
|---|---|
| `db/site.db` | 你全部内容 + 密码哈希 |
| `db/admin.secret` | 管理员明文密码 |
| `_bak/`、`.tmp-*` | 本机备份和临时脚本 |

GitHub 单文件上限 100MB，仓库里最大的是 `assets/audio/Echoes.mp3`（9MB），安全。

---

## 二、传到 GitHub：GitHub Desktop（图形界面，推荐）

1. 打开 **GitHub Desktop**
2. **File → Add local repository** → 选 `D:\WorkBuddy\2026-09-16-17-18-32\my-site`
3. 左下角 Summary 填「上线第一版」→ **Commit to main**
4. 右上角 **Publish repository** → 名字填 `shuoscape`
   - 想让别人访问就**取消勾选** Keep this code private（Pages 免费版要求公开库）
   - 点 Publish
5. 等上传完（图片音乐多，第一次要几分钟）

> 我已经把仓库初始化、`.gitignore`、首次提交都做完了，你从第 1 步走下来就行。

### 开启 GitHub Pages（做一次就行）

1. GitHub 仓库页面 → **Settings → Pages**
2. Source：**Deploy from a branch**；Branch：**main** + **/ (root)** → Save
3. 一两分钟后，页面顶部出现网址：`https://lzxsho.github.io/shuoscape/`
   这个网址直接发给测试的人。

---

## 三、本机服务 + 手机访问（测试全功能用）

双击 `start.bat` 启动后，黑窗口里会直接打印：

```
  网站地址    http://localhost:5173/
  手机访问    同一个 Wi-Fi 下，用这个地址：
              http://192.168.111.176:5173/     ← 每台电脑不一样，以窗口里打印的为准
```

- 手机连**同一个 Wi-Fi**，浏览器打开那个 `192.168.x.x` 地址
- 手机能登录管理员（账号 lizhixu）、写文章、**传照片** —— 和电脑上完全一样
- 防火墙我已经放行过 5173 端口（规则名 Shuoscape 5173），直接用就行
- 注意：这个地址只在你的 Wi-Fi 里有效，关掉 start.bat 就没了；别人在外网访问不到

---

## 四、内容怎么同步到 Pages（最重要的一节）

**Pages 上没有后端**，访客看到的是仓库里 `js/data.js` 的内容。
你在本机网页上写的文章存进了 `db/site.db`（这个文件不上传），**所以写完要导一次**：

```bash
node db/export-to-datajs.js
```

它会：
1. 读取数据库里的文章 / 小诗 / 唱片 / 自我介绍
2. 写回 `js/data.js`（分类雅称、学习页配置这些手写内容原样保留）
3. 自动做语法检查，写坏不会落盘
4. 全部一致时会直接说「不用导出」

然后照常提交推送（GitHub Desktop 里 Commit + Push，或命令行）：

```bash
git add js/data.js
git commit -m "同步内容"
git push
```

等 Pages 自动更新（一两分钟），刷新就能看到新文章。

**日常流程总结**：
> 平时写作 → 开 start.bat，网页里登录写（自动压缩照片）→
> 想发布 → 跑一次 `node db/export-to-datajs.js` → Desktop 里 Commit + Push → 完成。

---

## 五、以后改代码 / 样式

改了 html / css / js 任何文件：GitHub Desktop 里 Commit + Push 就行，Pages 自动更新。
（改内容和改代码可以一起推，不用分开。）

---

## 六、给测试的人怎么说

- 手机/电脑浏览器打开 Pages 网址
- 能看文章、翻真题卷、听音乐、留言（留言存在各人自己的浏览器里，互相看不到——不配云就是这样的）
- 如果哪个页面白屏：按 F12 → Console 截图发你

你自己想测「登录 + 写文章 + 传照片」，用第三节的 `192.168.x.x` 地址。

---

## 七、以后想上云（可选，现在不用做）

哪天想让所有人共用一份内容、留言全球互通，再按下面的做：

1. supabase.com 用 GitHub 账号登录 → New project（地区选 Singapore）
2. SQL Editor → 粘 `supabase.sql` 全部内容 → Run
3. Settings → API 抄下 Project URL 和 anon key，填进 `js/config.js`（content 和 comments 两处）
4. `adminEmails` 填你的邮箱；Supabase 的 admins 表也插同一个邮箱
5. 数据搬家：`node db/export-to-supabase.js --url https://xxxx.supabase.co --key <service_role_key>`

做完这些，Pages 上的站自动切换到云端数据，不用再跑第四节里的导出步骤。

---

## 八、出问题先看这里

| 现象 | 怎么办 |
|---|---|
| Pages 打开 404 | Settings → Pages 没开，或分支/目录选错；根目录必须有 index.html |
| Pages 内容还是旧的 | push 完等一两分钟；浏览器 Ctrl+F5 强刷 |
| 手机打不开 192.168.x.x | 确认手机连的同一个 Wi-Fi；确认 start.bat 窗口还开着 |
| 插照片保存没反应 | 用编辑器的「🖼 插入照片」按钮（自动压缩），别手动粘 base64 |
| 音乐没声音 | assets/audio/ 的 6 个 mp3 要一起传上去 |
| 换了 Wi-Fi 手机连不上 | 电脑 IP 会变，以 start.bat 窗口最新打印的为准 |

---

最后提醒：**`db/site.db` 和 `db/admin.secret` 永远不要传到任何地方**。
换电脑时把这两个文件单独拷走，其他都从 GitHub 拉。
