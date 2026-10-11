/* ==========================================================================
   data.js —— 全站数据 + 数据接口层
   --------------------------------------------------------------------------
   【这个文件很重要，先看这里】

   ▍现在有三套「仓库」，页面自己不用管用的是哪套

     ┌ 云端模式 ── js/config.js 里填了 Supabase 配置（优先级最高）
     │    数据存在 Supabase 云端数据库，走原生 fetch + REST，不装任何库。
     │    好处：传到 GitHub Pages 上也能读写；你用邮箱密码登录后改内容，
     │          所有人刷新看到的都是同一版。
     │
     ├ 数据库模式 ── 你运行了 server.js（双击 start.bat）
     │    数据存在 db/site.db 这个数据库文件里。
     │    网页通过 server.js 提供的 /api/... 接口读写它。
     │    好处：换浏览器、换电脑都还在；能在 VS Code 里直接打开看。
     │
     └ 本地模式 ──── 直接双击 html 打开（没有服务器）
          数据还是写在下面的 SITE_DATA 里，你自己改的内容存在浏览器里。
          好处：不用启动任何东西，改完刷新就能看。

   启动时它会自动挑一套（云端优先 → 其次探后端 → 都没有就本地）。
   下面这个对象就是「转发员」：

        SiteAPI.getArticles()  →  云端模式？  → 问云端
                               →  数据库模式？ → 问服务器
                               →  本地模式？  → 读本地数据

   页面里只调用 SiteAPI，从来不直接碰数据来源 ——
   所以三套模式切换，页面代码一行都不用改。这就是「预留接口」的价值。

   ▍想改内容，有三种办法，随便挑
       ① 跑起网站，在界面上改（写入数据库，推荐）
       ② 用 VS Code 打开 db/site.db 直接改表
       ③ 不想跑服务器：改下面的 SITE_DATA，刷新浏览器就行
          （注意：这条只影响「没连上后端」的时候）

   ▍文件的六个部分
       一、初始内容 SITE_DATA
       二、纯工具 Pure              正文分段、数字数、标签归一化
       三、本地模式 LocalStore
       四、数据库模式 DbStore
       四·五、云端模式 CloudStore    js/config.js 填了 Supabase 才用得上
       五、转发员 SiteAPI

   加载顺序必须是：data.js → main.js → 各页面自己的 js
   ========================================================================== */

/* --------------------------------------------------------------------------
   一、初始内容 SITE_DATA
   --------------------------------------------------------------------------
   这一份是「初始数据」：跑 db/seed.js 建数据库时，就是把这些内容导进去的。
   建完库之后，网站读的就是数据库了，改这里不会影响已建好的数据库。
   想改数据库里的内容 → 用界面上改，或者用 seed 的 --reset 重新导一遍。
   -------------------------------------------------------------------------- */
