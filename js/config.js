/* ==========================================================================
   config.js —— 站点配置（全站唯一一个「需要你填点东西」的地方）
   --------------------------------------------------------------------------
   两类云端配置，填了才走云端，没填就退回本机（db / local）：

     ▍content（推荐填 —— 内容上云）
       文章、小诗、唱片、自我介绍、技能都存到 Supabase 云端数据库。
       填上之后：
         · GitHub Pages 上访客看到的是云端数据（不是仓库里的旧副本）
         · 你登录（Supabase Auth，邮箱+密码）后改内容，所有人刷新可见

     ▍comments（推荐填 —— 留言上云）
       留言进云端数据库，谁打开网站都看到同一批留言。

   怎么拿这两份配置（免费，约三分钟）：
       1. 打开 supabase.com，用 GitHub 账号登录
       2. New project → 名字随便起，地区选 Singapore / Tokyo
       3. 左下角 Settings → API
          · Project URL      → 填到两个 supabaseUrl
          · anon public key  → 填到两个 supabaseKey
       4. SQL Editor → 把 supabase.sql 整段粘进去 → Run
       5. 保存本文件，刷新网页

   这两个 key 是「公开钥匙」，本来就出现在网页源码里，不怕被人看到；
   真正拦住别人乱来的是 supabase.sql 里那些 RLS 策略。
   ========================================================================== */

window.SHUOSCAPE_CONFIG = {

  /* ▍管理员名单（小写邮箱，一个一个引号隔开）
       名单里的账号在云端登录后就是「管理员」：能增删改文章、小诗、唱片、学习资料；
       名单以外的注册用户是「普通用户」：能登录、能留言，改不了云端内容。
       ★ 这个名单只管「按钮显不显示」；数据库那边真正拦人的是 supabase.sql
         里的 admins 表 —— 记得两边填同一批邮箱（见 supabase.sql 第 8 节）。 */
  adminEmails: [
    '2625407261@qq.com'
  ],

  content: {
    supabaseUrl: 'https://jtxccwjeyiqfqhzuruup.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGNjd2pleWlxZnFoenVydXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2ODgzMDIsImV4cCI6MjEwNzI2NDMwMn0.vMUxSezsDi8xCsD4R8KM6_KjoUWZ8m-AQbG57vEiHuQ',

    /* 表名，supabase.sql 里建的就是这些，一般不用改 */
    tableArticles: 'articles',
    tablePoems: 'poems',
    tableMusic: 'music',
    tableProfile: 'profile',
    tableSkills: 'skills',
    tableStudyProgress: 'study_progress',
    tableEnMaterials: 'en_materials'
  },

  comments: {
    supabaseUrl: 'https://jtxccwjeyiqfqhzuruup.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0eGNjd2pleWlxZnFoenVydXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE2ODgzMDIsImV4cCI6MjEwNzI2NDMwMn0.vMUxSezsDi8xCsD4R8KM6_KjoUWZ8m-AQbG57vEiHuQ',
    table: 'comments'     /* 表名，supabase.sql 里建的就是这个，一般不用改 */
  }
};
