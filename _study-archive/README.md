# 学习板块封存处（_study-archive/）

2026-10-27：小站拆成「个人站」和「学习站」两个。这一版先把**个人站**做干净，
学习相关的页面和脚本整体搬到这里封存，**内容一个字没删**，随时能接回来。

---

## 一、这里有什么

```
_study-archive/
├── study.html              学习页（C 语言 + 英语打卡）
├── english.html            英语页（词汇复习 / 错题本 / 学习资料）
├── note.html               知识点阅读页（一条知识点一页）
├── js/
│   ├── study.js            学习页脚本
│   ├── english.js          英语页脚本
│   ├── progress-sync.js    练习记录上云同步（localStorage ↔ user_progress）
│   ├── en-seed-materials.js 四份固定搭配，250 词条（内置资料）
│   └── notes-data.js       课堂笔记全文 120KB（课堂知识点数据源）
├── css/
│   ├── study.css           学习页样式
│   └── english.css         英语页样式
└── c/                       C 语言练习站（79MB，主要是试卷图）
                             index / knowledge / practice / papers-image
```

## 二、个人站那边改了什么

拆的时候只动了「界面」，**没动后端**：

| 位置 | 改动 |
|---|---|
| 5 个页面的顶部导航、页脚 | 删掉「学习」链接 |
| `index.html` | 删掉「今天学了什么」整块卡片（含 `study-card` / `study-peek`） |
| `404.html` | 删掉「学习 / 英语 / C 语言练习站」三条链接 |
| `js/home.js` | 删掉 `renderStudy()` 整个函数（里面有指向 `c/` 的链接） |
| `js/search.js` | 删掉 `loadNotes()` / `findNotes()` 和「知识点」那一组结果 |
| `articles.html` | 搜索框文案改成「搜索文章、小诗…」 |

**保留下来的接口**（这就是「预留」的部分，后端原样没动）：

- `js/data.js` 里的 `getStudy()` / `getStudyProgress()` / `saveStudyProgress()`
  / `getEnMaterials()` / `saveEnMaterial()` —— 都还在，直接能用
- `server.js` 的 `/api/study*`、`/api/en-materials` 接口 —— 没动
- Supabase 的 `study_progress`、`en_materials`、`user_progress` 三张表 —— 没动
- `js/config.js` 的云端配置 —— 没动

## 三、以后学习站要接回来，怎么做

1. 把这里的文件按原路径拷回根目录：
   ```
   _study-archive/study.html english.html note.html  →  根目录
   _study-archive/js/*  →  js/
   _study-archive/css/* →  css/
   _study-archive/c/    →  c/
   ```
2. 在导航里加回 `<a href="study.html">学习</a>`（5 个页面的 topbar + 页脚）
3. 想让首页再显示进度预览：`js/home.js` 的 `init()` 里加回 `this.renderStudy()`，
   函数本体从 git 历史里找（提交 `拆分学习站` 那次删掉的）
4. 想让搜索再搜知识点：把 `loadNotes()` / `findNotes()` 加回 `js/search.js`，
   `render()` 多接一个 `notes` 参数、末尾再加一行 `group('知识点', '📘', nHtml)`

> 这些代码都能从 git 历史里完整找回来 —— `git log --diff-filter=D --name-only`。

## 四、当时的设计意向（下次做学习站时参考）

用户选定：**学习站进去就是一个选择界面，两个入口卡（C 语言 / 英语），
下面再带一块进度概览**（今天的打卡、待巩固数量之类），不是直接把内容铺开。