const SITE_DATA = {
  "profile": {
    "siteName": "朔的小窝",
    "siteEn": "Shuoscape",
    "brandFirst": "Shuo",
    "brandSecond": "scape",
    "owner": "L小旭",
    "slogan": "Undefined, still becoming.",
    "heroEyebrow": "L小旭 · PERSONAL SPACE",
    "heroDesc": "文字 · 记录 · 音乐 · 开发，以及发光的胡思乱想",
    "heroTags": [
      "随笔",
      "小说",
      "小诗",
      "音乐"
    ],
    "intro": "喜欢文字与音乐，也在文字与想象之间，慢慢确认自己。",
    "city": "某座有风的城市",
    "email": "2625407261@qq.com",
    "github": "",
    "blog": "",
    "aboutParagraphs": [
      "我很难用几个固定的词把自己说清楚。兴趣和想法总在变，对很多事也还没有稳定的答案，比起给自己下一个准确的定义，我更习惯在不停地怀疑和推断中，慢慢确认自己真正喜欢什么。",
      "我最喜欢文字与音乐，也常被虚构的故事吸引。遇到喜欢的作品时，常常会在结束之后惦记很久，反复回想其中的情绪、人物和那些没有被直接说出的东西。偶尔也会写一点小诗或小说，大多来自突然出现的念头，未必完整，但足够真实。",
      "这个站点是我给自己留的一块空地。写下来的东西不一定要有意义，能被记住就已经很好。"
    ],
    "keywords": [
      "文字",
      "音乐",
      "随笔",
      "小说",
      "前端开发",
      "睡不着的夜"
    ],
    "skills": [
      {
        "name": "HTML",
        "value": 82,
        "level": "掌握",
        "note": "语义化标签、表单、常见属性，现在能凭记忆写完一个页面骨架。"
      },
      {
        "name": "CSS",
        "value": 72,
        "level": "掌握",
        "note": "Flex / Grid 布局、响应式断点、CSS 变量，正在练「一套样式同时适配手机」。"
      },
      {
        "name": "写作 / 小诗",
        "value": 80,
        "level": "掌握",
        "note": "随笔和小诗写得最多，也在意行距、字距这种别人不太看的小事。"
      },
      {
        "name": "JavaScript",
        "value": 46,
        "level": "在学",
        "note": "DOM 操作和事件已经很熟，Promise、async 还在慢慢啃。"
      },
      {
        "name": "Git / GitHub",
        "value": 32,
        "level": "在学",
        "note": "add / commit / push 已经顺手，分支和合并刚摸到门。"
      },
      {
        "name": "数据库（MySQL）",
        "value": 12,
        "level": "计划",
        "note": "下一站。想先把「表要怎么设计」这件事弄清楚。"
      },
      {
        "name": "Node.js / 后端",
        "value": 8,
        "level": "计划",
        "note": "等 JS 再稳一点就上路，目标是给这个小站写一套真正的接口。"
      }
    ]
  },
  "articles": [
    {
      "id": "a1",
      "title": "小李的第一篇笔记",
      "category": "随笔",
      "date": "2026-09-17",
      "tags": [
        "日常"
      ],
      "series": "更新日志",
      "cover": "",
      "excerpt": "送给焦虑的你",
      "content": "送给焦虑的你\n       有的人二十岁就嫁人生子，有的人三十岁了还在追寻自己，有的人为车房拼搏一辈子，有的人五十岁骑着一辆单车走南闯北。\n       你要成为什么样的人，过怎么样的生活，有既定的时间。你没有领先，也没有落后，每个人花期不同，不必焦虑有人比你提前拥有。人生不是短程跑，而是马拉松，在自己的时区里，一切都准时。\n       一岁有一岁的味道，一站有一站的风景，花会沿途盛开，以后的路也是"
    },
    {
      "id": "a2",
      "title": "第二次博客正式更新：重新整理小站，也重新认识这里",
      "category": "成长",
      "date": "2026-07-22",
      "tags": [
        "博客",
        "更新",
        "整理"
      ],
      "series": "更新日志",
      "cover": "linear-gradient(135deg,#dfe8ff,#c7d4ff 60%,#b9c9ff)",
      "excerpt": "文字、小诗、音乐与技术被重新整理，小站有了更清楚的结构。",
      "content": "这次更新的重点不是加了什么功能，而是把已有内容重新摆了一遍。\n\n首页不再堆砌所有东西，只保留了最近的文章、几句小诗和一张正在听的唱片；文章按分类归档，小诗按时间排成一条线，音乐做成了可以点的唱片。\n\n把东西变少，反而更容易看清自己想留下什么。"
    },
    {
      "id": "a3",
      "title": "第一次博客正式更新：富文本、内置音乐播放器与阅读细节",
      "category": "成长",
      "date": "2026-07-16",
      "tags": [
        "博客",
        "更新",
        "音乐"
      ],
      "series": "更新日志",
      "cover": "",
      "excerpt": "朔的小窝的第一次正式更新，顺手把音乐播放器和阅读体验一起做了。",
      "content": "准备了很久，终于算是有个能拿出手的版本了。\n\n这次主要做了三件事：文章支持更丰富的排版、加了一个内置的音乐区、以及调整了阅读时的行距和字号。\n\n后面还会继续改，但先让它跑起来比较重要。"
    },
    {
      "id": "a4",
      "title": "夏夜的便利店与一罐凉掉的咖啡",
      "category": "随笔",
      "date": "2026-06-28",
      "tags": [
        "夏天",
        "日常",
        "随笔"
      ],
      "series": "",
      "cover": "linear-gradient(135deg,#ffe9d6,#ffd8ec 60%,#e3d4ff)",
      "excerpt": "凌晨一点的便利店灯很亮，亮到能看清货架上每一件商品的名字。",
      "content": "凌晨一点的便利店，灯光总是比白天更亮一些，亮到能看清货架上每一件商品的名字。\n\n我买了一罐冰咖啡，走出来的时候发现外面在下很小的雨。雨丝在灯下看得见，落到手上却几乎感觉不到。\n\n咖啡喝到一半就凉了，我站在屋檐下，忽然觉得这样的夜晚也挺好。"
    },
    {
      "id": "a5",
      "title": "写在凌晨三点的信",
      "category": "心绪",
      "date": "2026-06-11",
      "tags": [
        "夜",
        "信件"
      ],
      "series": "",
      "cover": "",
      "excerpt": "有些话白天说不出来，只有在凌晨三点，才敢一个字一个字地写下来。",
      "content": "见字如面。\n\n有些话白天说不出来，只有在凌晨三点，才敢一个字一个字地写下来。\n\n我不知道这封信会不会寄出去，但写下来的那一刻，心里确实轻了一点。"
    },
    {
      "id": "a6",
      "title": "《在世界的尽头开一家店》第一章",
      "category": "小说",
      "date": "2026-05-30",
      "tags": [
        "小说",
        "长篇",
        "奇幻"
      ],
      "series": "世界尽头系列",
      "cover": "linear-gradient(135deg,#d9f0ff,#c9dcff 60%,#dccfff)",
      "excerpt": "世界尽头其实没有尽头，只有一条慢慢变淡的路，和路边那家亮着灯的小店。",
      "content": "世界尽头其实没有尽头，只有一条慢慢变淡的路，和路边那家亮着灯的小店。\n\n店主是个不太爱说话的人，他把店开在这里已经有七年了。\n\n「你这里卖什么？」旅人问。\n\n「卖一些，你走的时候会想带走的东西。」"
    },
    {
      "id": "a7",
      "title": "雨天的第七封信",
      "category": "小说",
      "date": "2026-05-14",
      "tags": [
        "小说",
        "短篇",
        "雨"
      ],
      "series": "",
      "cover": "",
      "excerpt": "她在雨天写了七封信，前六封都没有寄出，第七封寄给了自己。",
      "content": "她在雨天写了七封信。\n\n前六封都封好了口，却一封也没有寄出去。\n\n第七封，她写给了自己。信封上只写了一个字：收。"
    },
    {
      "id": "a8",
      "title": "前端笔记：CSS 变量让换肤变简单",
      "category": "成长",
      "date": "2026-05-02",
      "tags": [
        "CSS",
        "前端",
        "笔记"
      ],
      "series": "前端学习",
      "cover": "linear-gradient(135deg,#e5fff6,#d3f4ff 60%,#e0dcff)",
      "excerpt": "把颜色和圆角都写成变量，一个类名就能换掉整站的风格。",
      "content": "把颜色、圆角、阴影全部写成 CSS 变量放在 :root 里，好处是可以一次性改掉全站风格。\n\n如果需要深色模式，只需要再写一套变量，然后给 body 加一个类名就行。\n\n这个站点就是这么做的，可以在 base.css 的开头看到全部变量。"
    },
    {
      "id": "a9",
      "title": "读书笔记：关于「慢」这件事",
      "category": "心绪",
      "date": "2026-04-19",
      "tags": [
        "阅读",
        "笔记"
      ],
      "series": "",
      "cover": "",
      "excerpt": "快的东西容易被记住，慢的东西才容易被留下。",
      "content": "快的东西容易被记住，慢的东西才容易被留下。\n\n读完一本书需要几天，但想起它可能需要几年。\n\n所以我决定，把一些事情做得慢一点。"
    },
    {
      "id": "a10",
      "title": "深夜的歌单",
      "category": "心绪",
      "date": "2026-04-03",
      "tags": [
        "音乐",
        "夜"
      ],
      "series": "",
      "cover": "linear-gradient(135deg,#f3e6ff,#e0d4ff 60%,#d6e6ff)",
      "excerpt": "有些歌只能在深夜听，白天放出来就完全不是那个味道了。",
      "content": "有些歌只能在深夜听，白天放出来就完全不是那个味道了。\n\n大概是因为夜里的世界比较安静，才装得下那些多余的情绪。"
    }
  ],
  "poems": [
    {
      "id": "p6",
      "title": "无题",
      "date": "2026-03-27",
      "text": "把话说轻一点，\n好让它在落地之前，\n还能飞一会儿。"
    },
    {
      "id": "p5",
      "title": "关于回信",
      "date": "2026-01-11",
      "text": "我寄出去的东西都变成风了，\n所以你现在听到的响动，\n可能就是我。"
    },
    {
      "id": "p4",
      "title": "深夜用词",
      "date": "2025-09-02",
      "text": "凌晨两点适合写错别字，\n因为没有人会在那个时候\n纠正你的心事。"
    },
    {
      "id": "p3",
      "title": "风的三行",
      "date": "2025-08-15",
      "text": "风从北边来，\n带走了我说了一半的话，\n和没有说出口的另一半。"
    },
    {
      "id": "p2",
      "title": "存在否认",
      "date": "2025-07-07",
      "text": "全部丑，请把爱消去，\n万物与我有关，\n而我在等自己的回信。"
    },
    {
      "id": "p1",
      "title": "双重否定",
      "date": "2025-06-23",
      "text": "“你什么都没有？”\n“我在等你说那句话的那天。”"
    }
  ],
  "music": [
    {
      "id": "m1",
      "name": "Echoes",
      "artist": "免版权曲库",
      "genre": "氛围",
      "note": "《迷藏》的最后压轴曲。黄昏、公路，和一点点孤独。",
      "duration": "03:46",
      "src": "assets/audio/Echoes.mp3"
    },
    {
      "id": "m2",
      "name": "Far From Home",
      "artist": "免版权曲库",
      "genre": "民谣",
      "note": "出自《一碗》。中间那段戏腔，是整首歌的分水岭。",
      "duration": "01:37",
      "src": "assets/audio/Far From Home.mp3"
    },
    {
      "id": "m3",
      "name": "Fifth of February",
      "artist": "免版权曲库",
      "genre": "钢琴",
      "note": "民谣。适合一个人待着的时候单曲循环。",
      "duration": "03:08",
      "src": "assets/audio/Fifth of February.mp3"
    },
    {
      "id": "m4",
      "name": "Forest Walk",
      "artist": "免版权曲库",
      "genre": "轻音乐",
      "note": "同名剧的主题曲。尤克里里和曼陀铃，听完整个人会松下来。",
      "duration": "02:54",
      "src": "assets/audio/Forest Walk.mp3"
    },
    {
      "id": "m5",
      "name": "Old Old Love",
      "artist": "免版权曲库",
      "genre": "民谣",
      "note": "出自《小王》。竖琴和琵琶对着说话，走四季，访人家。",
      "duration": "01:47",
      "src": "assets/audio/Old Old Love.mp3"
    },
    {
      "id": "m6",
      "name": "The Long Road",
      "artist": "免版权曲库",
      "genre": "轻音乐",
      "note": "《我们与恶的距离》的插曲。\"路过人间，也才几十年\"。",
      "duration": "01:37",
      "src": "assets/audio/The Long Road.mp3"
    }
  ],
  "categories": [
    "全部",
    "随笔",
    "小说",
    "心绪",
    "成长",
    "际遇",
    "风景",
    "人像",
    "知己",
    "剧感",
    "敬慕榜样",
    "猫日常",
    "食忆",
    "博主"
  ],
  "columns": [
    {
      "name": "诗札",
      "tag": "自作小诗",
      "desc": "自己写下的几行短句，配上日期。",
      "page": "poems.html"
    },
    {
      "name": "短句手记",
      "tag": "随笔",
      "desc": "想到哪儿写到哪儿的短文，不讲究结构。",
      "cat": "随笔"
    },
    {
      "name": "心事一隅",
      "tag": "心绪",
      "desc": "不太好意思说出口的那部分，写下来会轻一点。",
      "cat": "心绪"
    },
    {
      "name": "寸进录",
      "tag": "成长",
      "desc": "学新东西、把这个小站一点点做出来的过程。",
      "cat": "成长"
    },
    {
      "name": "山河拾影",
      "tag": "风景",
      "desc": "路上撞见的山、河、天色，和当时的空气。",
      "cat": "风景"
    },
    {
      "name": "人间留影",
      "tag": "人像",
      "desc": "镜头里出现过的人，和那一下的光。",
      "cat": "人像"
    },
    {
      "name": "知交书",
      "tag": "知己",
      "desc": "写给朋友的话，多半没寄出去。",
      "cat": "知己"
    },
    {
      "name": "观剧偶感",
      "tag": "剧感",
      "desc": "剧和电影看完之后，剩下的那点东西。",
      "cat": "剧感"
    },
    {
      "name": "仰贤录",
      "tag": "敬慕榜样",
      "desc": "想成为的那种人，和为什么想成为。",
      "cat": "敬慕榜样"
    },
    {
      "name": "猫伴小记",
      "tag": "猫日常",
      "desc": "猫主子的日常，它并不知情。",
      "cat": "猫日常"
    },
    {
      "name": "浮生纪事",
      "tag": "际遇",
      "desc": "生活里撞上的事，好的坏的都记一笔。",
      "cat": "际遇"
    },
    {
      "name": "食味存章",
      "tag": "食忆",
      "desc": "吃过的、还想再吃一次的东西。",
      "cat": "食忆"
    },
    {
      "name": "同好撷英",
      "tag": "博主",
      "desc": "喜欢的博主，和他们让我停下来的作品。",
      "cat": "博主"
    },
    {
      "name": "曲音拾集",
      "tag": "乐曲",
      "desc": "最近在循环的几首歌，就在首页底下。",
      "page": "index.html#music"
    }
  ],
  "study": {
    "c": {
      "intro": "按你自己的节奏往下走，会一条就勾一条。上面的入口是已经搬进来的那套完整练习站。",
      "stats": {
        "chapters": 10,
        "chapterQ": 515,
        "papers": 32,
        "paperQ": 1002,
        "specials": 5,
        "total": 1517
      },
      "groups": [
        {
          "name": "起步",
          "items": [
            {
              "id": "c1-1",
              "name": "程序的基本结构",
              "note": "#include、main 函数、语句与分号，写完能编译跑起来。"
            },
            {
              "id": "c1-2",
              "name": "printf 输出",
              "note": "格式符 %d %f %c %s，还有换行和转义字符。"
            },
            {
              "id": "c1-3",
              "name": "scanf 输入",
              "note": "取地址符 &、多个输入的写法、输入缓冲区的小坑。"
            },
            {
              "id": "c1-4",
              "name": "注释与代码风格",
              "note": "写清楚、排整齐，比写快更重要。"
            }
          ]
        },
        {
          "name": "数据与运算",
          "items": [
            {
              "id": "c2-1",
              "name": "基本数据类型",
              "note": "int / float / double / char，各占多少字节、能放多大。"
            },
            {
              "id": "c2-2",
              "name": "常量与变量",
              "note": "定义、初始化、命名规则，#define 与 const 的区别。"
            },
            {
              "id": "c2-3",
              "name": "运算符与优先级",
              "note": "算术、关系、逻辑、自增自减，以及「先算谁」。"
            },
            {
              "id": "c2-4",
              "name": "类型转换",
              "note": "自动转换和强制转换，整数除法为什么老是 0。"
            }
          ]
        },
        {
          "name": "流程控制",
          "items": [
            {
              "id": "c3-1",
              "name": "if / else",
              "note": "分支、嵌套、else 到底跟谁配对。"
            },
            {
              "id": "c3-2",
              "name": "switch",
              "note": "break 不加会一路漏下去，这是考点也是坑点。"
            },
            {
              "id": "c3-3",
              "name": "三种循环",
              "note": "while / do-while / for，各自适合什么场景。"
            },
            {
              "id": "c3-4",
              "name": "break 与 continue",
              "note": "跳出循环和跳过本次，别搞混。"
            }
          ]
        },
        {
          "name": "数组与字符串",
          "items": [
            {
              "id": "c4-1",
              "name": "一维数组",
              "note": "定义、初始化、下标从 0 开始、越界会怎样。"
            },
            {
              "id": "c4-2",
              "name": "二维数组",
              "note": "按行存放，遍历两层循环怎么写。"
            },
            {
              "id": "c4-3",
              "name": "字符数组与字符串",
              "note": "字符串以 '\\0' 结尾，长度和内容长度不是一回事。"
            },
            {
              "id": "c4-4",
              "name": "常用字符串函数",
              "note": "strlen / strcpy / strcat / strcmp，自己写一遍会更懂。"
            }
          ]
        },
        {
          "name": "函数",
          "items": [
            {
              "id": "c5-1",
              "name": "定义与调用",
              "note": "返回值、参数列表、函数声明放哪儿。"
            },
            {
              "id": "c5-2",
              "name": "参数传递",
              "note": "值传递改不动外面的变量，想改就得传地址。"
            },
            {
              "id": "c5-3",
              "name": "递归",
              "note": "找基线条件，算阶乘、斐波那契。"
            },
            {
              "id": "c5-4",
              "name": "作用域与存储类别",
              "note": "局部变量、全局变量、static 到底改变了什么。"
            }
          ]
        },
        {
          "name": "指针",
          "items": [
            {
              "id": "c6-1",
              "name": "地址与指针变量",
              "note": "& 取地址、* 取值，int *p 到底声明了什么。"
            },
            {
              "id": "c6-2",
              "name": "指针与数组",
              "note": "p[i] 就是 *(p+i)，数组名是个常量指针。"
            },
            {
              "id": "c6-3",
              "name": "指针与函数",
              "note": "用指针把结果带出来，swap 为什么必须传地址。"
            },
            {
              "id": "c6-4",
              "name": "指针与字符串",
              "note": "char *s 和 char s[] 的区别，别改字面量。"
            }
          ]
        },
        {
          "name": "结构体与文件",
          "items": [
            {
              "id": "c7-1",
              "name": "结构体",
              "note": "定义、成员访问、结构体数组、typedef 起别名。"
            },
            {
              "id": "c7-2",
              "name": "链表基础",
              "note": "结点、头指针、插入和删除的指针怎么改。"
            },
            {
              "id": "c7-3",
              "name": "文件读写",
              "note": "fopen / fprintf / fscanf / fclose，打开方式要配对。"
            },
            {
              "id": "c7-4",
              "name": "预处理与宏",
              "note": "#define 带参宏、头文件包含、条件编译。"
            }
          ]
        }
      ]
    },
    "en": {
      "intro": "导入自己的词库，练英译汉、汉译英；答错的进错题本，重新答对就自动毕业。",
      "noteCount": 23,
      "words": [
        {
          "id": "e1",
          "word": "abandon",
          "phonic": "/əˈbændən/",
          "meaning": "v. 放弃；抛弃",
          "example": "He abandoned the plan at the last minute."
        },
        {
          "id": "e2",
          "word": "benefit",
          "phonic": "/ˈbenɪfɪt/",
          "meaning": "n. 好处 v. 有益于",
          "example": "Regular exercise benefits both body and mind."
        },
        {
          "id": "e3",
          "word": "capacity",
          "phonic": "/kəˈpæsəti/",
          "meaning": "n. 容量；能力",
          "example": "The hall has a capacity of 500 people."
        },
        {
          "id": "e4",
          "word": "declare",
          "phonic": "/dɪˈkleə(r)/",
          "meaning": "v. 宣布；声明",
          "example": "She declared that she would run for office."
        },
        {
          "id": "e5",
          "word": "efficient",
          "phonic": "/ɪˈfɪʃnt/",
          "meaning": "adj. 效率高的",
          "example": "We need a more efficient way to sort the data."
        },
        {
          "id": "e6",
          "word": "familiar",
          "phonic": "/fəˈmɪliə(r)/",
          "meaning": "adj. 熟悉的",
          "example": "This error looks familiar to me."
        },
        {
          "id": "e7",
          "word": "generate",
          "phonic": "/ˈdʒenəreɪt/",
          "meaning": "v. 产生；生成",
          "example": "The program generates a report every night."
        },
        {
          "id": "e8",
          "word": "hesitate",
          "phonic": "/ˈhezɪteɪt/",
          "meaning": "v. 犹豫",
          "example": "Don't hesitate to ask for help."
        },
        {
          "id": "e9",
          "word": "ignore",
          "phonic": "/ɪɡˈnɔː(r)/",
          "meaning": "v. 忽视",
          "example": "He ignored the warning and got lost."
        },
        {
          "id": "e10",
          "word": "justify",
          "phonic": "/ˈdʒʌstɪfaɪ/",
          "meaning": "v. 证明…正当",
          "example": "Nothing can justify such rudeness."
        },
        {
          "id": "e11",
          "word": "maintain",
          "phonic": "/meɪnˈteɪn/",
          "meaning": "v. 维持；维护",
          "example": "It is hard to maintain a balance."
        },
        {
          "id": "e12",
          "word": "negotiate",
          "phonic": "/nɪˈɡəʊʃieɪt/",
          "meaning": "v. 谈判；协商",
          "example": "They negotiated a better price."
        },
        {
          "id": "e13",
          "word": "obvious",
          "phonic": "/ˈɒbviəs/",
          "meaning": "adj. 明显的",
          "example": "The answer was obvious to everyone."
        },
        {
          "id": "e14",
          "word": "participate",
          "phonic": "/pɑːˈtɪsɪpeɪt/",
          "meaning": "v. 参加",
          "example": "Over 200 students participated in the contest."
        },
        {
          "id": "e15",
          "word": "qualify",
          "phonic": "/ˈkwɒlɪfaɪ/",
          "meaning": "v. 使合格",
          "example": "She qualified for the final round."
        },
        {
          "id": "e16",
          "word": "reliable",
          "phonic": "/rɪˈlaɪəbl/",
          "meaning": "adj. 可靠的",
          "example": "We need a reliable source of information."
        },
        {
          "id": "e17",
          "word": "significant",
          "phonic": "/sɪɡˈnɪfɪkənt/",
          "meaning": "adj. 重要的",
          "example": "There was a significant drop in temperature."
        },
        {
          "id": "e18",
          "word": "temporary",
          "phonic": "/ˈtemprəri/",
          "meaning": "adj. 临时的",
          "example": "This is only a temporary solution."
        },
        {
          "id": "e19",
          "word": "urgent",
          "phonic": "/ˈɜːdʒənt/",
          "meaning": "adj. 紧急的",
          "example": "There is an urgent need for clean water."
        },
        {
          "id": "e20",
          "word": "variety",
          "phonic": "/vəˈraɪəti/",
          "meaning": "n. 多样；种类",
          "example": "The shop sells a variety of notebooks."
        }
      ],
      "sentences": [
        {
          "en": "Small steps every day beat one big step someday.",
          "zh": "每天一小步，胜过某天一大步。"
        },
        {
          "en": "You don't have to be great to start, but you have to start to be great.",
          "zh": "不必很厉害才开始，但要开始才会很厉害。"
        },
        {
          "en": "Progress is progress, no matter how small.",
          "zh": "进步就是进步，再小也算。"
        },
        {
          "en": "The best time to plant a tree was ten years ago. The second best is now.",
          "zh": "种树最好的时机是十年前，其次是现在。"
        },
        {
          "en": "Done is better than perfect.",
          "zh": "完成比完美更重要。"
        },
        {
          "en": "Keep going. Everything you need will come to you.",
          "zh": "继续走，你需要的会在路上遇到。"
        }
      ]
    }
  }
};

