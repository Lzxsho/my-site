/* ==========================================================================
   config.js —— 站点配置
   --------------------------------------------------------------------------
   ▍现在是纯静态站点：所有内容都在 data/*.json 里，不需要填任何云端配置。
     改内容 = 改那几个 JSON 文件，push 之后所有人刷新就看到新版。

   ▍以后要接云端（CloudBase / 任何后端）
       1. 把下边的 cloudbaseEnv 填上你的环境 ID
       2. 改 js/api.js 里的 _load()（那一处标了「以后接 CloudBase 只改这里」）
       3. 页面一行都不用动

       页面里引入 SDK：
       <script src="https://imgcache.qq.com/qcloud/cloudbase-js-sdk/2.6.0/cloudbase.full.js"></script>

   ▍dataBase
       JSON 文件的位置。默认 'data/'（相对路径，GitHub Pages 放在子目录
       也不会错）。一般不改。

   ▍localDb
       默认 false —— 网站只读 data/*.json，不发任何后端请求。
       你自己电脑上跑着 server.js、又想把改动写回 db/site.db 时，
       把它改成 true（只在 localhost 生效，线上永远是静态模式）。

   ▍Supabase 那套已经拆掉了：从国内连经常 ERR_CONNECTION_RESET，
     会把页面拖成白屏。云端的事以后统一交给 js/api.js。
   ========================================================================== */

window.SHUOSCAPE_CONFIG = {

  /* ▍管理员名单（小写邮箱，一个一个引号隔开）
       纯静态版里管理员身份走本机账号（db/admin.secret，双击 start.bat 时用）；
       等接了云端登录，名单里的邮箱登录后就是管理员。 */
  adminEmails: [
    '2625407261@qq.com'
  ],

  /* ▍数据文件位置（一般不用改） */
  dataBase: 'data/',

  /* ▍要不要连本机数据库 server.js（默认 false = 纯静态，不发任何请求） */
  localDb: false,

  /* ▍CloudBase 环境 ID —— 以后接云端时填这里（现在是空的，不会发任何请求） */
  cloudbaseEnv: ''
};
