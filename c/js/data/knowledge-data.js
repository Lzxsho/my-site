/* ==========================================================================
   knowledge-data.js —— 知识点内容数据（第 1 ~ 5 章）
   --------------------------------------------------------------------------
   ★ 这是你以后主要编辑的文件之一，只要粘贴/修改文字，页面会自动排版。
   ★ 第 6 ~ 10 章的内容在 knowledge-data-2.js 里。

   ─────────────────────────────────────────────────────────────────────
   【数据结构说明】
   window.KNOWLEDGE_DATA = [
     {
       id: 'ch01',            // 章节唯一标识（侧边目录锚点，一般不要改）
       no: '第1章',            // 章节编号
       title: 'C语言概述',      // 章节名称
       desc: '本章导读…',        // 章节开头的一句话说明
       sections: [
         {
           id: 'ch01-s1',
           title: '1.1 小节标题',
           content: String.raw` 这里写 HTML 正文 `,   // 正文
           codes: [ { title:'代码说明', code: String.raw` 你的C代码 ` } ]
         }
       ]
     }
   ]

   ─────────────────────────────────────────────────────────────────────
   【正文里可用的 HTML 写法】
     <p>段落</p>
     <ul class="key-list"><li>要点</li></ul>           重点列表（小圆点）
     <strong>加粗</strong> / <code>行内代码</code>
     <div class="tip">普通提示</div>
     <div class="tip tip-warn">易错点</div>           黄色警告框
     <div class="tip tip-ok">结论/口诀</div>          绿色结论框
     <div class="tip tip-note">补充说明</div>          灰色说明框
     <table><thead><tr><th>表头</th></tr></thead><tbody><tr><td>内容</td></tr></tbody></table>
     <h4>小标题</h4>

   ─────────────────────────────────────────────────────────────────────
   【代码块注意】全部用 String.raw`…` 包裹，C 代码里的 \n \t \0 可以原样粘贴。
   ========================================================================== */