/* 挂到 window 上，保证别的文件一定能访问到。
   （db/seed.js 也是靠这一行，才能把上面的内容读出来导进数据库） */
window.SITE_DATA = SITE_DATA;


/* ==========================================================================
   二、纯工具 Pure
   --------------------------------------------------------------------------
   这几个函数不碰数据来源，两种模式都要用，所以单独放一份。
   ========================================================================== */
const DataTools = {

  /* ------------------------------------------------------------------------
     栏目小工具：分类值 ⇄ 雅称
     ------------------------------------------------------------------------
     文章里存的还是「随笔」「成长」这种好懂的分类值，
     页面上要显示的是「短句手记」「寸进录」这种雅称 ——
     改名字只动 SITE_DATA.columns，数据一条都不用改。

       columnOf('随笔')    → { name:'短句手记', tag:'随笔', … }
       columnName('随笔')  → '短句手记'        （筛选标签用）
       columnLabel('随笔') → '短句手记 · 随笔'  （卡片上的小标签用）

     没在栏目表里登记过的分类（比如「小说」），原样返回，不会显示成空白。 */
  columnOf(tag) {
    const t = String(tag || '').trim();
    if (!t) { return null; }
    return SITE_DATA.columns.find(function (c) { return c.cat === t; }) || null;
  },

  columnName(tag) {
    const c = this.columnOf(tag);
    return c ? c.name : String(tag || '').trim();
  },

  columnLabel(tag) {
    const t = String(tag || '').trim();
    if (!t) { return ''; }
    const c = this.columnOf(t);
    return c ? (c.name + ' · ' + c.tag) : t;
  },

  /* 把正文统一成「段落数组」。三种写法都认：
       content: ['第一段', '第二段']          数组
       content: `第一段……\n\n第二段……`        多行字符串，按空行分段（推荐）
       content: '第一段……\n\n第二段……'        同上 */
  toParagraphs(content) {
    if (Array.isArray(content)) {
      return content
        .map(function (s) { return String(s === undefined || s === null ? '' : s).trim(); })
        .filter(function (s) { return s.length > 0; });
    }
    if (typeof content !== 'string') { return []; }

    const lines = content.replace(/\r\n/g, '\n').split('\n');

    /* 1. 去掉整体缩进：找出非空行里最少的缩进量，一起减掉。
          这样在代码里把正文缩进着写，显示出来也不会每行都带一堆空格。 */
    let indent = Infinity;
    lines.forEach(function (line) {
      if (!line.trim()) { return; }
      const spaces = line.match(/^[ \t]*/)[0].length;
      if (spaces < indent) { indent = spaces; }
    });
    if (!isFinite(indent)) { indent = 0; }

    const text = lines
      .map(function (line) { return line.slice(indent).replace(/[ \t]+$/, ''); })
      .join('\n');

    /* 2. 按「空行」切段 */
    return text
      .split(/\n[ \t]*\n+/)
      .map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });
  },

  /* 段落数组 → 存进数据库的那个长字符串（段落之间空一行） */
  joinParagraphs(value) {
    return DataTools.toParagraphs(value).join('\n\n');
  },

  /* 数字数：把空白去掉之后数剩下的字符，中英文都按「一个字」算。 */
  countWords(paragraphs) {
    return paragraphs.join('').replace(/\s/g, '').length;
  },

  /* 把标签统一成数组。写成数组、或者图省事写成「用逗号隔开的字符串」，
     两种都认：
        tags: ['随笔', '日常']
        tags: '随笔, 日常'
     不这么做的话，后者会让「搜索」直接报错、整个文章列表都出不来。 */
  toTags(tags) {
    const clean = function (t) { return String(t).trim(); };
    if (Array.isArray(tags)) {
      return tags.map(clean).filter(function (t) { return t; });
    }
    if (typeof tags === 'string') {
      return tags.split(/[,，、;；\s]+/).map(clean).filter(function (t) { return t; });
    }
    return [];
  },

  /* 任何值都变成字符串，绝不返回 null / undefined。
     免得数据库里某个字段是空的时候，页面上取 .length 直接报错。 */
  str(value) {
    return value === undefined || value === null ? '' : String(value);
  },

  /* 任何值都变成一个数字 */
  num(value, fallback) {
    const n = Number(value);
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  },

  /* 今天，格式 2026-09-16 */
  today() {
    return new Date().toISOString().slice(0, 10);
  },

  /* 复制一份对象（只复制一层就够用了） */
  copy(obj) {
    return Object.assign({}, obj);
  }
};


