/* ==========================================================================
   config.js —— 站点配置（全站唯一一个「需要你填点东西」的地方）
   --------------------------------------------------------------------------
   这里只管一件事：**留言存到哪儿**。

   ▍不填（现在是这个状态）
     留言按老样子存：
       · 在自己电脑上跑 server.js 时 → 存进站点数据库（db/site.db）
       · 直接双击 html、或传到 GitHub Pages 上 → 只留在各自浏览器里
     也就是说：不填的话，别人在你的 GitHub Pages 上写的留言，你看不到。

   ▍填了下面两项（推荐）
     留言进云端数据库 —— 谁打开你的网站看到的都是同一批留言，
     传到 GitHub Pages 之后也一样。自己这边发的留言，别人也能看到。

     怎么拿这两项（免费，大概两分钟）：
       1. 打开 supabase.com，用 GitHub 账号登录（免费）
       2. New project → 名字随便起，地区选 Singapore / Tokyo
       3. 建好后点左下角 Settings → API
          · Project URL      → 填到 supabaseUrl
          · anon public key  → 填到 supabaseKey（很长一串，整条复制）
       4. 左边 SQL Editor → 把项目里的 supabase.sql 整段粘进去 → Run
       5. 保存这个文件，刷新网页，留言框下面会写「留言存在云端」

     这两项是「公开钥匙」，本来就会出现在网页源码里，不怕被人看到；
     真正拦住别人乱来的是 supabase.sql 里那条访问规则。
   ========================================================================== */

window.SHUOSCAPE_CONFIG = {
  comments: {
    /* ↓↓↓ 把引号里换成你自己的，两个都填才生效 ↓↓↓ */
    supabaseUrl: '',      /* 例：'https://abcdefgh.supabase.co' */
    supabaseKey: '',      /* 例：'eyJhbGciOi...（很长一串）' */
    table: 'comments'     /* 表名，supabase.sql 里建的就是这个，一般不用改 */
  }
};