window.KNOWLEDGE_DATA = [

  /* ======================================================================
     第 1 章　C语言概述
     ====================================================================== */
  {
    id: 'ch01',
    no: '第1章',
    title: 'C语言概述',
    desc: '了解程序与程序设计语言的基本概念、C语言的特点、C程序的基本结构，以及从源程序到可执行文件的完整过程。本章是整门课的地基，考点集中在“程序结构、标识符规则、运行步骤”。',
    sections: [
      {
        id: 'ch01-s1',
        title: '1.1 程序与程序设计语言',
        content: String.raw`
          <h4>1. 基本概念</h4>
          <ul class="key-list">
            <li><strong>程序</strong>：为使计算机完成某项任务而编制的一组指令的有序集合。</li>
            <li><strong>程序设计</strong>：从确定任务到编写出正确程序的全过程，包括问题分析、算法设计、编写代码、调试运行。</li>
            <li><strong>程序设计语言</strong>：人与计算机交流的工具。发展经历了 机器语言 → 汇编语言 → 高级语言。</li>
            <li><strong>机器语言</strong>：由二进制指令构成，计算机能直接执行，但难学难记，不通用。</li>
            <li><strong>汇编语言</strong>：用符号代替二进制指令，需要汇编程序翻译，仍是面向机器的语言。</li>
            <li><strong>高级语言</strong>：接近自然语言与数学表达，与具体机器无关，需要编译程序翻译成机器指令。</li>
          </ul>

          <h4>2. C语言的主要特点</h4>
          <ul class="key-list">
            <li>语言简洁、紧凑，使用方便、灵活（只有 30 多个关键字）。</li>
            <li>运算符丰富（34 个运算符），数据类型丰富。</li>
            <li>具有结构化的控制语句（顺序、选择、循环），是典型的结构化程序设计语言。</li>
            <li>是<strong>面向过程</strong>的语言，以函数为基本单位，适合模块化设计。</li>
            <li>既有高级语言的优点，又有低级语言的功能（可直接操作内存地址、位运算）。</li>
            <li>生成的目标代码质量高，可移植性好。</li>
          </ul>

          <div class="tip tip-ok">口诀记忆：<strong>简洁紧凑、运算符多、结构化、面向过程、能操作内存、可移植</strong>。选择题常问“下列不属于C语言特点的是”，把“面向对象”当成错误项来选。</div>
        `,
        codes: []
      },
      {
        id: 'ch01-s2',
        title: '1.2 C程序的基本结构与main函数',
        content: String.raw`
          <h4>1. C程序的组成</h4>
          <ul class="key-list">
            <li>C程序由<strong>函数</strong>组成，函数是C程序的基本单位。</li>
            <li>一个C程序<strong>有且只有一个</strong> <code>main</code> 函数（主函数）。</li>
            <li>程序总是从 <code>main</code> 函数开始执行，也在 <code>main</code> 函数中结束；其他函数只能被调用。</li>
            <li><code>main</code> 可以放在程序中的任意位置，放在最前面、最后面都不影响执行顺序。</li>
            <li>C语言的每条语句必须以<strong>分号</strong>结束，分号是语句的组成部分。</li>
            <li>一个C程序由一个或多个<strong>源程序文件</strong>（.c）组成，编译后通过连接装配成一个可执行程序。</li>
          </ul>

          <h4>2. 关于注释</h4>
          <ul class="key-list">
            <li>单行注释：<code>// 注释内容</code>（C99 起支持，谭浩强教材中常用）。</li>
            <li>多行注释：<code>/* 注释内容 */</code>，注意<strong>不能嵌套</strong>。</li>
            <li>注释在编译时被忽略，不参与程序运行，也不占用运行时间。</li>
          </ul>

          <div class="tip tip-warn">易错点：<code>/* ... */</code> 不能嵌套使用。写成 <code>/* 外层 /* 内层 */ 外层 */</code> 时，注释在第一个 <code>*/</code> 处就已经结束了，剩下的 <code>外层 */</code> 会被当成代码，编译报错。</div>

          <h4>3. 头文件</h4>
          <p><code>#include &lt;stdio.h&gt;</code> 是预处理指令，不是C语句，因此<strong>行末不加分号</strong>。它以尖括号括起来的文件由系统目录查找。</p>
        `,
        codes: [
          {
            title: '最简单的C程序（记住这个框架）',
            code: String.raw`#include <stdio.h>          /* 预处理指令：包含标准输入输出头文件 */

int main(void)              /* 主函数：程序唯一的入口，返回类型 int */
{                           /* 函数体开始 */
    printf("Hello World!\n");   /* 输出一行文字 */

    return 0;               /* 返回 0 表示程序正常结束，可与系统交互判断 */
}                           /* 函数体结束 */`
          }
        ]
      },
      {
        id: 'ch01-s3',
        title: '1.3 标识符与关键字',
        content: String.raw`
          <h4>1. 标识符（给变量、函数等起的名字）</h4>
          <ul class="key-list">
            <li>只能由<strong>字母、数字、下划线</strong>组成，且<strong>不能以数字开头</strong>。</li>
            <li>严格区分大小写：<code>Sum</code> 与 <code>sum</code> 是两个不同的标识符。</li>
            <li>不能使用C语言的<strong>关键字</strong>（如 int、if、for、return 等）。</li>
            <li>长度一般受编译器限制，通常识别前 31 或 63 个字符。</li>
            <li>合法示例：<code>_sum</code>、<code>a1</code>、<code>Student_name</code>；非法示例：<code>1a</code>（数字开头）、<code>a-b</code>（含减号）、<code>int</code>（关键字）、<code>my name</code>（含空格）。</li>
          </ul>

          <h4>2. 关键字（32个，必须小写）</h4>
          <table>
            <thead><tr><th>类别</th><th>关键字</th></tr></thead>
            <tbody>
              <tr><td>数据类型</td><td>char, int, short, long, float, double, void, signed, unsigned, enum, struct, union</td></tr>
              <tr><td>存储类别</td><td>auto, static, extern, register</td></tr>
              <tr><td>控制语句</td><td>if, else, switch, case, default, for, while, do, break, continue, goto, return</td></tr>
              <tr><td>其它</td><td>const, sizeof, typedef, volatile</td></tr>
            </tbody>
          </table>

          <div class="tip tip-warn">易错点：<code>main</code>、<code>printf</code>、<code>scanf</code>、<code>define</code> <strong>都不是</strong>关键字，它们分别是主函数名、库函数名、库函数名和预处理指令。考试常把 <code>main</code> 混在关键字选项里让你判断。</div>
        `,
        codes: [
          {
            title: '大小写敏感演示',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int Sum = 10, sum = 20;    /* 两个不同的变量，互不影响 */

    printf("%d %d\n", Sum, sum);   /* 输出：10 20 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch01-s4',
        title: '1.4 运行C程序的步骤与方法',
        content: String.raw`
          <h4>1. 四个基本步骤</h4>
          <ul class="key-list">
            <li><strong>编辑</strong>：在编辑器中录入源程序，生成源文件 <code>xxx.c</code>。</li>
            <li><strong>编译</strong>：编译程序把源程序翻译成<strong>目标文件</strong> <code>xxx.obj</code>（机器指令），同时检查语法错误。</li>
            <li><strong>连接</strong>：连接程序把目标文件与库函数等连接装配成<strong>可执行文件</strong> <code>xxx.exe</code>。</li>
            <li><strong>运行</strong>：执行可执行文件，得到运行结果。</li>
          </ul>

          <h4>2. 常见文件扩展名</h4>
          <table>
            <thead><tr><th>扩展名</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td>.c</td><td>C语言源程序文件</td></tr>
              <tr><td>.h</td><td>头文件（header）</td></tr>
              <tr><td>.obj</td><td>编译产生的目标文件</td></tr>
              <tr><td>.exe</td><td>连接后生成的可执行文件</td></tr>
            </tbody>
          </table>

          <div class="tip">记忆技巧：<strong>“编、译、连、行，源到目到可执行”</strong>。选择题常考：源程序不能被计算机直接执行；.obj 是编译的产物，.exe 是连接的产物。</div>
        `,
        codes: []
      }
    ]
  },

  /* ======================================================================
     第 2 章　数据类型与运算符
     ====================================================================== */
  {
    id: 'ch02',
    no: '第2章',
    title: '数据类型与运算符',
    desc: '掌握C语言的基本数据类型（整型、实型、字符型）、常量与变量的表示，以及算术、赋值、自增自减、逗号、强制类型转换等运算符的使用规则。本章是填空、选择题的高频考点。',
    sections: [
      {
        id: 'ch02-s1',
        title: '2.1 常量与变量',
        content: String.raw`
          <h4>1. 常量</h4>
          <ul class="key-list">
            <li><strong>整型常量</strong>：十进制 <code>123</code>、八进制 <code>0123</code>（以 0 开头）、十六进制 <code>0x1A</code>（以 0x 开头）。</li>
            <li><strong>实型常量</strong>：十进制小数 <code>3.14</code>、指数形式 <code>1.5e3</code>（表示 1500.0）。</li>
            <li><strong>字符常量</strong>：单引号括起来的单个字符 <code>'A'</code>，占 1 字节，存的是 ASCII 码。</li>
            <li><strong>字符串常量</strong>：双引号括起来的一串字符 <code>"A"</code>，末尾自动加 <code>'\0'</code>，所以 <code>"A"</code> 占 2 字节。</li>
            <li><strong>符号常量</strong>：用 <code>#define</code> 定义，如 <code>#define PI 3.14159</code>，是一个“替换”操作，不加分号。</li>
          </ul>

          <div class="tip tip-warn">易错点：<code>'A'</code> 占 1 字节、值为 65；<code>"A"</code> 占 2 字节（含 <code>'\0'</code>）。<code>2</code> 与 <code>2.0</code> 在内存中的存储形式完全不同，前者是整数、后者是浮点数。</div>

          <h4>2. 变量</h4>
          <ul class="key-list">
            <li>变量必须先<strong>定义</strong>后使用，定义的作用是：确定变量名、分配存储单元、规定数据类型。</li>
            <li>变量名代表一个存储单元，变量的值可以改变。</li>
            <li>变量定义的一般形式：<code>类型名 变量名表;</code>，如 <code>int a, b, c;</code>。</li>
            <li>变量在定义时可以赋初值（初始化），如 <code>int a = 5;</code>；未初始化的局部变量是<strong>随机值</strong>。</li>
            <li>定义时可以连续赋值 <code>int a, b, c = 5;</code>，此时只有 c 被赋值。</li>
          </ul>
        `,
        codes: [
          {
            title: '常量与变量的基本使用',
            code: String.raw`#include <stdio.h>
#define PI 3.14159          /* 符号常量，注意行末没有分号 */

int main(void)
{
    int a = 10;             /* 整型变量 */
    float r = 2.0f;         /* 实型变量 */
    char ch = 'A';          /* 字符变量 */

    printf("a = %d\n", a);
    printf("ch = %c, ASCII = %d\n", ch, ch);   /* 字符以两种方式输出 */
    printf("面积 = %.2f\n", PI * r * r);        /* %.2f 保留两位小数 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch02-s2',
        title: '2.2 整型数据',
        content: String.raw`
          <h4>1. 整型分类与取值范围（32位机常见）</h4>
          <table>
            <thead><tr><th>类型</th><th>字节数</th><th>取值范围</th></tr></thead>
            <tbody>
              <tr><td>short int</td><td>2</td><td>-32768 ~ 32767</td></tr>
              <tr><td>int</td><td>4</td><td>-2147483648 ~ 2147483647</td></tr>
              <tr><td>long int</td><td>4</td><td>同 int</td></tr>
              <tr><td>unsigned int</td><td>4</td><td>0 ~ 4294967295</td></tr>
              <tr><td>unsigned char</td><td>1</td><td>0 ~ 255</td></tr>
            </tbody>
          </table>

          <h4>2. 关键结论</h4>
          <ul class="key-list">
            <li><code>unsigned</code> 表示无符号数，把最高位也当作数值位使用，因此正数范围扩大一倍，但<strong>不能表示负数</strong>。</li>
            <li>整型数据溢出时按“模 2^n”处理：如 <code>short int x = 32767; x = x + 1;</code> 之后 x 变成 <strong>-32768</strong>。</li>
            <li>输出无符号数用 <code>%u</code>，输出八进制用 <code>%o</code>，输出十六进制用 <code>%x</code>。</li>
            <li>在整数后面加后缀：<code>L</code> 表示长整型，<code>U</code> 表示无符号，如 <code>123L</code>、<code>45U</code>。</li>
          </ul>
        `,
        codes: [
          {
            title: '溢出与不同进制输出',
            code: String.raw`#include <stdio.h>

int main(void)
{
    short int x = 32767;
    int a = 100;

    x = x + 1;                       /* 超出 short 表示范围，发生"溢出" */

    printf("x = %d\n", x);           /* 输出 -32768 */
    printf("八进制 = %o\n", a);       /* 输出 144 */
    printf("十六进制 = %x\n", a);     /* 输出 64 */
    printf("无符号 = %u\n", a);       /* 输出 100 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch02-s3',
        title: '2.3 实型数据与字符型数据',
        content: String.raw`
          <h4>1. 实型（浮点型）</h4>
          <table>
            <thead><tr><th>类型</th><th>字节数</th><th>有效数字</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>float</td><td>4</td><td>6 ~ 7 位</td><td>单精度，常量可加后缀 f</td></tr>
              <tr><td>double</td><td>8</td><td>15 ~ 16 位</td><td>双精度，精度更高</td></tr>
            </tbody>
          </table>
          <ul class="key-list">
            <li>实型数据一般都作 <strong>double</strong> 处理；要强调 float 需加后缀 <code>f</code>。</li>
            <li>float 型变量赋值时，如果数字有效位过多会<strong>损失精度</strong>。</li>
            <li>实型常量<strong>不能</strong>用 <code>%d</code> 输出，整型也不能用 <code>%f</code> 输出，格式符必须与类型匹配。</li>
            <li>指数形式规定：字母 e 前面必须有数字，e 后面必须为整数，如 <code>1e3</code> 合法、<code>e3</code> 和 <code>1e3.5</code> 非法。</li>
          </ul>

          <h4>2. 字符型数据</h4>
          <ul class="key-list">
            <li>字符型变量占 1 字节，存放字符的 <strong>ASCII 码</strong>，因此字符与整数之间可以互相运算。</li>
            <li>常用 ASCII 码：<code>'0'=48</code>、<code>'A'=65</code>、<code>'a'=97</code>、空格 = 32、<code>'\n'=10</code>。</li>
            <li>大小写字母转换：大写 = 小写 - 32，小写 = 大写 + 32。</li>
            <li>转义字符：<code>'\n'</code> 换行、<code>'\t'</code> 制表、<code>'\\'</code> 反斜杠、<code>'\''</code> 单引号、<code>'\0'</code> 空字符（值为 0，字符串结束标志）。</li>
          </ul>

          <div class="tip tip-ok">高频结论：字符 <code>'0'</code> 的 ASCII 码是 48，<strong>不是 0</strong>；<code>'a' - 'A' = 32</code>；<code>'A' + 25</code> 得到 <code>'Z'</code>。</div>
        `,
        codes: [
          {
            title: '字符与 ASCII 码的相互运算',
            code: String.raw`#include <stdio.h>

int main(void)
{
    char ch = 'a';

    printf("%c 的 ASCII 码是 %d\n", ch, ch);        /* a 的 ASCII 码是 97 */
    printf("对应大写字母是 %c\n", ch - 32);          /* 输出 A */
    printf("字符'0'的ASCII码是 %d\n", '0');          /* 48，注意不是 0 */

    double d = 3.14159265358979;
    float  f = 3.14159265358979f;
    printf("double = %.14f\n", d);                  /* 精度更高 */
    printf("float  = %.14f\n", (double)f);          /* 精度损失 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch02-s4',
        title: '2.4 运算符与表达式',
        content: String.raw`
          <h4>1. 算术运算符与表达式</h4>
          <ul class="key-list">
            <li><code>+  -  *  /  %</code>，其中 <code>%</code> 是求余，要求两边都是<strong>整数</strong>。</li>
            <li>两个整数相除，结果仍为整数（<strong>向零取整</strong>）：<code>5 / 2 = 2</code>、<code>-5 / 2 = -2</code>。</li>
            <li>只要有一个操作数为实数，就进行实数运算：<code>5 / 2.0 = 2.5</code>。</li>
            <li>求余运算结果的符号与被除数相同：<code>-5 % 3 = -2</code>。</li>
          </ul>

          <h4>2. 自增、自减运算符</h4>
          <ul class="key-list">
            <li><code>++i</code>（前置）：先自加，再使用；<code>i++</code>（后置）：先使用，再自加。</li>
            <li>只能用于<strong>变量</strong>，不能用于常量或表达式，如 <code>5++</code>、<code>(a+b)++</code> 都是错误的。</li>
            <li>结合方向：自右向左。如 <code>-i++</code> 等价于 <code>-(i++)</code>。</li>
          </ul>

          <h4>3. 赋值运算符与复合赋值</h4>
          <ul class="key-list">
            <li>简单赋值 <code>=</code>，结合方向自右向左：<code>a = b = c = 5;</code> 等价于 <code>a = (b = (c = 5));</code>。</li>
            <li>复合赋值：<code>+=  -=  *=  /=  %=</code>，如 <code>a += 3</code> 等价于 <code>a = a + 3</code>。</li>
            <li>赋值表达式的值就是被赋的值，所以 <code>if (a = 5)</code> 恒为真，这里应是 <code>==</code>，属于典型错误。</li>
          </ul>

          <h4>4. 逗号运算符与 sizeof</h4>
          <ul class="key-list">
            <li>逗号表达式的值等于<strong>最后一个表达式</strong>的值：<code>(a = 3, b = 5, a + b)</code> 的值为 8。</li>
            <li><code>sizeof</code> 是运算符不是函数，用于求数据类型或变量所占字节数，如 <code>sizeof(int)</code> 为 4。</li>
          </ul>

          <h4>5. 运算符优先级（由高到低，节选）</h4>
          <table>
            <thead><tr><th>优先级</th><th>运算符</th></tr></thead>
            <tbody>
              <tr><td>1（最高）</td><td>()  []  ->  .</td></tr>
              <tr><td>2</td><td>!  ~  ++  --  +（正）  -（负）  (类型)  *  &amp;  sizeof</td></tr>
              <tr><td>3</td><td>*  /  %</td></tr>
              <tr><td>4</td><td>+  -</td></tr>
              <tr><td>5</td><td>&lt;=  &gt;=  &lt;  &gt;</td></tr>
              <tr><td>6</td><td>==  !=</td></tr>
              <tr><td>7</td><td>&amp;&amp;</td></tr>
              <tr><td>8</td><td>||</td></tr>
              <tr><td>9</td><td>?:</td></tr>
              <tr><td>10</td><td>=  +=  -=  *=  /=  %=</td></tr>
              <tr><td>11（最低）</td><td>,</td></tr>
            </tbody>
          </table>
        `,
        codes: [
          {
            title: '自增自减的经典考点',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i = 5, a, b;

    a = i++;        /* 先取 i 的值 5 赋给 a，然后 i 变成 6 */
    b = ++i;        /* i 先变成 7，再把 7 赋给 b */

    printf("a = %d, b = %d, i = %d\n", a, b, i);   /* a = 5, b = 7, i = 7 */

    /* 整数除法与求余 */
    printf("5/2 = %d, 5%%2 = %d\n", 5 / 2, 5 % 2);  /* 2, 1 */

    /* 逗号表达式 */
    int c = (1, 2, 3);
    printf("c = %d\n", c);                          /* 3，取最后一个 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch02-s5',
        title: '2.5 类型转换',
        content: String.raw`
          <h4>1. 自动类型转换（隐式转换）</h4>
          <ul class="key-list">
            <li>不同类型数据运算时，先转换成同一类型再运算，转换方向是“<strong>由低到高</strong>”：
              <code>char/short → int → unsigned → long → double</code>。</li>
            <li>赋值时的转换：把高精度赋给低精度会<strong>丢失数据</strong>。如 <code>int a = 3.9;</code> 后 a 等于 <strong>3</strong>（直接截去小数，不四舍五入）。</li>
          </ul>

          <h4>2. 强制类型转换</h4>
          <p>形式：<code>(类型名)(表达式)</code>，例如 <code>(int)3.9</code> 的值为 3，<code>(double)5 / 2</code> 的值为 2.5。</p>

          <div class="tip tip-warn">易错点：<code>1 / 2 * 3.0</code> 的结果是 <strong>0.0</strong>，因为 <code>1 / 2</code> 先按整数运算得到 0，再与 3.0 转换。若写成 <code>1.0 / 2 * 3</code> 结果才是 1.5。整数除法是各种语言的“坑”，务必注意。</div>

          <div class="tip tip-ok">格式符速记：<code>%d</code> 整型、<code>%f</code> 实型、<code>%c</code> 字符、<code>%s</code> 字符串、<code>%u</code> 无符号、<code>%o</code> 八进制、<code>%x</code> 十六进制、<code>%ld</code> 长整型、<code>%lf</code> double（printf 中 %f 也可）。</div>
        `,
        codes: [
          {
            title: '类型转换演示',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a = 3.9;              /* 截去小数部分，a = 3 */
    double b = 1 / 2 * 3.0;   /* 1/2 = 0，结果 0.0 */
    double c = 1.0 / 2 * 3;   /* 0.5 * 3 = 1.5 */

    printf("a = %d\n", a);
    printf("b = %f\n", b);
    printf("c = %f\n", c);
    printf("(int)3.9 = %d\n", (int)3.9);   /* 3，也不是四舍五入 */

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 3 章　顺序程序设计
     ====================================================================== */
  {
    id: 'ch03',
    no: '第3章',
    title: '顺序程序设计',
    desc: '顺序结构是最基本的程序结构：程序自上而下依次执行。本章重点是 C 语句的分类、赋值语句，以及数据的格式化输入输出（printf、scanf）和字符输入输出。',
    sections: [
      {
        id: 'ch03-s1',
        title: '3.1 C语句的分类与赋值语句',
        content: String.raw`
          <h4>1. C语句分为五类</h4>
          <ul class="key-list">
            <li><strong>控制语句</strong>：if-else、for、while、do-while、switch、break、continue、goto、return（9 种）。</li>
            <li><strong>函数调用语句</strong>：如 <code>printf("...");</code>。</li>
            <li><strong>表达式语句</strong>：由表达式加一个分号组成，如 <code>a = b + c;</code>。</li>
            <li><strong>空语句</strong>：只有一个分号 <code>;</code>，什么也不做。</li>
            <li><strong>复合语句</strong>：用 <code>{ }</code> 把多条语句括起来，又称分程序。</li>
          </ul>

          <h4>2. 赋值语句</h4>
          <ul class="key-list">
            <li>一般形式：<code>变量 = 表达式;</code>，作用是先把表达式的值算出来，再赋给变量。</li>
            <li>赋值运算符左侧必须是可以被赋值的对象（变量），不能是常量或表达式。</li>
            <li>区分“赋值”与“赋初值”：<code>int a = 5;</code> 是初始化，作用只在定义时一次。</li>
          </ul>

          <div class="tip tip-note">注意：<code>#include &lt;stdio.h&gt;</code>、<code>#define PI 3.14</code> 都是<strong>预处理指令</strong>，不是 C 语句，因此行末<strong>不加分号</strong>。</div>
        `,
        codes: []
      },
      {
        id: 'ch03-s2',
        title: '3.2 格式化输出函数 printf',
        content: String.raw`
          <h4>1. 格式符</h4>
          <table>
            <thead><tr><th>格式符</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td>%d / %i</td><td>十进制有符号整数</td></tr>
              <tr><td>%u</td><td>无符号整数</td></tr>
              <tr><td>%o / %x</td><td>八进制 / 十六进制（无符号）</td></tr>
              <tr><td>%f</td><td>实数（默认保留 6 位小数）</td></tr>
              <tr><td>%c / %s</td><td>字符 / 字符串</td></tr>
              <tr><td>%e</td><td>指数形式输出实数</td></tr>
              <tr><td>%%</td><td>输出一个百分号</td></tr>
            </tbody>
          </table>

          <h4>2. 宽度和精度（附加格式说明符）</h4>
          <ul class="key-list">
            <li><code>%5d</code>：输出宽度为 5，右对齐，左边补空格。</li>
            <li><code>%-5d</code>：宽度 5，<strong>左对齐</strong>。</li>
            <li><code>%8.2f</code>：总宽度 8 位，其中小数占 2 位。</li>
            <li><code>%.3f</code>：不指定总宽度，只保留 3 位小数（会四舍五入）。</li>
            <li><code>%05d</code>：不足 5 位时左边补 <strong>0</strong>。</li>
            <li>数据实际宽度大于指定宽度时，按实际输出，不受限制。</li>
          </ul>
        `,
        codes: [
          {
            title: 'printf 宽度与精度控制',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int   n = 42;
    float x = 3.14159f;

    printf("|%d|\n",    n);         /* |42| */
    printf("|%5d|\n",   n);         /* |   42| 右对齐补空格 */
    printf("|%-5d|\n",  n);         /* |42   | 左对齐 */
    printf("|%05d|\n",  n);         /* |00042| 补零 */
    printf("|%.2f|\n",  x);         /* |3.14| 四舍五入 */
    printf("|%8.3f|\n", x);         /* |   3.142| */
    printf("百分号：100%%\n");        /* 输出一个 % */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch03-s3',
        title: '3.3 格式化输入函数 scanf',
        content: String.raw`
          <h4>1. 一般形式</h4>
          <p><code>scanf(格式控制字符串, 地址表列);</code>，其中地址表列必须是<strong>变量的地址</strong>，普通变量前要加取地址符 <code>&amp;</code>。</p>

          <h4>2. 使用要点</h4>
          <ul class="key-list">
            <li>除数组名本身代表地址外，其他变量都要加 <code>&amp;</code>，如 <code>scanf("%d", &amp;a);</code>。</li>
            <li>双精度型输入必须用 <code>%lf</code>，float 用 <code>%f</code>；这是 C99 前后的差异，考试常考。</li>
            <li>格式串中一般不要加 <code>\n</code>，否则需要多输入一个数据才能结束。</li>
            <li>可以用宽度限制输入位数：<code>scanf("%3d", &amp;a)</code> 只读 3 位数字。</li>
            <li>输入多个数据时，可用空格、回车、Tab 分隔；若格式串中是普通字符，则必须原样输入。</li>
            <li>scanf 的返回值是成功输入的<strong>数据个数</strong>，可以用来判断输入是否成功。</li>
          </ul>

          <div class="tip tip-warn">易错点：输入字符串时如果包含空格，用 <code>scanf("%s")</code> 会在空格处停止读取，应改用 <code>gets / fgets</code>。另外 <code>scanf("%d", a)</code> 少了 <code>&amp;</code> 是常见错误，编译可能通过但运行会崩。</div>
        `,
        codes: [
          {
            title: 'scanf 的正确写法',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int   a;
    float f;
    double d;
    int   n;

    printf("请输入一个整数：");
    n = scanf("%d", &a);              /* 别忘了取地址符 & */
    printf("成功读入 %d 个数据，a = %d\n", n, a);

    printf("请输入一个 float 和一个 double：");
    scanf("%f %lf", &f, &d);          /* float 用 %f，double 必须用 %lf */

    printf("f = %.2f, d = %.4f\n", f, d);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch03-s4',
        title: '3.4 字符数据的输入输出',
        content: String.raw`
          <h4>1. putchar 与 getchar</h4>
          <ul class="key-list">
            <li><code>putchar(字符)</code>：向终端输出一个字符，参数可以是字符常量、变量或 ASCII 码值。</li>
            <li><code>getchar()</code>：从终端读入<strong>一个</strong>字符，且不需要参数，函数值就是读到的字符。</li>
            <li>getchar 会把空格、回车也当成字符读入。</li>
            <li>使用这两个函数同样需要 <code>#include &lt;stdio.h&gt;</code>。</li>
          </ul>

          <div class="tip tip-note">常见考点：<code>while ((c = getchar()) != '\n')</code> 用来读入一整行；连续调用 getchar 时，第一个 getchar 读完后，缓冲区里残留的换行符会被下一次 getchar 读走，这是很多题目的“隐藏坑”。</div>
        `,
        codes: [
          {
            title: '字符输入输出与大小写转换',
            code: String.raw`#include <stdio.h>

int main(void)
{
    char c1, c2;

    c1 = getchar();                 /* 读入一个字符 */
    c2 = c1 - 32;                   /* 小写转大写 */
    putchar(c1);                    /* 输出原字符 */
    putchar('\n');
    putchar(c2);                    /* 输出转换后的字符 */
    putchar('\n');

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch03-s5',
        title: '3.5 顺序结构综合举例与易错点',
        content: String.raw`
          <h4>1. 编程思路</h4>
          <ul class="key-list">
            <li>顺序结构解题三步：① 定义变量确定数据类型；② 输入数据；③ 计算并输出结果。</li>
            <li>涉及除法时，注意整数除法的“向零取整”问题，必要时写成 <code>1.0 * a / b</code> 或强制转换。</li>
            <li>输出小数要用 <code>%.2f</code> 之类的格式控制小数位数。</li>
          </ul>

          <h4>2. 本章高频易错点汇总</h4>
          <table>
            <thead><tr><th>易错点</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>少了取地址符</td><td><code>scanf("%d", a)</code> 应为 <code>scanf("%d", &amp;a)</code></td></tr>
              <tr><td>格式符不匹配</td><td>int 用 %d、float 用 %f、double 输入用 %lf、char 用 %c</td></tr>
              <tr><td>整数除法</td><td><code>5/2</code> 得 2 而不是 2.5</td></tr>
              <tr><td>忘记分号</td><td>每条 C 语句以分号结束，但预处理指令不加分号</td></tr>
              <tr><td>printf 中缺少输出项</td><td>格式串里有 %d 就必须有对应变量</td></tr>
            </tbody>
          </table>
        `,
        codes: [
          {
            title: '综合举例：求圆的周长与面积',
            code: String.raw`#include <stdio.h>
#define PI 3.14159

int main(void)
{
    double r, c, s;

    printf("请输入半径：");
    scanf("%lf", &r);

    c = 2 * PI * r;         /* 周长 */
    s = PI * r * r;         /* 面积 */

    printf("周长 = %.2f\n", c);
    printf("面积 = %.2f\n", s);

    return 0;
}`
          },
          {
            title: '综合举例：三位整数各位数字之和',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int n, a, b, c, sum;

    printf("请输入一个三位整数：");
    scanf("%d", &n);

    a = n / 100;            /* 百位：整数除法丢小数 */
    b = n / 10 % 10;        /* 十位 */
    c = n % 10;             /* 个位 */

    sum = a + b + c;
    printf("%d + %d + %d = %d\n", a, b, c, sum);

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 4 章　选择结构
     ====================================================================== */
  {
    id: 'ch04',
    no: '第4章',
    title: '选择结构',
    desc: '掌握关系运算与逻辑运算，熟练使用 if 语句的三种形式及其嵌套、条件运算符和三目运算，以及 switch 多分支语句。本章是程序阅读题的主要来源之一。',
    sections: [
      {
        id: 'ch04-s1',
        title: '4.1 关系运算符与关系表达式',
        content: String.raw`
          <h4>1. 六种关系运算符</h4>
          <p><code>&lt;   &lt;=   &gt;   &gt;=   ==   !=</code>，前四个优先级高于后两个。</p>

          <h4>2. 关系表达式的值</h4>
          <ul class="key-list">
            <li>关系表达式的值只有两个：<strong>真为 1，假为 0</strong>。</li>
            <li>关系运算符的优先级低于算术运算符：<code>a + b &gt; c</code> 等价于 <code>(a + b) &gt; c</code>。</li>
            <li>判断两个浮点数是否相等要用误差范围，如 <code>fabs(a - b) &lt; 1e-6</code>。</li>
          </ul>

          <div class="tip tip-warn">最容易错的点：<code>==</code> 是关系运算符，<code>=</code> 是赋值运算符。<code>if (a = 5)</code> 永远为真，编译器只给警告不报错。另外 <code>a &gt;= b</code> 不能写成 <code>a =&gt; b</code>。</div>
        `,
        codes: [
          {
            title: '关系表达式的值',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a = 3, b = 5;

    printf("a > b  -> %d\n", a > b);        /* 0，假 */
    printf("a < b  -> %d\n", a < b);        /* 1，真 */
    printf("a == b -> %d\n", a == b);       /* 0 */
    printf("a != b -> %d\n", a != b);       /* 1 */
    printf("3 > 2 > 1 -> %d\n", 3 > 2 > 1); /* 1，因为 (3>2)=1, 1>1=0 —— 注意！ */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch04-s2',
        title: '4.2 逻辑运算符与逻辑表达式',
        content: String.raw`
          <h4>1. 三种逻辑运算符</h4>
          <table>
            <thead><tr><th>运算符</th><th>名称</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>&amp;&amp;</td><td>逻辑与</td><td>两边都为真才为真</td></tr>
              <tr><td>||</td><td>逻辑或</td><td>有一个为真就为真</td></tr>
              <tr><td>!</td><td>逻辑非</td><td>真变假，假变真</td></tr>
            </tbody>
          </table>

          <h4>2. 关键性质</h4>
          <ul class="key-list">
            <li>参与逻辑运算的量，<strong>非 0 即真</strong>，0 为假；结果真为 1，假为 0。</li>
            <li>优先级：<code>!</code> &gt; 算术运算 &gt; 关系运算 &gt; <code>&amp;&amp;</code> &gt; <code>||</code> &gt; 赋值。</li>
            <li><strong>短路求值</strong>：<code>a &amp;&amp; b</code> 中若 a 为假，则 b 不再计算；<code>a || b</code> 中若 a 为真，则 b 不再计算。这是程序阅读题最爱考的点。</li>
            <li>表示“x 在 0 到 100 之间”必须写成 <code>x &gt;= 0 &amp;&amp; x &lt;= 100</code>，<strong>不能</strong>写成 <code>0 &lt;= x &lt;= 100</code>。</li>
            <li>对 <code>0 &lt;= x &lt;= 100</code>：先算 <code>0 &lt;= x</code> 得 0 或 1，再与 100 比较，结果恒为真。</li>
          </ul>
        `,
        codes: [
          {
            title: '短路求值（重点考点）',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a = 1, b = 2, c = 3, d = 4;
    int m = 1, n = 1;

    (m = a > b) && (n = c > d);      /* 左边 m = 0 为假，右边不再计算 */

    printf("m = %d, n = %d\n", m, n);  /* m = 0, n = 1（n 没被改变） */

    int x = 0, y = 0;
    (x = 5) || (y = 8);               /* 左边为真，右边短路 */
    printf("x = %d, y = %d\n", x, y);  /* x = 5, y = 0 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch04-s3',
        title: '4.3 if 语句的三种形式',
        content: String.raw`
          <h4>1. 三种基本形式</h4>
          <ul class="key-list">
            <li><strong>单分支</strong>：<code>if (表达式) 语句;</code></li>
            <li><strong>双分支</strong>：<code>if (表达式) 语句1; else 语句2;</code></li>
            <li><strong>多分支</strong>：<code>if (表达式1) 语句1; else if (表达式2) 语句2; … else 语句n;</code></li>
          </ul>

          <h4>2. 使用要点</h4>
          <ul class="key-list">
            <li>if 后面的表达式可以是任意类型，只要其值非 0 就执行；<code>if (x)</code> 与 <code>if (x != 0)</code> 等价。</li>
            <li>if 和 else 后面若有多条语句，必须用 <code>{ }</code> 括成复合语句。</li>
            <li>多分支结构从上到下依次判断，一旦某个条件成立就执行对应语句，后面的条件<strong>不再判断</strong>。</li>
            <li>else 不能单独使用，必须与 if 配对。</li>
          </ul>
        `,
        codes: [
          {
            title: 'if 多分支：判断成绩等级',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int score;

    printf("请输入成绩：");
    scanf("%d", &score);

    if (score < 0 || score > 100)
        printf("输入有误\n");
    else if (score >= 90)
        printf("优秀\n");
    else if (score >= 80)
        printf("良好\n");
    else if (score >= 60)
        printf("及格\n");
    else
        printf("不及格\n");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch04-s4',
        title: '4.4 if 语句的嵌套与 else 配对',
        content: String.raw`
          <h4>1. else 的配对原则</h4>
          <p>else 总是与<strong>它上面最靠近的、尚未配对的 if</strong> 配对（就近配对），与书写缩进无关。</p>

          <div class="tip tip-warn">典型题目：<code>if (a&gt;b) if (b&gt;c) x=1; else x=2;</code> 中的 else 属于内层 <code>if (b&gt;c)</code>。要让它属于外层，必须加花括号：<code>if (a&gt;b) { if (b&gt;c) x=1; } else x=2;</code>。</div>

          <h4>2. 书写建议</h4>
          <ul class="key-list">
            <li>嵌套层次不宜超过 3 层，否则逻辑混乱、可读性差。</li>
            <li>内层 if 也用花括号包围，虽然只有一条语句，但能避免配对歧义。</li>
          </ul>
        `,
        codes: [
          {
            title: '嵌套 if 判断三个数中的最大值',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a, b, c, max;

    printf("请输入三个整数：");
    scanf("%d%d%d", &a, &b, &c);

    if (a > b) {
        if (a > c)
            max = a;
        else
            max = c;
    } else {
        if (b > c)
            max = b;
        else
            max = c;
    }

    printf("最大值是 %d\n", max);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch04-s5',
        title: '4.5 条件运算符与条件表达式',
        content: String.raw`
          <h4>1. 形式</h4>
          <p><code>表达式1 ? 表达式2 : 表达式3</code>，它也是 C 语言中<strong>唯一的三目运算符</strong>。</p>

          <h4>2. 运算规则</h4>
          <ul class="key-list">
            <li>先求表达式1，若为真则取表达式2的值，否则取表达式3的值。</li>
            <li>结合方向自右向左：<code>a ? b : c ? d : e</code> 等价于 <code>a ? b : (c ? d : e)</code>。</li>
            <li>优先级低于关系运算符和算术运算符，但高于赋值运算符。所以 <code>max = a &gt; b ? a : b;</code> 是正确的。</li>
            <li>典型应用：求两数最大值 <code>max = (a &gt; b) ? a : b;</code>；求绝对值和判断奇偶也很常用。</li>
          </ul>
        `,
        codes: [
          {
            title: '条件运算符的常见用法',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a = 8, b = 15;

    printf("较大值 = %d\n", a > b ? a : b);

    /* 求绝对值 */
    int x = -7;
    printf("|x| = %d\n", x > 0 ? x : -x);

    /* 判断奇偶 */
    printf("%d 是%s\n", a, a % 2 == 0 ? "偶数" : "奇数");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch04-s6',
        title: '4.6 switch 语句与多分支选择',
        content: String.raw`
          <h4>1. 一般形式</h4>
          <pre><code>switch (表达式)
{
    case 常量表达式1: 语句1; break;
    case 常量表达式2: 语句2; break;
    ...
    default: 语句n;
}</code></pre>

          <h4>2. 使用要点（高频考点）</h4>
          <ul class="key-list">
            <li>switch 后面括号内表达式的值必须是<strong>整型或字符型</strong>，不能是实型（float/double）。</li>
            <li>case 后面必须是<strong>常量表达式</strong>，且各 case 的值必须互不相同，不能写变量或范围。</li>
            <li><strong>break 的作用是跳出 switch 结构</strong>；若省略 break，会继续执行下面 case 的语句（称为“穿透”），这是程序阅读题最重要的考点。</li>
            <li>default 可以省略，位置可以任意，一般放在最后；它只在所有 case 都不匹配时执行。</li>
            <li>switch 只能对“等值判断”进行分支，不能代替 if 处理范围判断。</li>
          </ul>

          <div class="tip tip-ok">穿透技巧：多个 case 共用一段代码时不写 break，如 <code>case 1: case 2: case 3: printf("第一季度"); break;</code> 是合法且常见的写法。</div>
        `,
        codes: [
          {
            title: 'switch 穿透示例（必考）',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int score = 85;
    int grade;

    /* 用整数除法把分数转换成 5 个等级 */
    grade = score / 10;

    switch (grade)
    {
        case 10:
        case 9:
            printf("优秀\n");
            break;              /* 没有 break 会继续往下执行 */
        case 8:
            printf("良好\n");
            break;
        case 7:
        case 6:
            printf("及格\n");
            break;
        default:
            printf("不及格\n");
    }

    return 0;
}`
          },
          {
            title: '省略 break 时的输出（程序阅读题）',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int x = 2;

    switch (x)
    {
        case 1: printf("A");
        case 2: printf("B");     /* 从这里开始，后面全部执行 */
        case 3: printf("C");
        default: printf("D");
    }
    printf("\n");

    return 0;
}
/* 输出：BCD  —— 因为没有 break，会一直"穿透"到最后 */`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 5 章　循环结构
     ====================================================================== */
  {
    id: 'ch05',
    no: '第5章',
    title: '循环结构',
    desc: '掌握 while、do…while、for 三种循环语句的格式与执行流程，理解循环嵌套、break 与 continue 的区别。本章是程序阅读题、编程题的核心章节。',
    sections: [
      {
        id: 'ch05-s1',
        title: '5.1 while 语句',
        content: String.raw`
          <h4>1. 格式</h4>
          <pre><code>while (表达式)
{
    循环体;
}</code></pre>

          <h4>2. 执行流程</h4>
          <ul class="key-list">
            <li>先判断表达式，值为真（非 0）则执行循环体，否则结束循环。</li>
            <li>属于“<strong>当型</strong>”循环：<strong>可能一次都不执行</strong>。</li>
            <li>循环体中必须有让表达式最终变为假的语句，否则变成死循环。</li>
            <li>循环体若只有一条语句，可以省略花括号，但建议保留。</li>
          </ul>

          <div class="tip tip-note">常见写法：<code>while (i &lt;= n) { sum += i; i++; }</code> 与 <code>while ((c = getchar()) != '\n')</code>。</div>
        `,
        codes: [
          {
            title: 'while 求和 1+2+…+100',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i = 1, sum = 0;

    while (i <= 100)
    {
        sum = sum + i;      /* 累加 */
        i++;                /* 别忘记改变循环变量，否则死循环 */
    }

    printf("sum = %d\n", sum);   /* 5050 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch05-s2',
        title: '5.2 do…while 语句',
        content: String.raw`
          <h4>1. 格式</h4>
          <pre><code>do
{
    循环体;
} while (表达式);        /* 注意这里的分号不能省 */</code></pre>

          <h4>2. 特点</h4>
          <ul class="key-list">
            <li>先执行一次循环体，<strong>再</strong>判断条件，属于“<strong>直到型</strong>”循环。</li>
            <li>循环体<strong>至少执行一次</strong>，这是它与 while 最本质的区别。</li>
            <li><code>while (表达式);</code> 后面的分号必须有。</li>
            <li>当第一次条件就不成立时，do-while 会多执行一次循环体，程序阅读题常在这里设坑。</li>
          </ul>
        `,
        codes: [
          {
            title: 'do…while 与 while 的差别',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i = 101, sum = 0;

    /* while 判断条件不成立，一次都不执行 */
    while (i <= 100)
    {
        sum += i;
        i++;
    }
    printf("while 的 sum = %d\n", sum);        /* 0 */

    /* do…while 至少执行一次 */
    i = 101; sum = 0;
    do
    {
        sum += i;
        i++;
    } while (i <= 100);
    printf("do…while 的 sum = %d\n", sum);     /* 101 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch05-s3',
        title: '5.3 for 语句',
        content: String.raw`
          <h4>1. 格式</h4>
          <pre><code>for (表达式1; 表达式2; 表达式3)
{
    循环体;
}</code></pre>

          <h4>2. 三个表达式的作用与执行顺序</h4>
          <ul class="key-list">
            <li>表达式1：赋初值，<strong>只执行一次</strong>。</li>
            <li>表达式2：循环条件，每次执行循环体前判断；省略则恒为真（死循环）。</li>
            <li>表达式3：循环变量增值，每次执行完循环体后执行。</li>
            <li>执行顺序：①→②→循环体→③→②→循环体→③→…→②为假结束。</li>
          </ul>

          <h4>3. 常见变形</h4>
          <ul class="key-list">
            <li><code>for (i = 1; i &lt;= n; i++)</code>：最常见的计数循环。</li>
            <li><code>for (; i &lt;= n; i++)</code>：省略表达式1（初值在循环前给出）。</li>
            <li><code>for (i = 1; ; i++)</code>：省略表达式2，条件恒真，需要 break 退出。</li>
            <li><code>for (i = 10; i &gt; 0; i--)</code>：循环变量递减。</li>
            <li>表达式可以是逗号表达式：<code>for (i = 1, sum = 0; i &lt;= 100; i++)</code>。</li>
          </ul>

          <div class="tip tip-ok">口诀：<strong>for 适合“次数已知”的循环，while 适合“条件已知、次数未知”的循环。</strong>能用 for 的地方一般也能用 while 改写。</div>
        `,
        codes: [
          {
            title: 'for 循环的几种常见写法',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i, sum = 0;

    /* 1) 标准计数循环 */
    for (i = 1; i <= 100; i++)
        sum += i;
    printf("1~100 的和 = %d\n", sum);

    /* 2) 求 1~100 中所有偶数的和 */
    int even = 0;
    for (i = 2; i <= 100; i += 2)
        even += i;
    printf("偶数之和 = %d\n", even);

    /* 3) 倒序循环 */
    for (i = 5; i > 0; i--)
        printf("%d ", i);
    printf("\n");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch05-s4',
        title: '5.4 循环的嵌套',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>一个循环体内又包含另一个完整的循环结构，称为循环嵌套。</li>
            <li>嵌套的循环之间<strong>不能交叉</strong>：内层循环必须完全包含在外层循环体内。</li>
            <li>执行次数为各层循环次数之积。例如外层 m 次、内层 n 次，循环体共执行 m×n 次。</li>
            <li>常用外层控制行、内层控制列，如打印九九乘法表、图形。</li>
            <li>for、while、do-while 可以互相嵌套。</li>
          </ul>

          <div class="tip tip-warn">程序阅读题常常这样出：<code>for(i=1;i&lt;=3;i++) for(j=1;j&lt;=2;j++) s++;</code> 问 s 的值 → 3×2 = 6。</div>
        `,
        codes: [
          {
            title: '嵌套循环：九九乘法表',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i, j;

    for (i = 1; i <= 9; i++)            /* 外层控制行 */
    {
        for (j = 1; j <= i; j++)        /* 内层控制列 */
        {
            printf("%d*%d=%-3d", j, i, i * j);
        }
        printf("\n");                    /* 每打完一行换行 */
    }

    return 0;
}`
          },
          {
            title: '嵌套循环：打印星号三角形',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i, j, n = 5;

    for (i = 1; i <= n; i++)            /* 共 n 行 */
    {
        for (j = 1; j <= n - i; j++)    /* 先打印空格 */
            printf(" ");
        for (j = 1; j <= 2 * i - 1; j++) /* 再打印星号 */
            printf("*");
        printf("\n");
    }

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch05-s5',
        title: '5.5 break 与 continue',
        content: String.raw`
          <h4>1. 两者的区别（必考点）</h4>
          <table>
            <thead><tr><th>语句</th><th>作用</th><th>影响范围</th></tr></thead>
            <tbody>
              <tr><td>break</td><td>立即<strong>结束整个循环</strong>，不再判断条件</td><td>只能用于循环体和 switch</td></tr>
              <tr><td>continue</td><td>跳过本次循环体剩余语句，<strong>进行下一次循环</strong></td><td>只能用于循环体</td></tr>
            </tbody>
          </table>

          <h4>2. 注意点</h4>
          <ul class="key-list">
            <li>break 跳出的是<strong>最内层</strong>的那一个循环（或 switch）。</li>
            <li>在多重循环中，break 不能一次跳出两层，需要配合标志变量或 goto。</li>
            <li>continue 在 while/do-while 中要小心：若改变循环变量的语句被 continue 跳过，可能造成死循环。</li>
            <li>break 和 continue 都只用于循环（break 还可用于 switch），不能单独出现在其他地方。</li>
          </ul>
        `,
        codes: [
          {
            title: 'break 与 continue 对比',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int i;

    printf("continue 效果（跳过 3）：");
    for (i = 1; i <= 5; i++)
    {
        if (i == 3)
            continue;           /* 跳过本次，继续下一个 i */
        printf("%d ", i);       /* 输出 1 2 4 5 */
    }
    printf("\n");

    printf("break 效果（到 3 停止）：");
    for (i = 1; i <= 5; i++)
    {
        if (i == 3)
            break;              /* 直接跳出整个循环 */
        printf("%d ", i);       /* 输出 1 2 */
    }
    printf("\n");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch05-s6',
        title: '5.6 经典算法举例与三种循环比较',
        content: String.raw`
          <h4>1. 三种循环的比较</h4>
          <table>
            <thead><tr><th>语句</th><th>判断时机</th><th>最少执行次数</th><th>适用场合</th></tr></thead>
            <tbody>
              <tr><td>while</td><td>先判断后执行</td><td>0 次</td><td>次数未知，条件控制</td></tr>
              <tr><td>do…while</td><td>先执行后判断</td><td>1 次</td><td>至少执行一次</td></tr>
              <tr><td>for</td><td>先判断后执行</td><td>0 次</td><td>次数已知，计数循环</td></tr>
            </tbody>
          </table>

          <h4>2. 本章必会经典算法</h4>
          <ul class="key-list">
            <li><strong>累加/累乘</strong>：求和、求阶乘（注意用 <code>long</code> 或 <code>double</code> 防溢出）。</li>
            <li><strong>计数</strong>：统计满足条件的个数，如统计能被 3 整除的数。</li>
            <li><strong>最值</strong>：从一批数据中找最大、最小值。</li>
            <li><strong>素数判断</strong>：用 <code>for (j = 2; j &lt;= i / 2; j++)</code> 试除。</li>
            <li><strong>水仙花数</strong>：各位数字立方和等于该数本身（153、370、371、407）。</li>
            <li><strong>Fibonacci 数列</strong>：前两项为 1、1，从第三项起每项等于前两项之和。</li>
            <li><strong>辗转相除法求最大公约数</strong>：反复用余数相除，直到余数为 0。</li>
            <li><strong>反向输出</strong>：反复取余、取整，可实现整数逆序。</li>
          </ul>
        `,
        codes: [
          {
            title: '经典算法：判断素数',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int n, i, flag = 1;

    printf("请输入一个大于1的整数：");
    scanf("%d", &n);

    for (i = 2; i <= n / 2; i++)
    {
        if (n % i == 0)     /* 找到一个因子，说明不是素数 */
        {
            flag = 0;
            break;
        }
    }

    if (flag == 1 && n > 1)
        printf("%d 是素数\n", n);
    else
        printf("%d 不是素数\n", n);

    return 0;
}`
          },
          {
            title: '经典算法：求 100~999 的水仙花数',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int n, a, b, c;

    for (n = 100; n <= 999; n++)
    {
        a = n / 100;            /* 百位 */
        b = n / 10 % 10;        /* 十位 */
        c = n % 10;             /* 个位 */

        if (a * a * a + b * b * b + c * c * c == n)
            printf("%d ", n);   /* 153 370 371 407 */
    }
    printf("\n");

    return 0;
}`
          },
          {
            title: '经典算法：Fibonacci 数列前 20 项',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int f1 = 1, f2 = 1, f3, i;

    printf("%6d%6d", f1, f2);
    for (i = 3; i <= 20; i++)
    {
        f3 = f1 + f2;           /* 当前项 = 前两项之和 */
        printf("%6d", f3);
        if (i % 5 == 0)         /* 每 5 个换行 */
            printf("\n");

        f1 = f2;                /* 迭代，整体前移 */
        f2 = f3;
    }

    return 0;
}`
          }
        ]
      }
    ]
  }

  /* 第 6 ~ 10 章见 knowledge-data-2.js */
];