/* ==========================================================================
   三、本地模式 LocalStore
   --------------------------------------------------------------------------
   没有服务器时用这套：内置内容来自 SITE_DATA，你自己加的 / 改的 / 删的
   记在浏览器的 localStorage 里，读取时合并成最终结果。

   为什么不直接在 SITE_DATA 上改？因为浏览器刷新一次 JS 就重新跑一遍，
   改动全丢了。所以「我改了什么」必须存在浏览器自己的存储里。
   ========================================================================== */
const LocalStore = {

  /* localStorage 的 key。换名字 = 换一套全新的本地数据 */
  KEY: 'shuoscape_user_data_v1',

  /* 空的本地数据骨架：
       poems / articles / music        —— 自己新增的内容
       xxxEdits                        —— 对「内置内容」的修改，读取时盖到原文上
       xxxHidden                       —— 被隐藏（删掉）的内置内容 id
       profileEdits                    —— 改过的自我介绍字段
       skills                          —— 整张技能表（改过就以这个为准） */
  empty() {
    return {
      poems: [],
      articles: [],
      music: [],
      poemEdits: {},
      articleEdits: {},
      musicEdits: {},
      poemHidden: [],
      articleHidden: [],
      musicHidden: [],
      profileEdits: {},
      skills: null
    };
  },

  read() {
    const empty = this.empty();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) { return empty; }
      const data = Object.assign(empty, JSON.parse(raw));
      /* 兼容老版本存下来的数据 / 手动改坏的 JSON：缺什么补什么 */
      ['poems', 'articles', 'music', 'poemHidden', 'articleHidden', 'musicHidden']
        .forEach(function (k) { if (!Array.isArray(data[k])) { data[k] = []; } });
      ['poemEdits', 'articleEdits', 'musicEdits', 'profileEdits']
        .forEach(function (k) {
          if (!data[k] || typeof data[k] !== 'object' || Array.isArray(data[k])) { data[k] = {}; }
        });
      if (data.skills !== null && !Array.isArray(data.skills)) { data.skills = null; }
      return data;
    } catch (e) {
      console.warn('[SiteAPI] 本地数据解析失败，已重置', e);
      return empty;
    }
  },

  write(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('[SiteAPI] 本地保存失败（可能是图片太大，浏览器存不下了）', e);
      return false;
    }
  },

  /* 自己模拟一点网络延迟，让 Promise 的用法和数据库模式保持一致 */
  delay(data, ms) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(data); }, ms === undefined ? 60 : ms);
    });
  },

  /* ---------------- 合并：内置 + 自己写的 + 改过的 − 删掉的 ----------------
     三个动作的顺序很重要：先删、再合并、最后盖修改。 */
  mergeArticles(store) {
    const edits = store.articleEdits || {};
    const hidden = store.articleHidden || [];

    return SITE_DATA.articles
      .concat(store.articles)
      .filter(function (a) { return hidden.indexOf(a.id) === -1; })
      .map(function (a) {
        const item = DataTools.copy(a);      /* 复制一份，改副本不会污染 SITE_DATA */
        const patch = edits[a.id];
        if (patch) {
          Object.assign(item, patch);
          item.edited = true;                /* 卡片上据此显示「已修改」标签 */
        }
        item.content = DataTools.toParagraphs(item.content);
        item.tags = DataTools.toTags(item.tags);
        item.words = DataTools.countWords(item.content);
        return item;
      });
  },

  mergePoems(store) {
    const edits = store.poemEdits || {};
    const hidden = store.poemHidden || [];

    return SITE_DATA.poems
      .concat(store.poems)
      .filter(function (p) { return hidden.indexOf(p.id) === -1; })
      .map(function (p) {
        const item = DataTools.copy(p);
        const patch = edits[p.id];
        if (patch) {
          Object.assign(item, patch);
          item.edited = true;
        }
        return item;
      });
  },

  mergeMusic(store) {
    const edits = store.musicEdits || {};
    const hidden = store.musicHidden || [];

    return SITE_DATA.music
      .concat(store.music)
      .filter(function (m) { return hidden.indexOf(m.id) === -1; })
      .map(function (m) {
        const item = DataTools.copy(m);
        const patch = edits[m.id];
        if (patch) {
          Object.assign(item, patch);
          item.edited = true;
        }
        return item;
      });
  },

  /* 按日期从新到旧排 */
  byDateDesc(a, b) { return a.date < b.date ? 1 : -1; },

  /* ---------------- 自我介绍 ---------------- */
  getProfile() {
    const store = this.read();
    const p = Object.assign({}, SITE_DATA.profile, store.profileEdits || {});
    /* 数组字段做一次归一化，避免有人在界面上把它们存成字符串 */
    p.heroTags = DataTools.toTags(p.heroTags);
    p.keywords = DataTools.toTags(p.keywords);
    p.aboutParagraphs = DataTools.toParagraphs(p.aboutParagraphs);
    p.skills = (store.skills || SITE_DATA.profile.skills || []).map(function (s) {
      return {
        name: DataTools.str(s.name),
        value: DataTools.num(s.value),
        level: DataTools.str(s.level) || '在学',
        note: DataTools.str(s.note)
      };
    });
    return this.delay(p, 0);
  },

  updateProfile(patch) {
    const store = this.read();
    const clean = Object.assign({}, patch);
    if ('aboutParagraphs' in clean) {
      clean.aboutParagraphs = DataTools.toParagraphs(clean.aboutParagraphs);
    }
    if ('heroTags' in clean) { clean.heroTags = DataTools.toTags(clean.heroTags); }
    if ('keywords' in clean) { clean.keywords = DataTools.toTags(clean.keywords); }
    store.profileEdits = Object.assign({}, store.profileEdits, clean);
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  updateSkills(list) {
    const store = this.read();
    store.skills = (Array.isArray(list) ? list : []).map(function (s) {
      return {
        name: DataTools.str(s.name),
        value: DataTools.num(s.value),
        level: DataTools.str(s.level) || '在学',
        note: DataTools.str(s.note)
      };
    });
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  /* ---------------- 文章 ---------------- */
  getArticles(options) {
    const opt = options || {};
    const store = this.read();
    let list = this.mergeArticles(store);

    if (opt.category && opt.category !== '全部') {
      list = list.filter(function (a) { return a.category === opt.category; });
    }
    if (opt.keyword) {
      const kw = String(opt.keyword).toLowerCase();
      list = list.filter(function (a) {
        /* 不管字段有没有值，都拼成字符串再找，避免报错 */
        const text = [a.title, a.excerpt, (a.tags || []).join(''), a.series || ''].join(' ');
        return text.toLowerCase().indexOf(kw) > -1;
      });
    }
    list.sort(this.byDateDesc);
    if (opt.limit) { list = list.slice(0, opt.limit); }
    return this.delay(list, 80);
  },

  getArticle(id) {
    const store = this.read();
    const key = String(id);
    const found = this.mergeArticles(store).find(function (a) { return String(a.id) === key; });
    return this.delay(found || null, 60);
  },

  addArticle(article) {
    const store = this.read();
    const item = Object.assign({
      id: 'ua' + Date.now(),
      title: '无题',
      category: '随笔',
      date: DataTools.today(),
      tags: [],
      series: '',
      cover: '',
      excerpt: '',
      content: [],
      mine: true
    }, article);

    item.content = DataTools.toParagraphs(item.content);
    item.tags = DataTools.toTags(item.tags);
    if (!item.excerpt) { item.excerpt = item.content.length ? item.content[0].slice(0, 60) : ''; }

    store.articles.unshift(item);
    const ok = this.write(store);
    return this.delay(ok ? item : null, 60);
  },

  updateArticle(id, patch) {
    const store = this.read();
    const key = String(id);
    const clean = Object.assign({}, patch);
    if ('content' in clean) { clean.content = DataTools.toParagraphs(clean.content); }
    if ('tags' in clean) { clean.tags = DataTools.toTags(clean.tags); }

    const mine = store.articles.find(function (a) { return String(a.id) === key; });
    if (mine) {
      Object.assign(mine, clean);
      mine.edited = true;
    } else {
      store.articleEdits[key] = Object.assign({}, store.articleEdits[key], clean);
    }
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  removeArticle(id) {
    const store = this.read();
    const key = String(id);
    const before = store.articles.length;
    store.articles = store.articles.filter(function (a) { return String(a.id) !== key; });

    if (store.articles.length === before && store.articleHidden.indexOf(key) === -1) {
      store.articleHidden.push(key);
    }
    delete store.articleEdits[key];
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  restoreArticles() {
    const store = this.read();
    store.articleEdits = {};
    store.articleHidden = [];
    this.write(store);
    return this.delay(true, 40);
  },

  articleMarks() {
    const store = this.read();
    return this.delay({
      hidden: store.articleHidden.length,
      edited: Object.keys(store.articleEdits).length
    }, 0);
  },

  /* ---------------- 小诗 ---------------- */
  getPoems() {
    const store = this.read();
    const list = this.mergePoems(store);
    list.sort(this.byDateDesc);
    return this.delay(list, 80);
  },

  addPoem(poem) {
    const store = this.read();
    const item = {
      id: 'up' + Date.now(),
      title: poem.title || '无题',
      date: poem.date || DataTools.today(),
      text: DataTools.str(poem.text),
      mine: true
    };
    store.poems.unshift(item);
    this.write(store);
    return this.delay(item, 60);
  },

  updatePoem(id, patch) {
    const store = this.read();
    const key = String(id);
    const mine = store.poems.find(function (p) { return String(p.id) === key; });

    if (mine) {
      Object.assign(mine, patch);
      mine.edited = true;
    } else {
      store.poemEdits[key] = Object.assign({}, store.poemEdits[key], patch);
    }
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  removePoem(id) {
    const store = this.read();
    const key = String(id);
    const before = store.poems.length;
    store.poems = store.poems.filter(function (p) { return String(p.id) !== key; });

    if (store.poems.length === before && store.poemHidden.indexOf(key) === -1) {
      store.poemHidden.push(key);
    }
    delete store.poemEdits[key];
    this.write(store);
    return this.delay(true, 40);
  },

  restorePoems() {
    const store = this.read();
    store.poemEdits = {};
    store.poemHidden = [];
    this.write(store);
    return this.delay(true, 40);
  },

  poemMarks() {
    const store = this.read();
    return this.delay({
      hidden: store.poemHidden.length,
      edited: Object.keys(store.poemEdits).length
    }, 0);
  },

  /* ---------------- 音乐 ---------------- */
  getMusic() {
    const store = this.read();
    return this.delay(this.mergeMusic(store), 80);
  },

  addMusic(track) {
    const store = this.read();
    const item = {
      id: 'um' + Date.now(),
      name: DataTools.str(track.name) || '未命名',
      artist: DataTools.str(track.artist),
      note: DataTools.str(track.note),
      duration: DataTools.str(track.duration),
      src: DataTools.str(track.src),
      genre: DataTools.str(track.genre),
      mine: true
    };
    store.music.push(item);
    this.write(store);
    return this.delay(item, 60);
  },

  updateMusic(id, patch) {
    const store = this.read();
    const key = String(id);
    const mine = store.music.find(function (m) { return String(m.id) === key; });

    if (mine) {
      Object.assign(mine, patch);
      mine.edited = true;
    } else {
      store.musicEdits[key] = Object.assign({}, store.musicEdits[key], patch);
    }
    const ok = this.write(store);
    return this.delay(ok, 40);
  },

  removeMusic(id) {
    const store = this.read();
    const key = String(id);
    const before = store.music.length;
    store.music = store.music.filter(function (m) { return String(m.id) !== key; });

    if (store.music.length === before && store.musicHidden.indexOf(key) === -1) {
      store.musicHidden.push(key);
    }
    delete store.musicEdits[key];
    this.write(store);
    return this.delay(true, 40);
  },

  /* ---------------- 学习资料 / 错题本（本地模式：存浏览器） ----------------
     本地模式没有服务器也没有云端，资料就住 IndexedDB（容量比 localStorage
     大得多，整本讲义也装得下），由 js/english.js 的 EnStore 直接读写，
     不经过 SiteAPI —— 所以这里没有对应方法。 */
};


/* ==========================================================================
   四、数据库模式 DbStore
   --------------------------------------------------------------------------
   跑着 server.js 的时候用这套：所有读写都通过 /api/... 接口，
   真正落到 db/site.db 这个数据库文件上。

   这里只做两件事：
     1. 发请求（fetch）
     2. 把数据库回来的格式，整理成页面期待的样子
        （数据库里 tags 是 'A,B' 字符串 → 页面要数组
          数据库里 content 是一整段长文本 → 页面要段落数组
          数据库里 id 是数字 → 页面上「找一篇」是拿字符串比，统一成字符串）
   ========================================================================== */
const DbStore = {

  /* ---------------- 请求 ---------------- */
  request(method, url, body) {
    const options = { method: method, headers: {} };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    /* 写操作要带上登录凭证 —— 服务端不认就返回 403。
       凭证是登录后由 /api/session 发回来的，自己（浏览器 localStorage）保存着。 */
    if (method !== 'GET' && typeof Auth !== 'undefined' && Auth.token) {
      const token = Auth.token();
      if (token) { options.headers['X-Admin-Token'] = token; }
    }

    return fetch(url, options).then(function (res) {
      return res.text().then(function (raw) {
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
        if (!res.ok) {
          const msg = (data && data.error) ? data.error : ('HTTP ' + res.status);
          throw new Error(msg);
        }
        return data;
      });
    });
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  del(url) { return this.request('DELETE', url); },

  /* ---------------- 归一化：数据库的行 → 页面要的形状 ---------------- */
  article(row) {
    if (!row) { return null; }
    const paragraphs = DataTools.toParagraphs(row.content);
    return {
      id: String(row.id),                       /* 统一成字符串，好和网址里的 ?id= 比 */
      title: DataTools.str(row.title),
      category: DataTools.str(row.category) || '随笔',
      date: DataTools.str(row.date),
      tags: DataTools.toTags(row.tags),
      series: DataTools.str(row.series),
      cover: DataTools.str(row.cover),
      excerpt: DataTools.str(row.excerpt),
      content: paragraphs,
      words: DataTools.countWords(paragraphs),
      fromDb: true
    };
  },

  poems(rows) {
    return rows.map(function (p) {
      return {
        id: String(p.id),
        title: DataTools.str(p.title) || '无题',
        date: DataTools.str(p.date),
        text: DataTools.str(p.text),
        fromDb: true
      };
    });
  },

  track(m) {
    return {
      id: String(m.id),
      name: DataTools.str(m.name),
      artist: DataTools.str(m.artist),
      note: DataTools.str(m.note),
      duration: DataTools.str(m.duration),
      src: DataTools.str(m.src),
      genre: DataTools.str(m.genre),
      fromDb: true
    };
  },

  profile(row) {
    const r = row || {};
    return {
      siteName: DataTools.str(r.siteName),
      siteEn: DataTools.str(r.siteEn),
      brandFirst: DataTools.str(r.brandFirst),
      brandSecond: DataTools.str(r.brandSecond),
      owner: DataTools.str(r.owner),
      slogan: DataTools.str(r.slogan),
      city: DataTools.str(r.city),
      email: DataTools.str(r.email),
      github: DataTools.str(r.github),
      blog: DataTools.str(r.blog),
      heroEyebrow: DataTools.str(r.heroEyebrow),
      heroDesc: DataTools.str(r.heroDesc),
      heroTags: DataTools.toTags(r.heroTags),
      intro: DataTools.str(r.intro),
      aboutParagraphs: DataTools.toParagraphs(r.aboutParagraphs),
      keywords: DataTools.toTags(r.keywords),
      skills: (r.skills || []).map(function (s) {
        return {
          name: DataTools.str(s.name),
          value: DataTools.num(s.value),
          level: DataTools.str(s.level) || '在学',
          note: DataTools.str(s.note)
        };
      })
    };
  },

  /* ---------------- 自我介绍 ---------------- */
  getProfile() {
    return this.get('/api/profile').then(function (row) { return DbStore.profile(row); });
  },

  updateProfile(patch) {
    const body = Object.assign({}, patch);
    /* 这两个字段在数据库里存的是「一段长文本」，不是数组 */
    if ('aboutParagraphs' in body) {
      body.aboutParagraphs = DataTools.joinParagraphs(body.aboutParagraphs);
    }
    if ('heroTags' in body) { body.heroTags = DataTools.toTags(body.heroTags); }
    if ('keywords' in body) { body.keywords = DataTools.toTags(body.keywords); }
    return this.put('/api/profile', body).then(function () { return true; });
  },

  updateSkills(list) {
    return this.put('/api/skills', { skills: (list || []).map(function (s) {
      return {
        name: DataTools.str(s.name),
        value: DataTools.num(s.value),
        level: DataTools.str(s.level) || '在学',
        note: DataTools.str(s.note)
      };
    }) }).then(function () { return true; });
  },

  /* ---------------- 文章 ---------------- */
  getArticles(options) {
    const opt = options || {};
    const query = [];
    if (opt.category && opt.category !== '全部') {
      query.push('category=' + encodeURIComponent(opt.category));
    }
    if (opt.keyword) { query.push('keyword=' + encodeURIComponent(opt.keyword)); }
    if (opt.limit) { query.push('limit=' + encodeURIComponent(opt.limit)); }

    const url = '/api/articles' + (query.length ? '?' + query.join('&') : '');
    return this.get(url).then(function (rows) {
      return (rows || []).map(DbStore.article);
    });
  },

  /* 没有这篇时服务端回 404（接口语义是对的），但前端要的是「没有」而不是报错，
     所以这里收一下 —— 交给调用方的 if (!a) 处理，别抛到控制台去。 */
  getArticle(id) {
    return this.get('/api/articles/' + encodeURIComponent(id))
      .then(function (row) { return DbStore.article(row); })
      .catch(function () { return null; });
  },

  addArticle(article) {
    const body = Object.assign({}, article);
    body.content = DataTools.joinParagraphs(body.content);
    body.tags = DataTools.toTags(body.tags);
    if (!body.excerpt) {
      const ps = DataTools.toParagraphs(article.content);
      body.excerpt = ps.length ? ps[0].slice(0, 60) : '';
    }
    return this.post('/api/articles', body).then(function (row) { return DbStore.article(row); });
  },

  updateArticle(id, patch) {
    const body = Object.assign({}, patch);
    if ('content' in body) { body.content = DataTools.joinParagraphs(body.content); }
    if ('tags' in body) { body.tags = DataTools.toTags(body.tags); }
    return this.put('/api/articles/' + encodeURIComponent(id), body)
      .then(function () { return true; });
  },

  removeArticle(id) {
    return this.del('/api/articles/' + encodeURIComponent(id)).then(function () { return true; });
  },

  /* ---------------- 小诗 ---------------- */
  getPoems() {
    return this.get('/api/poems').then(function (rows) { return DbStore.poems(rows || []); });
  },

  addPoem(poem) {
    return this.post('/api/poems', {
      title: DataTools.str(poem.title) || '无题',
      date: DataTools.str(poem.date) || DataTools.today(),
      text: DataTools.str(poem.text)
    }).then(function (row) { return DbStore.poems([row])[0]; });
  },

  updatePoem(id, patch) {
    return this.put('/api/poems/' + encodeURIComponent(id), patch)
      .then(function () { return true; });
  },

  removePoem(id) {
    return this.del('/api/poems/' + encodeURIComponent(id)).then(function () { return true; });
  },

  /* ---------------- 音乐 ---------------- */
  getMusic() {
    return this.get('/api/music').then(function (rows) {
      return (rows || []).map(DbStore.track);
    });
  },

  addMusic(track) {
    return this.post('/api/music', track).then(function (row) { return DbStore.track(row); });
  },

  updateMusic(id, patch) {
    return this.put('/api/music/' + encodeURIComponent(id), patch)
      .then(function () { return true; });
  },

  removeMusic(id) {
    return this.del('/api/music/' + encodeURIComponent(id)).then(function () { return true; });
  },

  /* ---------------- 英语学习资料（管理员导入，存进 site.db） ---------------- */
  enRow(r) {
    let words = r.words;
    if (typeof words === 'string') {
      try { words = JSON.parse(words); } catch (e) { words = []; }
    }
    return {
      id: String(r.id),
      name: DataTools.str(r.name),
      date: DataTools.str(r.date),
      words: Array.isArray(words) ? words : [],
      owner: DataTools.str(r.owner),   /* 空 = 管理员共享（所有人可见）；有值 = 该网友的私人资料 */
      store: 'cloud'   /* 相对「本地 IndexedDB」而言的远端资料 */
    };
  },

  getEnMaterials() {
    return this.get('/api/en-materials').then(function (rows) {
      return (rows || []).map(DbStore.enRow);
    });
  },

  saveEnMaterial(mat) {
    return this.post('/api/en-materials', {
      id: mat.id, name: mat.name, date: mat.date || '',
      words: mat.words || [],
      owner: mat.owner || ''      /* 空 = 共享给所有人；邮箱 = 只有本人可见 */
    }).then(function () { return true; });
  },

  deleteEnMaterial(id) {
    return this.del('/api/en-materials/' + encodeURIComponent(String(id)))
      .then(function () { return true; });
  }
};


/* ==========================================================================
   四·五、云端模式 CloudStore
   --------------------------------------------------------------------------
   js/config.js 里填了 Supabase 配置时用这套：所有内容都存云端数据库。
   实现方式与 DbStore 平行，方法签名完全一致 —— 页面代码一行都不用改。

   读写规则（和 supabase.sql 的 RLS 一一对应）：
     · 读：带 apikey 即可（公开读）
     · 写：必须带 Authorization: Bearer <access_token>（登录后由 auth.js 存着）

   ⚠️ 全部走原生 fetch + Supabase REST，不引任何 SDK。
   ========================================================================== */
const CloudStore = {

  /* ---------------- 配置读取 ---------------- */
  cfg() {
    const c = (window.SHUOSCAPE_CONFIG && window.SHUOSCAPE_CONFIG.content) || {};
    return {
      url: String(c.supabaseUrl || '').replace(/\/+$/, ''),
      key: String(c.supabaseKey || ''),
      tables: {
        articles: String(c.tableArticles || 'articles'),
        poems: String(c.tablePoems || 'poems'),
        music: String(c.tableMusic || 'music'),
        profile: String(c.tableProfile || 'profile'),
        skills: String(c.tableSkills || 'skills'),
        studyProgress: String(c.tableStudyProgress || 'study_progress'),
        enMaterials: String(c.tableEnMaterials || 'en_materials')
      }
    };
  },

  hasCloud() {
    const c = this.cfg();
    return !!(c.url && c.key);
  },

  /* 一次 REST 请求：table 是上面的键名，path 是表名后的部分（含查询串）
     ⚠️ 写操作（非 GET）在这里统一设一道软闸：
       云端内容只有管理员能改 —— 普通注册用户 / 未登录直接在这里被人话拦下。
       真正的硬闸在 supabase.sql 的 RLS（is_shuo_admin 查 admins 表），
       这道闸只是让普通用户不用等到 403 才知道结果。 */
  req(table, path, opts) {
    const c = this.cfg();
    const o = opts || {};

    if ((o.method || 'GET') !== 'GET') {
      const isAdmin = !!(typeof Auth !== 'undefined' && Auth.isAdmin && Auth.isAdmin());
      const loggedIn = !!(typeof Auth !== 'undefined' && Auth.isLogin && Auth.isLogin());
      const myEmail = String(
        (typeof Auth !== 'undefined' && Auth.user && Auth.user.email) || ''
      ).trim().toLowerCase();

      /* 管理员什么都能写。除此之外，每个人还能写「属于自己的那一份」：
           userProgress  自己的练习进度（一人一行）
           enMaterials   学习资料 —— owner 空 = 管理员共享（只有管理员能动）；
                         owner 是自己邮箱 = 私人资料，本人随便改
         这两处放行都是安全的：真正的硬闸在 supabase.sql 的 RLS 里，
         就算前端被人改了，云端也只会让他动到自己的那一行。 */
      let allowed = isAdmin;
      if (!allowed && loggedIn && table === 'userProgress') { allowed = true; }
      if (!allowed && loggedIn && table === 'enMaterials') {
        if (o.method === 'POST') {
          /* 新建 / 更新：必须是「owner 写成自己邮箱」的私人资料 */
          allowed = !!myEmail &&
            String((o.body && o.body.owner) || '').trim().toLowerCase() === myEmail;
        } else {
          /* 删除：请求里带不上归属，交给 RLS 判（个人信息本人、公共信息管理员） */
          allowed = true;
        }
      }

      if (!allowed) {
        return Promise.reject(new Error('云端内容只有管理员能改 —— 注册用户可以留言、本地练习'));
      }
    }

    const headers = {
      apikey: c.key,
      Authorization: 'Bearer ' + c.key,
      'Content-Type': 'application/json'
    };
    /* 登录后换真实用户 token —— 云端靠它认出「是不是 admins 名单里的人」 */
    if (typeof Auth !== 'undefined' && Auth.token) {
      const t = Auth.token();
      if (t) { headers.Authorization = 'Bearer ' + t; }
    }
    if (o.headers) {
      Object.keys(o.headers).forEach(function (k) { headers[k] = o.headers[k]; });
    }

    /* ▍8 秒超时（很关键）
       云端连不上时（断网、域名被墙、Supabase 免费项目被暂停），
       浏览器会一直挂着等，页面就一直空白 —— 看着像「网站坏了」。
       掐断它，兜底的静态副本才能顶上来。 */
    const ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;

    return fetch(c.url + '/rest/v1/' + c.tables[table] + path, {
      method: o.method || 'GET',
      headers: headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.text().then(function (raw) {
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
        if (!res.ok) {
          const msg = (data && data.error && data.error.message) ? data.error.message
                    : (data && data.message) ? data.message
                    : ('云端 ' + res.status);
          throw new Error(msg);
        }
        return data;
      });
    }).catch(function (e) {
      /* 超时（AbortError）或连不上（TypeError）都算「云端这会儿够不着」，
         记下来，好让页脚提示说实话，而不是含糊地写「云端数据库」 */
      if (e && (e.name === 'AbortError' || e.name === 'TypeError')) {
        CloudStore._offline = true;
        /* 页脚徽章（js/main.js 的 DataMode）多半已经按「云端」渲染好了
           —— 探测请求挂满 8 秒超时的时候，徽章早就画完了。
           广播一声，让徽章当场改成「云端·副本」，别骗人 */
        document.dispatchEvent(new CustomEvent('cloud:offline'));
      }
      throw e;
    }).then(function (v) {
      if (timer) { clearTimeout(timer); }
      return v;
    }, function (e) {
      if (timer) { clearTimeout(timer); }
      throw e;
    });
  },

  /* ---------------- 归一化：与 DbStore 完全一致 ---------------- */
  article(row) { return DbStore.article(row); },
  poems(rows) { return DbStore.poems(rows || []); },
  track(m) { return DbStore.track(m); },

  /* 页面字段里有几个是算出来的（words / fromDb / draft），
     云端表没有这几列，写之前先剔掉，否则 PostgREST 会报「找不到列」。 */
  only(row, keys) {
    const out = {};
    keys.forEach(function (k) {
      if (row && Object.prototype.hasOwnProperty.call(row, k) && row[k] !== undefined) {
        out[k] = row[k];
      }
    });
    return out;
  },

  profile(row, skills) {
    const r = row || {};
    return {
      siteName: DataTools.str(r.siteName),
      siteEn: DataTools.str(r.siteEn),
      brandFirst: DataTools.str(r.brandFirst),
      brandSecond: DataTools.str(r.brandSecond),
      owner: DataTools.str(r.owner),
      slogan: DataTools.str(r.slogan),
      city: DataTools.str(r.city),
      email: DataTools.str(r.email),
      github: DataTools.str(r.github),
      blog: DataTools.str(r.blog),
      heroEyebrow: DataTools.str(r.heroEyebrow),
      heroDesc: DataTools.str(r.heroDesc),
      heroTags: DataTools.toTags(r.heroTags),
      intro: DataTools.str(r.intro),
      aboutParagraphs: DataTools.toParagraphs(r.aboutParagraphs),
      keywords: DataTools.toTags(r.keywords),
      skills: (skills || []).map(function (s) {
        return {
          name: DataTools.str(s.name),
          value: DataTools.num(s.value),
          level: DataTools.str(s.level) || '在学',
          note: DataTools.str(s.note)
        };
      })
    };
  },

  /* ---------------- 自我介绍 / 技能 ---------------- */
  getProfile() {
    const self = this;
    return this.req('profile', '?select=*&id=eq.1').then(function (rows) {
      const row = (Array.isArray(rows) && rows[0]) ? rows[0] : {};
      return self.req('skills', '?select=*&order=sort.asc').then(function (skillRows) {
        return self.profile(row, Array.isArray(skillRows) ? skillRows : []);
      });
    });
  },

  updateProfile(patch) {
    const body = this.only(patch, [
      'siteName', 'siteEn', 'brandFirst', 'brandSecond', 'owner', 'slogan',
      'city', 'email', 'github', 'blog', 'heroEyebrow', 'heroDesc', 'heroTags',
      'intro', 'aboutParagraphs', 'keywords'
    ]);
    if ('aboutParagraphs' in body) { body.aboutParagraphs = DataTools.joinParagraphs(body.aboutParagraphs); }
    if ('heroTags' in body) { body.heroTags = DataTools.toTags(body.heroTags); }
    if ('keywords' in body) { body.keywords = DataTools.toTags(body.keywords); }
    if (!Object.keys(body).length) { return Promise.resolve(true); }
    return this.req('profile', '?id=eq.1', { method: 'PATCH', body: body }).then(function () { return true; });
  },

  updateSkills(list) {
    const self = this;
    const rows = (list || []).map(function (s, i) {
      return {
        name: DataTools.str(s.name),
        value: DataTools.num(s.value),
        level: DataTools.str(s.level) || '在学',
        note: DataTools.str(s.note),
        sort: i
      };
    });
    /* 云端没有「覆盖整表」的接口：先清空再整批插入（数据量很小，可接受） */
    return this.req('skills', '?id=gt.0', { method: 'DELETE' }).then(function () {
      if (!rows.length) { return true; }
      return self.req('skills', '', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: rows
      }).then(function () { return true; });
    });
  },

  /* ---------------- 文章 ---------------- */
  getArticles(options) {
    const opt = options || {};
    return this.req('articles', '?select=*&order=date.desc')
      .then(function (rows) { return (rows || []).map(DbStore.article); })
      .then(function (list) {
        let out = list;
        if (opt.category && opt.category !== '全部') {
          out = out.filter(function (a) { return a.category === opt.category; });
        }
        if (opt.keyword) {
          const kw = String(opt.keyword).toLowerCase();
          out = out.filter(function (a) {
            const text = [a.title, a.excerpt, (a.tags || []).join(''), a.series || ''].join(' ');
            return text.toLowerCase().indexOf(kw) > -1;
          });
        }
        if (opt.limit) { out = out.slice(0, opt.limit); }
        return out;
      });
  },

  getArticle(id) {
    return this.req('articles', '?select=*&id=eq.' + encodeURIComponent(String(id)))
      .then(function (rows) {
        return (Array.isArray(rows) && rows[0]) ? DbStore.article(rows[0]) : null;
      });
  },

  addArticle(article) {
    const body = this.only(article, [
      'title', 'category', 'date', 'tags', 'series', 'cover', 'excerpt', 'content'
    ]);
    body.content = DataTools.joinParagraphs(body.content);
    body.tags = DataTools.toTags(body.tags);
    if (!body.excerpt) {
      const ps = DataTools.toParagraphs(article.content);
      body.excerpt = ps.length ? ps[0].slice(0, 60) : '';
    }
    if (!body.date) { body.date = DataTools.today(); }
    return this.req('articles', '', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: body
    }).then(function (rows) { return DbStore.article((Array.isArray(rows) && rows[0]) || rows); });
  },

  updateArticle(id, patch) {
    const body = this.only(patch, [
      'title', 'category', 'date', 'tags', 'series', 'cover', 'excerpt', 'content'
    ]);
    if ('content' in body) { body.content = DataTools.joinParagraphs(body.content); }
    if ('tags' in body) { body.tags = DataTools.toTags(body.tags); }
    if (!Object.keys(body).length) { return Promise.resolve(true); }
    return this.req('articles', '?id=eq.' + encodeURIComponent(String(id)), { method: 'PATCH', body: body })
      .then(function () { return true; });
  },

  removeArticle(id) {
    return this.req('articles', '?id=eq.' + encodeURIComponent(String(id)), { method: 'DELETE' })
      .then(function () { return true; });
  },

  /* ---------------- 小诗 ---------------- */
  getPoems() {
    return this.req('poems', '?select=*&order=date.desc')
      .then(function (rows) { return DbStore.poems(rows || []); });
  },

  addPoem(poem) {
    return this.req('poems', '', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: {
        title: DataTools.str(poem.title) || '无题',
        date: DataTools.str(poem.date) || DataTools.today(),
        text: DataTools.str(poem.text)
      }
    }).then(function (rows) {
      return DbStore.poems([(Array.isArray(rows) && rows[0]) || rows])[0];
    });
  },

  updatePoem(id, patch) {
    const body = this.only(patch, ['title', 'date', 'text']);
    if (!Object.keys(body).length) { return Promise.resolve(true); }
    return this.req('poems', '?id=eq.' + encodeURIComponent(String(id)), { method: 'PATCH', body: body })
      .then(function () { return true; });
  },

  removePoem(id) {
    return this.req('poems', '?id=eq.' + encodeURIComponent(String(id)), { method: 'DELETE' })
      .then(function () { return true; });
  },

  /* ---------------- 音乐 ---------------- */
  getMusic() {
    return this.req('music', '?select=*&order=sort.asc').then(function (rows) {
      return (rows || []).map(DbStore.track);
    });
  },

  addMusic(track) {
    const body = this.only(track, ['name', 'artist', 'note', 'duration', 'genre', 'src', 'url']);
    /* 云端 music 表按 sort 排序；没传就排到最后 */
    const self = this;
    return this.req('music', '?select=sort&order=sort.desc&limit=1').then(function (rows) {
      const last = (Array.isArray(rows) && rows[0] && Number(rows[0].sort)) || 0;
      body.sort = last + 1;
      return self.req('music', '', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: body
      }).then(function (saved) { return DbStore.track((Array.isArray(saved) && saved[0]) || saved); });
    });
  },

  updateMusic(id, patch) {
    const body = this.only(patch, ['name', 'artist', 'note', 'duration', 'genre', 'src', 'url', 'sort']);
    if (!Object.keys(body).length) { return Promise.resolve(true); }
    return this.req('music', '?id=eq.' + encodeURIComponent(String(id)), { method: 'PATCH', body: body })
      .then(function () { return true; });
  },

  removeMusic(id) {
    return this.req('music', '?id=eq.' + encodeURIComponent(String(id)), { method: 'DELETE' })
      .then(function () { return true; });
  },

  /* ---------------- 学习打卡进度（云端，指令 07） ----------------
     整份进度当一个 JSON 字符串存一行，读出来原样还给页面。 */
  getStudyProgress() {
    return this.req('studyProgress', '?select=data&id=eq.1').then(function (rows) {
      const row = (Array.isArray(rows) && rows[0]) ? rows[0] : null;
      let saved = { c: {}, en: {} };
      try { saved = JSON.parse(row && row.data) || saved; } catch (e) { /* 坏数据当没有 */ }
      if (!saved || typeof saved !== 'object') { saved = { c: {}, en: {} }; }
      if (!saved.c) { saved.c = {}; }
      if (!saved.en) { saved.en = {}; }
      return saved;
    }).catch(function () { return { c: {}, en: {} }; });
  },

  setStudyProgress(next) {
    const self = this;
    const data = JSON.stringify(next || { c: {}, en: {} });
    return this.req('studyProgress', '?select=id&id=eq.1').then(function (rows) {
      if (Array.isArray(rows) && rows.length) {
        return self.req('studyProgress', '?id=eq.1', { method: 'PATCH', body: { data: data } });
      }
      return self.req('studyProgress', '', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: { id: 1, key: 'owner', data: data }
      });
    }).then(function () { return true; });
  },

  /* ---------------- 英语学习资料（管理员导入，全站共享） ----------------
     words 直接存 jsonb，读出来就是数组，不用再 parse。
     写权限走 req() 里那道管理员软闸 + RLS 的 is_shuo_admin()。 */
  getEnMaterials() {
    return this.req('enMaterials', '?select=*&order=date.desc').then(function (rows) {
      return (rows || []).map(function (r) {
        return {
          id: String(r.id),
          name: DataTools.str(r.name),
          date: DataTools.str(r.date),
          words: Array.isArray(r.words) ? r.words : [],
          owner: DataTools.str(r.owner),   /* 空 = 管理员共享；邮箱 = 私人 */
          store: 'cloud'
        };
      });
    });
  },

  saveEnMaterial(mat) {
    return this.req('enMaterials', '?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: {
        id: mat.id,
        name: mat.name,
        date: mat.date || '',
        words: mat.words || [],
        owner: mat.owner || '',            /* 空 = 所有人可见；邮箱 = 只有本人可见 */
        updatedAt: new Date().toISOString()
      }
    }).then(function () { return true; });
  },

  deleteEnMaterial(id) {
    return this.req('enMaterials', '?id=eq.' + encodeURIComponent(String(id)), { method: 'DELETE' })
      .then(function () { return true; });
  }
};


/* ==========================================================================
   五、转发员 SiteAPI
   --------------------------------------------------------------------------
   页面只认识它。它先判断「现在能连上后端吗」，再把请求转给对应的那套。

   所有方法都返回 Promise —— 和以后 fetch 的用法一样，
   所以页面里写的 .then(...) 在两种模式下都成立。
   ========================================================================== */
const SiteAPI = {

  /* 'cloud' / 'db' / 'local'，检测完之后才准。想读它请用 whenReady() */
  mode: 'local',

  _ready: null,

  /* 检测一次，之后所有调用共用同一个结果。
     判断依据（按优先级）：
       ① js/config.js 填了 Supabase 配置 → 'cloud'
       ② 现在是 http/https 打开、且后端有回应 /api/health → 'db'
       ③ 都不满足 → 'local' */
  whenReady() {
    if (this._ready) { return this._ready; }

    const self = this;

    /* ★ 顺序很重要：本机后端 → 云端 → 浏览器
       ------------------------------------------------------------------
       以前是「填了 Supabase 配置就无条件走云端」，结果本机开着 server.js
       也被拽去走云端：一旦网络不通（或免费项目被暂停），本机连内容都改不了。
       现在改成先问本机后端在不在 ——
         · 本机跑 server.js  → 走数据库，能正常增删改，断网也没事
         · GitHub Pages      → 没有 server.js，探不到后端 → 走云端
         · 双击 html（file://）→ 走浏览器本地存储
       这样两边各得其所，不会互相拖累。 */

    /* ⚠️ 这里不要直接写 location.protocol ——
       db/seed.js 会在 Node 里把整个 data.js 跑一遍（为了读 SITE_DATA），
       而 Node 里没有 location、也没有 fetch。
       所以先判断「这两个东西在不在」，不在就当本地模式。
       （少了这个判断，跑 seed.js 会直接报 location is not defined。） */
    const proto = (typeof location !== 'undefined' && location.protocol) ? location.protocol : '';
    const canFetch = (typeof fetch === 'function');

    const cloudCfg = (typeof window !== 'undefined' && window.SHUOSCAPE_CONFIG)
      ? (window.SHUOSCAPE_CONFIG.content || {}) : {};
    const hasCloud = !!(cloudCfg.supabaseUrl && cloudCfg.supabaseKey) && canFetch;

    /* ① 先探本机后端（http/https 打开时才有可能有） */
    if ((proto === 'http:' || proto === 'https:') && canFetch) {
      /* 加个 3 秒超时：万一后端没响应，页面也不能一直卡着不显示 */
      const timeout = new Promise(function (resolve) {
        setTimeout(function () { resolve(null); }, 3000);
      });

      const probe = fetch('/api/health', { cache: 'no-store' })
        .then(function (res) { return res.ok ? res.json() : null; })
        .catch(function () { return null; });

      this._ready = Promise.race([probe, timeout]).then(function (info) {
        if (info && info.ok) {
          self.mode = 'db';
          console.log('[SiteAPI] 已连接本机数据库', info.database, info.counts);
        } else if (hasCloud) {
          self.mode = 'cloud';
          console.log('[SiteAPI] 没有本机后端，已连接云端数据库', cloudCfg.supabaseUrl);
        } else {
          self.mode = 'local';
          console.log('[SiteAPI] 没检测到后端，使用本地模式（数据存在浏览器里）');
        }
        return self.mode;
      });

      return this._ready;
    }

    /* ② 双击打开的 html、或 Node 里跑脚本：没有本机后端，有云端就走云端 */
    if (hasCloud) {
      this.mode = 'cloud';
      this._ready = Promise.resolve('cloud');
      console.log('[SiteAPI] 已连接云端数据库', cloudCfg.supabaseUrl);
      return this._ready;
    }

    this.mode = 'local';
    this._ready = Promise.resolve('local');
    return this._ready;
  },

  /* 现在是数据库模式吗？（要在 whenReady 之后才是准的） */
  isDb() { return this.mode === 'db'; },

  /* 现在是云端模式吗？（js/config.js 里填了 Supabase 配置） */
  isCloud() { return this.mode === 'cloud'; },

  /* 内容存在「远端」吗？—— 云端和数据库都算。
     页面上有几处文案要区分「删掉是真的没了」还是「本地只是隐藏」，
     判断的其实是这个，不是「是不是数据库」。 */
  isRemote() { return this.mode === 'cloud' || this.mode === 'db'; },

  /* 给页面提示语用的一句中文：现在改动会写到哪 */
  storeLabel() {
    if (this.mode === 'cloud') {
      /* _offline = 连不上（断网/被墙/项目暂停）；_usingCopy = 连上了但表里没数据 */
      return (CloudStore._offline || this._usingCopy)
        ? '云端数据库（暂时显示静态副本）' : '云端数据库';
    }
    if (this.mode === 'db') { return '数据库 <code>db/site.db</code>'; }
    return '浏览器';
  },

  /* 挑一套实现：云端 → CloudStore，数据库 → DbStore，都没有 → LocalStore */
  _impl() {
    if (this.mode === 'cloud') { return CloudStore; }
    return this.mode === 'db' ? DbStore : LocalStore;
  },

  /* ------------------------------------------------------------------
     云端「读」的兜底名单
     ------------------------------------------------------------------
     什么情况会用到？
       · 刚接上云端、数据还没导进去（表是空的）
       · Supabase 免费项目超过一周没人访问会被自动暂停，接口就不响应了
       · 网络一时不通
     这几种情况下不能让整站变空白，所以退回仓库里 js/data.js 的那份
     静态副本 —— 内容可能旧一点，但至少看得见。
     只兜「读」：写操作失败必须如实报错，不能假装成功。
     ------------------------------------------------------------------ */
  CLOUD_READS: { getProfile: 1, getArticles: 1, getPoems: 1, getMusic: 1 },

  /* 云端这次读到的是「空的」吗？（空就算没读到，触发兜底） */
  _isEmpty(res) {
    if (Array.isArray(res)) { return res.length === 0; }
    if (res && typeof res === 'object') {
      /* profile：连主人名字和技能都没有，说明云端那张表是空的 */
      return !res.owner && !res.siteName && !(res.skills || []).length;
    }
    return !res;
  },

  /* 用静态副本顶上。失败就彻底失败，不再二次兜底 */
  _fromLocal(method, args) {
    return LocalStore[method].apply(LocalStore, args);
  },

  /* 页面调用统一走这里：先等检测完成，再转给对应实现 */
  _run(method, args) {
    const self = this;
    return this.whenReady().then(function () {
      const impl = self._impl();
      const p = impl[method].apply(impl, args);

      /* 只有云端模式的「读」才需要兜底，写操作原样返回 */
      if (self.mode !== 'cloud' || !self.CLOUD_READS[method]) { return p; }

      return p.then(function (res) {
        if (self._isEmpty(res)) {
          self._usingCopy = true;
          console.warn('[SiteAPI] 云端没读到「' + method + '」的内容，先显示仓库里的静态副本');
          return self._fromLocal(method, args);
        }
        self._usingCopy = false;
        return res;
      }).catch(function (err) {
        self._usingCopy = true;
        console.warn('[SiteAPI] 云端读取失败（' + ((err && err.message) || err) +
                     '），改用仓库里的静态副本');
        return self._fromLocal(method, args);
      });
    });
  },

  /* ---------------- 自我介绍 / 技能 ---------------- */
  getProfile() { return this._run('getProfile', []); },
  updateProfile(patch) { return this._run('updateProfile', [patch]); },
  updateSkills(list) { return this._run('updateSkills', [list]); },

  /* ---------------- 文章 ---------------- */
  getArticles(options) { return this._run('getArticles', [options]); },
  getArticle(id) { return this._run('getArticle', [id]); },
  addArticle(article) { return this._run('addArticle', [article]); },
  updateArticle(id, patch) { return this._run('updateArticle', [id, patch]); },
  removeArticle(id) { return this._run('removeArticle', [id]); },

  /* 「恢复默认」只在本地模式有意义：
     数据库 / 云端里的每一条都是真实数据，没有「恢复成代码里那份」这回事。

     ⚠ 注意判断时机：必须等 whenReady() 之后（模式探测完成）才能看 mode。
     这里吃过亏 —— 早期版本在探测完成前就判断 `this.mode !== 'db'`，
     而 mode 的初始值是 'local'，数据库模式下这个条件会先成立、
     进入 _run() 之后才切到 'db'，结果调到了 DbStore 上不存在的方法，
     页面一打开就报 `Cannot read properties of undefined (reading 'apply')`。 */
  restoreArticles() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud() || self.isDb()) { return Promise.resolve(true); }
      return self._run('restoreArticles', []);
    });
  },

  getArticleMarks() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud() || self.isDb()) { return { hidden: 0, edited: 0 }; }
      return self._run('articleMarks', []);
    });
  },

  /* 随机拼一篇「草稿」，用于文章页的随机生成按钮。
     这个纯粹是造着玩，不涉及数据来源，所以两种模式共用。 */
  randomArticle() {
    const cats = ['随笔', '心绪', '成长', '际遇', '风景', '猫日常'];
    const subjects = ['便利店', '凌晨四点', '没寄出的信', '最后一班公交', '旧房间', '海边的收音机', '冬天的第一场雨', '天台的猫'];
    const actions = ['亮着灯', '慢慢变淡', '没有人经过', '只剩下回声', '刚好停了雨', '被风吹开了门'];
    const moods = ['我忽然觉得这样也挺好。', '有些话还是留在心里比较好。', '原来告别是很安静的一件事。', '但至少这一刻是真的。', '我不知道下一次会是什么时候。'];
    const pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

    const subject = pick(subjects);
    return {
      id: 'r' + Date.now(),
      title: pick(['关于', '写在', '想起', '路过']) + subject,
      category: pick(cats),
      date: DataTools.today(),
      words: 0,
      tags: ['随机草稿'],
      series: '',
      cover: '',
      excerpt: subject + pick(actions) + '，' + pick(moods),
      content: [subject + pick(actions) + '。', pick(moods)],
      draft: true
    };
  },

  /* ---------------- 小诗 ---------------- */
  getPoems() { return this._run('getPoems', []); },
  addPoem(poem) { return this._run('addPoem', [poem]); },
  updatePoem(id, patch) { return this._run('updatePoem', [id, patch]); },
  removePoem(id) { return this._run('removePoem', [id]); },

  restorePoems() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud() || self.isDb()) { return Promise.resolve(true); }
      return self._run('restorePoems', []);
    });
  },

  getPoemMarks() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud() || self.isDb()) { return { hidden: 0, edited: 0 }; }
      return self._run('poemMarks', []);
    });
  },

  /* ---------------- 音乐 ---------------- */
  getMusic() { return this._run('getMusic', []); },
  addMusic(track) { return this._run('addMusic', [track]); },
  updateMusic(id, patch) { return this._run('updateMusic', [id, patch]); },
  removeMusic(id) { return this._run('removeMusic', [id]); },

  /* ---------------- 分类 ----------------
     分类是一个很小的固定清单，不放进数据库。
     （真要从数据库来，就再加一个接口，返回 SELECT DISTINCT category） */
  getCategories() {
    return Promise.resolve(SITE_DATA.categories.slice());
  },

  /* 栏目表是写死在代码里的配置（不是用户数据），两种模式共用同一份。 */
  getColumns() {
    return Promise.resolve(SITE_DATA.columns.map(function (c) {
      return { name: c.name, tag: c.tag, desc: c.desc, cat: c.cat || '', page: c.page || '' };
    }));
  },

  /* ------------------------------------------------------------------------
     学习页的数据
     ------------------------------------------------------------------------
     内容（知识点清单、单词、句子）写在 data.js 的 study 里 —— 是配置，不是用户数据，
     所以两种模式共用一份，也不进数据库。

     「这条我学会了 / 这个词我记住了」这种打卡记录不一样：
     它属于你个人的进度：
       · 云端模式 → 存云端 study_progress 表，换设备/换浏览器都在
       · db / local 模式 → 存在浏览器里（localStorage），不占数据库，
         换台电脑会从零开始（题库和课程是共享的，进度是你自己的） */
  getStudy() {
    const s = SITE_DATA.study || { c: { groups: [] }, en: { words: [], sentences: [] } };
    const groups = (s.c && s.c.groups) || [];
    const words = (s.en && s.en.words) || [];
    const sentences = (s.en && s.en.sentences) || [];

    /* 把分组摊平成一条一条，方便页面直接遍历 */
    const cItems = [];
    groups.forEach(function (g) {
      (g.items || []).forEach(function (it) {
        cItems.push({ id: it.id, name: it.name, note: it.note, group: g.name });
      });
    });

    return Promise.resolve({
      c: { intro: (s.c && s.c.intro) || '', groups: groups, items: cItems, total: cItems.length, stats: (s.c && s.c.stats) || {} },
      en: {
        intro: (s.en && s.en.intro) || '',
        words: words,
        sentences: sentences,
        total: words.length,
        /* 只是个显示用的数字，首页 / 学习页要显示「N 条笔记」又不想加载
           119KB 的 js/notes-data.js，所以在这里透传出去 */
        noteCount: (s.en && s.en.noteCount) || 0
      }
    });
  },

  /* 打卡记录：{ c: { 'c1-1': true, … }, en: { 'e3': true, … } }
     ------------------------------------------------------------------------
     两种存法：
       · 云端模式 → 存云端 study_progress 表（换设备/换浏览器都在）
       · db / local 模式 → 存浏览器 localStorage（和改造前完全一致）
     页面只认这两个方法，模式切换对页面透明。 */
  getStudyProgress() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud()) { return self._run('getStudyProgress', []); }
      return SiteAPI.localProgress('read', null);
    });
  },

  setStudyProgress(next) {
    const self = this;
    return this.whenReady().then(function () {
      if (self.isCloud()) { return self._run('setStudyProgress', [next]); }
      return SiteAPI.localProgress('write', next);
    });
  },

  /* localStorage 版的打卡进度（db / local 模式共用） */
  localProgress(action, next) {
    if (action === 'write') {
      try {
        localStorage.setItem('shuoscape_study_progress', JSON.stringify(next || { c: {}, en: {} }));
      } catch (e) { /* 存不了就算了，不影响看 */ }
      return Promise.resolve(true);
    }
    let saved = { c: {}, en: {} };
    try {
      saved = JSON.parse(localStorage.getItem('shuoscape_study_progress') || '') || saved;
    } catch (e) { /* 存的是坏数据就当没有 */ }
    if (!saved || typeof saved !== 'object') { saved = { c: {}, en: {} }; }
    if (!saved.c) { saved.c = {}; }
    if (!saved.en) { saved.en = {}; }
    return Promise.resolve(saved);
  },

  /* ------------------------------------------------------------------
     英语学习资料（管理员导入的共享资料）
     ------------------------------------------------------------------
     · 云端 / db 模式 → 存 en_materials 表（换设备也在，人人可练）
     · 本地模式 → 没有共享这回事，返回空（资料只在自己浏览器里）
     页面（js/english.js）拿到的统一是 [{id,name,date,words,store}]，
     本地资料由 EnStore 自己管理（IndexedDB），两边在页面上合并展示。 */
  getEnMaterials() {
    const self = this;
    return this.whenReady().then(function () {
      if (self.mode === 'local') { return []; }
      return self._run('getEnMaterials', []);
    }).catch(function () { return []; });
  },

  saveEnMaterial(mat) {
    const self = this;
    return this.whenReady().then(function () {
      if (self.mode === 'local') { return false; }
      return self._run('saveEnMaterial', [mat]);
    });
  },

  deleteEnMaterial(id) {
    const self = this;
    return this.whenReady().then(function () {
      if (self.mode === 'local') { return false; }
      return self._run('deleteEnMaterial', [id]);
    });
  }
};

/* 挂到 window 上，保证别的文件一定能访问到 */
window.SiteAPI = SiteAPI;
window.DataTools = DataTools;

/* 一加载就开始探测，等页面脚本要用的时候通常已经好了 */
SiteAPI.whenReady();
