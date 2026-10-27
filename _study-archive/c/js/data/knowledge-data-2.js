/* ==========================================================================
   knowledge-data-2.js —— 知识点内容数据（第 6 ~ 10 章）
   --------------------------------------------------------------------------
   本文件把第 6~10 章的数据追加到 window.KNOWLEDGE_DATA 数组上。
   写法、可用的 HTML 标签与注意事项，见 knowledge-data.js 开头的说明。
   ========================================================================== */

window.KNOWLEDGE_DATA = (window.KNOWLEDGE_DATA || []).concat([

  /* ======================================================================
     第 6 章　数组
     ====================================================================== */
  {
    id: 'ch06',
    no: '第6章',
    title: '数组',
    desc: '数组用于批量处理同类型数据。重点掌握一维数组、二维数组的定义、初始化与引用方法，以及字符数组与字符串处理函数。本章是编程题的常客。',
    sections: [
      {
        id: 'ch06-s1',
        title: '6.1 一维数组',
        content: String.raw`
          <h4>1. 定义与引用</h4>
          <ul class="key-list">
            <li>定义形式：<code>类型名 数组名[常量表达式];</code>，如 <code>int a[10];</code> 表示 10 个整型元素。</li>
            <li>数组下标从 <strong>0</strong> 开始，<code>a[10]</code> 的下标范围是 <code>a[0]</code> ~ <code>a[9]</code>。</li>
            <li>数组元素相当于一个普通变量，可以参与赋值和运算：<code>a[0] = 5;</code>、<code>a[i] = a[i-1] + 1;</code>。</li>
            <li>数组的长度必须是<strong>常量表达式</strong>，不能是变量（C99 后支持变长数组，但考试仍按常量处理）。</li>
            <li>数组<b>不能在定义后整体赋值</b>，也不能用 <code>=</code> 复制整个数组。</li>
          </ul>

          <h4>2. 初始化</h4>
          <ul class="key-list">
            <li><code>int a[5] = {1, 2, 3, 4, 5};</code>：全部元素赋初值。</li>
            <li><code>int a[5] = {1, 2};</code>：只给前两个元素赋值，其余自动为 <strong>0</strong>。</li>
            <li><code>int a[5] = {0};</code>：全部元素置 0（常用技巧）。</li>
            <li><code>int a[] = {1, 2, 3};</code>：省略长度，由初值个数决定，此时长度为 3。</li>
            <li>若数组未初始化且是局部变量，其元素是随机值。</li>
          </ul>

          <h4>3. 典型算法</h4>
          <ul class="key-list">
            <li>遍历：<code>for (i = 0; i &lt; n; i++)</code>，注意边界是 <code>i &lt; n</code> 而不是 <code>i &lt;= n</code>。</li>
            <li>求最值：先把 <code>max = a[0]</code>，再逐个比较。</li>
            <li>逆序存放：首尾元素互换，循环到 <code>i &lt; n / 2</code>。</li>
            <li>冒泡排序：双重循环，相邻两两比较交换。</li>
            <li>顺序查找/折半查找：折半查找要求数组<strong>已有序</strong>。</li>
          </ul>

          <div class="tip tip-warn">易错点：C 语言<strong>不检查数组下标越界</strong>，<code>a[10]</code> 访问 <code>int a[10]</code> 之外的元素不会报错，但结果不可预测。考试中常问“哪个下标是合法的”。</div>
        `,
        codes: [
          {
            title: '一维数组：输入 10 个数求最大值、最小值与平均值',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a[10], i, max, min;
    float sum = 0;

    printf("请输入 10 个整数：\n");
    for (i = 0; i < 10; i++)
        scanf("%d", &a[i]);          /* 数组元素取地址也要用 & */

    max = min = a[0];                /* 先假定第一个元素是最大最小 */
    for (i = 0; i < 10; i++)
    {
        if (a[i] > max) max = a[i];
        if (a[i] < min) min = a[i];
        sum += a[i];
    }

    printf("最大值 = %d, 最小值 = %d, 平均值 = %.2f\n", max, min, sum / 10);

    return 0;
}`
          },
          {
            title: '一维数组：冒泡排序（从小到大）',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a[8] = {49, 38, 65, 97, 76, 13, 27, 4};
    int i, j, t, n = 8;

    for (i = 0; i < n - 1; i++)              /* 共 n-1 轮 */
    {
        for (j = 0; j < n - 1 - i; j++)      /* 每轮比较到未排序的末尾 */
        {
            if (a[j] > a[j + 1])             /* 前面的比后面的大就交换 */
            {
                t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }

    for (i = 0; i < n; i++)
        printf("%d ", a[i]);                 /* 4 13 27 38 49 65 76 97 */
    printf("\n");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch06-s2',
        title: '6.2 二维数组',
        content: String.raw`
          <h4>1. 定义与引用</h4>
          <ul class="key-list">
            <li>定义形式：<code>类型名 数组名[行数][列数];</code>，如 <code>int a[3][4];</code>。</li>
            <li>在内存中按<strong>行优先</strong>存放，即先存第 0 行所有元素，再存第 1 行。</li>
            <li>引用形式：<code>a[i][j]</code>，两个下标都从 0 开始。</li>
            <li>二维数组可以看作“数组的数组”：<code>a[0]</code> 是第一行的首地址。</li>
          </ul>

          <h4>2. 初始化</h4>
          <ul class="key-list">
            <li>按行赋值：<code>int a[2][3] = {{1,2,3}, {4,5,6}};</code>（推荐，便于阅读）</li>
            <li>顺序赋值：<code>int a[2][3] = {1,2,3,4,5,6};</code>（按行依次存放）</li>
            <li>部分赋值：<code>int a[2][3] = {{1}, {4}};</code>，未给值的元素自动为 0。</li>
            <li>可以省略<strong>行</strong>长度但不能省略列长度：<code>int a[][3] = {{1,2,3},{4,5,6}};</code></li>
          </ul>

          <h4>3. 典型应用</h4>
          <ul class="key-list">
            <li>矩阵的转置：<code>b[j][i] = a[i][j];</code></li>
            <li>求两条对角线元素之和：主对角线 <code>a[i][i]</code>，副对角线 <code>a[i][n-1-i]</code>。</li>
            <li>找二维数组中的最大值及其行列位置。</li>
          </ul>
        `,
        codes: [
          {
            title: '二维数组：矩阵转置',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a[2][3] = {{1, 2, 3}, {4, 5, 6}};
    int b[3][2];
    int i, j;

    for (i = 0; i < 2; i++)
        for (j = 0; j < 3; j++)
            b[j][i] = a[i][j];       /* 行列互换 */

    printf("转置后的矩阵：\n");
    for (i = 0; i < 3; i++)
    {
        for (j = 0; j < 2; j++)
            printf("%4d", b[i][j]);
        printf("\n");
    }

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch06-s3',
        title: '6.3 字符数组与字符串',
        content: String.raw`
          <h4>1. 字符数组的定义与初始化</h4>
          <ul class="key-list">
            <li><code>char c[5] = {'H', 'e', 'l', 'l', 'o'};</code>：存放 5 个字符，<strong>不是字符串</strong>。</li>
            <li><code>char c[6] = "Hello";</code>：字符串可以整体赋给字符数组，末尾自动补 <code>'\0'</code>，所以长度至少为 6。</li>
            <li><code>char c[] = "Hello";</code>：长度自动确定为 6。</li>
            <li>C 语言中用 <code>'\0'</code>（ASCII 码为 0）作为字符串结束标志。</li>
          </ul>

          <div class="tip tip-warn">高频易错点：<code>char c[5] = "Hello";</code> 是<strong>错误</strong>的，因为字符串 "Hello" 实际占 6 个字节（含 '\0'）。另外 <code>"a"</code> 占 2 字节，<code>'a'</code> 占 1 字节。</div>

          <h4>2. 字符串的输入输出</h4>
          <ul class="key-list">
            <li>逐个字符输入输出用 <code>getchar / putchar</code> 配合循环。</li>
            <li>整个字符串输入输出用 <code>gets / puts</code>（可用空格）或 <code>scanf("%s") / printf("%s")</code>（遇空格结束）。</li>
            <li><code>scanf("%s", str)</code> 中数组名本身就是地址，<strong>不加 &amp;</strong>。</li>
            <li>注意：<code>gets</code> 因安全问题在 C11 中被删除，考试中仍常见，实用中可用 <code>fgets</code>。</li>
          </ul>

          <h4>3. 判断字符串结束</h4>
          <p>遍历字符串的标准写法：<code>for (i = 0; s[i] != '\0'; i++)</code>，也可以写成 <code>for (i = 0; s[i]; i++)</code>。</p>
        `,
        codes: [
          {
            title: '字符数组与字符串长度',
            code: String.raw`#include <stdio.h>
#include <string.h>

int main(void)
{
    char a[] = "China";             /* 占 6 字节，末尾有 '\0' */
    char b[5] = {'C', 'h', 'i', 'n', 'a'};   /* 只有 5 个字符，不含 '\0' */

    printf("a 的长度 = %d, sizeof(a) = %d\n", (int)strlen(a), (int)sizeof(a));
    /* strlen(a) = 5（不含 '\0'），sizeof(a) = 6（含 '\0'） */

    printf("b 开头 5 个字符：");
    for (int i = 0; i < 5; i++) putchar(b[i]);
    putchar('\n');

    return 0;
}`
          },
          {
            title: '字符串小写转大写（遍历字符数组）',
            code: String.raw`#include <stdio.h>

int main(void)
{
    char s[100];
    int i;

    printf("请输入一个字符串：");
    gets(s);                        /* 可以读入含空格的字符串 */

    for (i = 0; s[i] != '\0'; i++)  /* 遇到 '\0' 结束 */
    {
        if (s[i] >= 'a' && s[i] <= 'z')
            s[i] = s[i] - 32;       /* 小写转大写 */
    }

    printf("转换结果：%s\n", s);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch06-s4',
        title: '6.4 常用字符串处理函数',
        content: String.raw`
          <p>以下函数都在头文件 <code>&lt;string.h&gt;</code> 中声明。</p>
          <table>
            <thead><tr><th>函数</th><th>功能</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td><code>strlen(s)</code></td><td>求字符串长度</td><td>不包含 <code>'\0'</code></td></tr>
              <tr><td><code>strcpy(s1, s2)</code></td><td>把 s2 复制到 s1</td><td>不能用 <code>s1 = s2</code> 代替</td></tr>
              <tr><td><code>strcat(s1, s2)</code></td><td>把 s2 连接到 s1 后面</td><td>s1 必须足够大</td></tr>
              <tr><td><code>strcmp(s1, s2)</code></td><td>比较两个字符串</td><td>相等返回 0，s1&gt;s2 返回正数，否则负数</td></tr>
              <tr><td><code>strlwr(s)</code> / <code>strupr(s)</code></td><td>转小写 / 转大写</td><td>非标准函数，部分编译器支持</td></tr>
              <tr><td><code>gets(s)</code> / <code>puts(s)</code></td><td>输入 / 输出一行字符串</td><td>puts 会自动换行</td></tr>
            </tbody>
          </table>

          <div class="tip tip-warn">易错点：字符串比较<strong>不能用</strong> <code>if (s1 == s2)</code>，因为数组名代表地址；必须用 <code>strcmp(s1, s2) == 0</code>。同理字符串赋值必须用 <code>strcpy</code>。</div>
        `,
        codes: [
          {
            title: '字符串函数综合演示',
            code: String.raw`#include <stdio.h>
#include <string.h>

int main(void)
{
    char s1[40] = "Hello";
    char s2[] = "World";

    printf("strlen(s1) = %d\n", (int)strlen(s1));      /* 5 */

    strcat(s1, " ");          /* 先接一个空格 */
    strcat(s1, s2);           /* 再连接 s2 */
    printf("连接后：%s\n", s1);                         /* Hello World */

    char s3[40];
    strcpy(s3, s1);           /* 复制，不能用 s3 = s1 */
    printf("复制后：%s\n", s3);

    /* 比较：相等返回 0 */
    if (strcmp("abc", "abc") == 0)
        printf("两个字符串相等\n");
    printf("strcmp(abc, abd) = %d\n", strcmp("abc", "abd"));  /* 负数 */

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 7 章　函数
     ====================================================================== */
  {
    id: 'ch07',
    no: '第7章',
    title: '函数',
    desc: '函数是 C 程序的基本组成单位。掌握函数的定义、调用、参数传递（值传递与地址传递）、递归调用，以及变量的作用域与存储类别。',
    sections: [
      {
        id: 'ch07-s1',
        title: '7.1 函数的定义与调用',
        content: String.raw`
          <h4>1. 函数定义的一般形式</h4>
          <pre><code>返回类型 函数名(形式参数表)
{
    声明部分;
    执行语句;
}</code></pre>
          <ul class="key-list">
            <li>返回类型为 <code>void</code> 表示函数不返回任何值。</li>
            <li>无参函数写成 <code>void f(void)</code> 或 <code>void f()</code>。</li>
            <li>函数不能嵌套定义，即不能在一个函数内部定义另一个函数，但可以嵌套调用。</li>
            <li><code>return</code> 语句的作用是：① 结束函数并返回调用处；② 向调用者返回一个值。</li>
            <li>返回值的类型由函数定义时的返回类型决定，若不一致会进行类型转换。</li>
          </ul>

          <h4>2. 函数的调用</h4>
          <ul class="key-list">
            <li>调用形式：<code>函数名(实参表)</code>，如 <code>max(a, b);</code>、<code>y = max(a, b);</code>。</li>
            <li>实参与形参的<strong>个数、类型、顺序</strong>必须一一对应。</li>
            <li>实参与形参的数据传递是<strong>单向的“值传递”</strong>：实参把值传给形参，形参的改变不会影响实参。</li>
            <li>实参可以是常量、变量或表达式，形参必须是变量。</li>
          </ul>
        `,
        codes: [
          {
            title: '函数定义与调用：求两数最大值',
            code: String.raw`#include <stdio.h>

/* 函数定义：返回两个整数中的较大者 */
int max(int x, int y)
{
    return x > y ? x : y;
}

int main(void)
{
    int a = 10, b = 20, m;

    m = max(a, b);              /* 函数调用：a、b 是实参 */
    printf("最大值 = %d\n", m);

    printf("直接调用也可：%d\n", max(3, 7));

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch07-s2',
        title: '7.2 参数传递：值传递与地址传递',
        content: String.raw`
          <h4>1. 值传递（单向）</h4>
          <p>形参是实参的<strong>副本</strong>，占用不同的存储单元。函数内部修改形参，不会改变实参的值。</p>

          <h4>2. 地址传递（通过指针）</h4>
          <p>把变量的<strong>地址</strong>传给函数的指针形参，函数内部通过 <code>*p</code> 修改，就能真正改变实参的值——这就是经典的 <code>swap</code> 交换函数。</p>

          <div class="tip tip-warn">必考：下面两个 swap 只有第二个能真正交换。因为值传递只是交换了形参这两个“副本”，函数返回后副本销毁，实参毫无变化。</div>

          <h4>3. 数组作参数时是地址传递</h4>
          <p>数组名代表数组首地址，把数组名传给函数时，形参和实参指向<strong>同一块内存</strong>，因此函数内部对数组元素的修改会影响原来的数组。</p>
        `,
        codes: [
          {
            title: '对比：值传递无法交换，地址传递可以',
            code: String.raw`#include <stdio.h>

/* 错误示范：值传递，不能交换 */
void swapWrong(int x, int y)
{
    int t = x;
    x = y;
    y = t;              /* 只交换了副本，main 中的 a、b 不变 */
}

/* 正确写法：地址传递，通过指针交换 */
void swapRight(int *p, int *q)
{
    int t = *p;
    *p = *q;
    *q = t;             /* 直接修改地址所指向的变量 */
}

int main(void)
{
    int a = 3, b = 5;

    swapWrong(a, b);
    printf("值传递后：a = %d, b = %d\n", a, b);     /* 3, 5 —— 没变 */

    swapRight(&a, &b);
    printf("地址传递后：a = %d, b = %d\n", a, b);   /* 5, 3 —— 交换了 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch07-s3',
        title: '7.3 函数的声明与函数原型',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>如果函数定义出现在调用之前，可以不用声明。</li>
            <li>如果函数定义在调用之后（或定义在别的源文件中），必须在调用前声明。</li>
            <li>声明形式：<code>返回类型 函数名(参数类型表);</code>，如 <code>int max(int, int);</code>，注意<strong>末尾有分号</strong>。</li>
            <li>函数声明的作用是告诉编译器函数的名字、返回类型和参数类型，便于检查调用是否合法。</li>
            <li>参数名可以省略，只写类型即可。</li>
          </ul>

          <h4>递归与嵌套调用</h4>
          <ul class="key-list">
            <li><strong>嵌套调用</strong>：在函数 A 中调用函数 B，函数 B 中又可调用函数 C，一层层嵌套。</li>
            <li><strong>递归调用</strong>：函数直接或间接地调用自身，必须有<strong>结束条件</strong>（递归出口），否则无限递归导致栈溢出。</li>
            <li>典型递归例子：求 n!、Fibonacci 数列、汉诺塔、字符串逆序输出。</li>
          </ul>
        `,
        codes: [
          {
            title: '递归求 n!',
            code: String.raw`#include <stdio.h>

long fact(int n)
{
    if (n == 1 || n == 0)       /* 递归出口，必须有！ */
        return 1;
    else
        return n * fact(n - 1);  /* 递归调用自身 */
}

int main(void)
{
    int n;
    printf("请输入 n：");
    scanf("%d", &n);

    if (n < 0)
        printf("n 不能为负数\n");
    else
        printf("%d! = %ld\n", n, fact(n));

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch07-s4',
        title: '7.4 数组作为函数参数',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>数组元素作实参：与普通变量一样，是<strong>值传递</strong>，不影响原数组。</li>
            <li>数组名作实参：传递的是<strong>首地址</strong>，形参与实参指向同一数组，函数内的修改会保留。</li>
            <li>形参写法：<code>void f(int a[], int n)</code> 或 <code>void f(int *a, int n)</code>，两者等价。</li>
            <li>形参数组可以不指定长度，但通常需要额外传递数组长度 n。</li>
            <li>二维数组作形参时，<strong>列数不能省略</strong>：<code>void f(int a[][4], int n)</code>。</li>
          </ul>
        `,
        codes: [
          {
            title: '数组作参数：排序与平均值',
            code: String.raw`#include <stdio.h>

/* 数组名作参数：会直接修改原数组 */
void sort(int a[], int n)
{
    int i, j, t;
    for (i = 0; i < n - 1; i++)
        for (j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1])
            { t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
}

float average(int a[], int n)
{
    int i, sum = 0;
    for (i = 0; i < n; i++)
        sum += a[i];
    return (float)sum / n;      /* 注意强制转换，否则整数除法 */
}

int main(void)
{
    int a[6] = {23, 5, 78, 12, 90, 34};
    int i;

    sort(a, 6);                 /* 原数组被真正排序 */
    for (i = 0; i < 6; i++)
        printf("%d ", a[i]);
    printf("\n");

    printf("平均值 = %.2f\n", average(a, 6));

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch07-s5',
        title: '7.5 变量的作用域与存储类别',
        content: String.raw`
          <h4>1. 局部变量与全局变量</h4>
          <table>
            <thead><tr><th>比较项</th><th>局部变量</th><th>全局变量</th></tr></thead>
            <tbody>
              <tr><td>定义位置</td><td>函数内部</td><td>函数外部</td></tr>
              <tr><td>有效范围</td><td>本函数内</td><td>从定义处到本文件结束</td></tr>
              <tr><td>初值</td><td>不赋值则不确定</td><td>不赋值自动为 0</td></tr>
              <tr><td>生存期</td><td>函数调用期间</td><td>整个程序运行期间</td></tr>
            </tbody>
          </table>
          <ul class="key-list">
            <li>局部变量与全局变量同名时，<strong>局部变量优先</strong>（屏蔽全局变量）。</li>
            <li>全局变量增加了函数间的数据联系，但降低了模块的独立性，应尽量少用。</li>
          </ul>

          <h4>2. 存储类别（4 个）</h4>
          <ul class="key-list">
            <li><code>auto</code>：自动变量，默认为动态存储，函数调用结束即释放。</li>
            <li><code>static</code>：静态变量。静态局部变量在函数调用结束后<strong>值依然保留</strong>，下次调用时沿用上次的值，且只初始化一次。</li>
            <li><code>register</code>：寄存器变量，建议把变量放在寄存器中以提高速度（现代编译器会自动优化）。</li>
            <li><code>extern</code>：声明外部变量，用于扩展全局变量的作用范围（跨文件使用）。</li>
          </ul>

          <div class="tip tip-warn">高频考点：静态局部变量 <code>static int i = 0;</code> 只在第一次调用时初始化，之后的调用不再执行初始化语句，因此常被用来计数“函数被调用了多少次”。</div>
        `,
        codes: [
          {
            title: '静态局部变量：函数调用计数',
            code: String.raw`#include <stdio.h>

void counter(void)
{
    static int n = 0;       /* 只初始化一次，函数退出后值保留 */
    int m = 0;              /* 普通局部变量，每次调用都重新开始 */

    n++;
    m++;

    printf("static n = %d, auto m = %d\n", n, m);
}

int main(void)
{
    counter();      /* n = 1, m = 1 */
    counter();      /* n = 2, m = 1 —— n 保留了上次的值 */
    counter();      /* n = 3, m = 1 */

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 8 章　指针
     ====================================================================== */
  {
    id: 'ch08',
    no: '第8章',
    title: '指针',
    desc: '指针是 C 语言的精华，也是湖北专升本的高频难点。掌握指针与地址的关系、指针与数组/字符串/函数的结合使用、指针数组与动态内存分配。',
    sections: [
      {
        id: 'ch08-s1',
        title: '8.1 指针与指针变量',
        content: String.raw`
          <h4>1. 基本概念</h4>
          <ul class="key-list">
            <li>内存中的每个字节都有一个编号，称为<strong>地址</strong>，也叫做<strong>指针</strong>。</li>
            <li>专门用来存放地址的变量叫<strong>指针变量</strong>，它的值是地址。</li>
            <li>定义形式：<code>类型名 *指针变量名;</code>，如 <code>int *p;</code> 表示 p 是指向整型数据的指针变量。</li>
            <li>取地址运算符 <code>&amp;</code>：取得变量的地址，如 <code>&amp;a</code>。</li>
            <li>指针运算符（间接访问运算符）<code>*</code>：取出指针所指向变量的值。</li>
          </ul>

          <h4>2. 记忆要点</h4>
          <table>
            <thead><tr><th>写法</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td><code>int *p;</code></td><td>定义 p 为指向 int 的指针变量（此时 * 是说明符）</td></tr>
              <tr><td><code>p = &amp;a;</code></td><td>把 a 的地址赋给 p，p 指向 a</td></tr>
              <tr><td><code>*p</code></td><td>取出 p 所指向变量的值，等价于 a（此时 * 是运算符）</td></tr>
              <tr><td><code>&amp;*p</code></td><td>等价于 p；<code>*&amp;a</code> 等价于 a</td></tr>
            </tbody>
          </table>

          <div class="tip tip-warn">易错点：指针变量必须先赋值（指向确定的存储单元）才能使用 <code>*p</code>，否则是“野指针”，可能造成程序崩溃。另外 <code>int *p, q;</code> 中只有 p 是指针，q 是普通整型变量，这是选择题的经典陷阱。</div>
        `,
        codes: [
          {
            title: '指针的基本使用',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a = 100;
    int *p = &a;            /* 定义指针变量 p，并让它指向 a */

    printf("a 的值       = %d\n", a);
    printf("a 的地址     = %p\n", (void *)&a);
    printf("p 存放的地址 = %p\n", (void *)p);     /* 与 &a 相同 */
    printf("*p 取出的值   = %d\n", *p);           /* 100 */

    *p = 200;               /* 通过指针间接修改 a 的值 */
    printf("修改后 a = %d\n", a);                 /* 200 */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch08-s2',
        title: '8.2 指针与一维数组',
        content: String.raw`
          <h4>1. 核心等价关系（必背）</h4>
          <table>
            <thead><tr><th>下标写法</th><th>指针写法</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td><code>a[i]</code></td><td><code>*(a + i)</code></td><td>第 i 个元素的值（两者完全等价）</td></tr>
              <tr><td><code>&amp;a[i]</code></td><td><code>a + i</code></td><td>第 i 个元素的地址</td></tr>
              <tr><td><code>a</code></td><td><code>&amp;a[0]</code></td><td>数组首元素的地址</td></tr>
            </tbody>
          </table>

          <h4>2. 关键结论</h4>
          <ul class="key-list">
            <li>数组名 <code>a</code> 代表数组首地址，是一个<strong>地址常量</strong>，不能被赋值或自增：<code>a++</code> 非法。</li>
            <li>指针变量 <code>p</code> 可以自增：<code>p++</code> 表示 p 指向下一个元素（地址增加 <code>sizeof(类型)</code> 个字节）。</li>
            <li>int 型指针做 <code>p++</code>，地址值实际增加 4（不是 1）。</li>
            <li><code>*(p + i)</code> 中，圆括号不能省：<code>*p + i</code> 表示“先取值再加 i”。</li>
            <li><code>sizeof(a)</code> 得到整个数组的字节数，<code>sizeof(p)</code> 得到指针本身的字节数（4 或 8）。</li>
          </ul>

          <div class="tip tip-ok">记忆口诀：<strong>“数组名是常量地址，指针变量是可变地址；下标即偏移，<code>a[i]</code> 就是 <code>*(a+i)</code>”</strong>。</div>
        `,
        codes: [
          {
            title: '用三种方式访问数组元素',
            code: String.raw`#include <stdio.h>

int main(void)
{
    int a[5] = {10, 20, 30, 40, 50};
    int *p = a;             /* 等价于 int *p = &a[0]; */
    int i;

    /* 方式一：数组下标 */
    for (i = 0; i < 5; i++)
        printf("%d ", a[i]);
    printf("\n");

    /* 方式二：指针 + 偏移 */
    for (i = 0; i < 5; i++)
        printf("%d ", *(a + i));
    printf("\n");

    /* 方式三：指针自增 */
    for (p = a; p < a + 5; p++)
        printf("%d ", *p);
    printf("\n");

    printf("sizeof(a) = %d, sizeof(p) = %d\n",
           (int)sizeof(a), (int)sizeof(p));

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch08-s3',
        title: '8.3 指针与字符串',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>字符串可以用字符数组存放，也可以用字符指针指向字符串常量：<code>char *s = "Hello";</code>。</li>
            <li>字符数组名不是变量，不能整体赋值；字符指针是变量，可以<strong>改变指向</strong>。</li>
            <li><code>printf("%s", s)</code>——用 <code>%s</code> 输出时给出的是字符串<strong>首地址</strong>，函数会一直输出到 <code>'\0'</code>。</li>
            <li>用字符指针处理字符串时，通常写成 <code>while (*s != '\0') { … s++; }</code>。</li>
            <li>用指针方式输出字符串长度、复制字符串、连接字符串，是常见的程序阅读题形式。</li>
          </ul>

          <div class="tip tip-warn">注意区分：<code>char a[] = "abc";</code> 定义了数组，内容可以修改；<code>char *p = "abc";</code> 中 p 指向常量区，<code>p[0] = 'x'</code> 非法（可能崩溃）。</div>
        `,
        codes: [
          {
            title: '用指针求字符串长度与复制字符串',
            code: String.raw`#include <stdio.h>

/* 用指针计算字符串长度 */
int myStrlen(char *s)
{
    int n = 0;
    while (*s != '\0')      /* 到字符串末尾结束 */
    {
        n++;
        s++;                /* 指针后移一个字符 */
    }
    return n;
}

/* 用指针复制字符串 */
void myStrcpy(char *dest, char *src)
{
    while ((*dest = *src) != '\0')   /* 边复制边判断 */
    {
        dest++;
        src++;
    }
}

int main(void)
{
    char *s = "Hello, C!";
    char buf[50];

    printf("长度 = %d\n", myStrlen(s));

    myStrcpy(buf, s);
    printf("复制结果：%s\n", buf);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch08-s4',
        title: '8.4 指针与函数',
        content: String.raw`
          <h4>三种结合方式</h4>
          <ul class="key-list">
            <li><strong>指针作函数参数</strong>：把地址传进函数，实现“通过函数修改实参的值”（如 swap、求最大值并带回）。</li>
            <li><strong>返回指针值的函数</strong>：函数返回类型写成 <code>int *</code>，如 <code>int *find(...)</code>。</li>
            <li><strong>指向函数的指针</strong>：<code>int (*pf)(int, int);</code>，把函数名赋给指针，通过指针调用函数。</li>
          </ul>

          <h4>特别注意区分两个定义</h4>
          <table>
            <thead><tr><th>写法</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td><code>int (*p)(int, int);</code></td><td>p 是<strong>指向函数的指针</strong></td></tr>
              <tr><td><code>int *p(int, int);</code></td><td>p 是<strong>返回指针值的函数</strong></td></tr>
            </tbody>
          </table>

          <div class="tip tip-note">考试提示：指针作参数的典型题是“编写函数，通过指针把三个数按从小到大排序”，以及“用指针实现 swap 交换”。</div>
        `,
        codes: [
          {
            title: '指针作参数：通过函数带回多个结果',
            code: String.raw`#include <stdio.h>

/* 求一组数中的最大值和最小值，通过指针"带回"两个结果 */
void minmax(int a[], int n, int *pMax, int *pMin)
{
    int i;
    *pMax = *pMin = a[0];

    for (i = 1; i < n; i++)
    {
        if (a[i] > *pMax) *pMax = a[i];    /* 通过指针修改调用者的变量 */
        if (a[i] < *pMin) *pMin = a[i];
    }
}

/* 判断某年是否闰年，用指针返回多个值 */
void isLeap(int year, int *pFlag)
{
    *pFlag = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
}

int main(void)
{
    int a[7] = {5, 8, -3, 12, 0, 7, 20};
    int mx, mn, leap;

    minmax(a, 7, &mx, &mn);
    printf("最大值 = %d, 最小值 = %d\n", mx, mn);

    isLeap(2024, &leap);
    printf("2024 年%s闰年\n", leap ? "是" : "不是");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch08-s5',
        title: '8.5 指针数组与多级指针',
        content: String.raw`
          <h4>1. 指针数组</h4>
          <ul class="key-list">
            <li>定义：<code>int *p[4];</code>——是一个数组，每个元素都是指针。优先级：<code>[ ]</code> 高于 <code>*</code>。</li>
            <li>字符串数组常用指针数组实现：<code>char *names[] = {"Tom", "Jerry", "Amy"};</code></li>
            <li>用指针数组处理字符串的好处是可以按“行”交换，效率高，例如按字典序排序人名。</li>
          </ul>

          <h4>2. 多级指针</h4>
          <ul class="key-list">
            <li>指向指针的指针：<code>int **pp;</code>，二级指针常用于动态二维数组和参数传递。</li>
            <li>若 <code>int a = 5; int *p = &amp;a; int **pp = &amp;p;</code>，则 <code>**pp</code> 的值为 5。</li>
          </ul>

          <h4>3. 易混辨析（选择题高频）</h4>
          <table>
            <thead><tr><th>定义</th><th>含义</th></tr></thead>
            <tbody>
              <tr><td><code>int *p[5];</code></td><td>指针数组，5 个指向 int 的指针</td></tr>
              <tr><td><code>int (*p)[5];</code></td><td>行指针（指向含 5 个 int 的一维数组的指针）</td></tr>
            </tbody>
          </table>
        `,
        codes: [
          {
            title: '指针数组：排序字符串',
            code: String.raw`#include <stdio.h>
#include <string.h>

int main(void)
{
    char *names[] = {"Tom", "Jerry", "Amy", "Bob"};
    int i, j, n = 4;
    char *t;

    /* 按字典序排序：交换的是指针，不动字符串本身 */
    for (i = 0; i < n - 1; i++)
        for (j = 0; j < n - 1 - i; j++)
            if (strcmp(names[j], names[j + 1]) > 0)
            {
                t = names[j];
                names[j] = names[j + 1];
                names[j + 1] = t;
            }

    for (i = 0; i < n; i++)
        printf("%s\n", names[i]);    /* Amy Bob Jerry Tom */

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch08-s6',
        title: '8.6 动态内存分配',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>头文件：<code>&lt;stdlib.h&gt;</code>。</li>
            <li><code>malloc(size)</code>：申请 size 个字节的连续空间，返回 <code>void *</code>，失败返回 NULL。</li>
            <li><code>calloc(n, size)</code>：申请 n 个长度为 size 的空间，并自动初始化为 0。</li>
            <li><code>realloc(p, size)</code>：改变已分配空间的大小。</li>
            <li><code>free(p)</code>：释放动态申请的内存，防止内存泄漏。</li>
            <li>函数原型在头文件中已带类型转换，但写成 <code>(int *)malloc(sizeof(int) * n)</code> 更稳妥。</li>
          </ul>

          <div class="tip tip-warn">注意：动态内存用完后必须 <code>free</code>；<code>free</code> 后不能再使用该指针（悬空指针）。</div>
        `,
        codes: [
          {
            title: '动态数组的使用',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    int n, i;
    int *a;

    printf("请输入数组长度：");
    scanf("%d", &n);

    /* 申请 n 个整型空间 */
    a = (int *)malloc(sizeof(int) * n);

    if (a == NULL)
    {
        printf("内存分配失败！\n");
        return 1;
    }

    for (i = 0; i < n; i++)
        a[i] = i * i;               /* 可以用下标访问，也可以用 *(a+i) */

    for (i = 0; i < n; i++)
        printf("%d ", a[i]);
    printf("\n");

    free(a);                        /* 用完一定要释放 */
    a = NULL;                       /* 避免悬空指针 */

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 9 章　结构体
     ====================================================================== */
  {
    id: 'ch09',
    no: '第9章',
    title: '结构体',
    desc: '结构体把不同类型的数据组合成一个整体。掌握结构体类型与变量的定义、引用、初始化，结构体数组、结构体指针以及链表的基本操作。',
    sections: [
      {
        id: 'ch09-s1',
        title: '9.1 结构体的定义、引用与初始化',
        content: String.raw`
          <h4>1. 定义结构体类型</h4>
          <pre><code>struct 结构体名 {
    类型名 成员名;
    ...
};                    /* 末尾的分号不能少 */

struct 结构体名 变量名;   /* 用类型定义变量 */</code></pre>
          <ul class="key-list">
            <li>结构体类型是用户自定义的数据类型，<strong>不占内存空间</strong>，它只是一种“模板”。</li>
            <li>定义变量的同时可以定义类型（不写结构体名），但这样就不能再用它定义其它变量。</li>
            <li>结构体类型不能直接递归包含自己（不能写 <code>struct A a;</code>），但可以包含指向自身的指针（用于链表）。</li>
          </ul>

          <h4>2. 引用成员</h4>
          <ul class="key-list">
            <li>结构体变量引用成员：<code>变量名.成员名</code>，如 <code>stu.name</code>。</li>
            <li>结构体指针引用成员：<code>指针名->成员名</code>，等价于 <code>(*指针名).成员名</code>。</li>
            <li>成员运算 <code>.</code> 的优先级最高，与 <code>()</code>、<code>[]</code>、<code>-></code> 同级。</li>
            <li>成员可以像普通变量一样参与运算；同类型的结构体变量之间可以<strong>整体赋值</strong>（<code>s1 = s2;</code>）。</li>
            <li>结构体变量的初始化：<code>struct Student s = {"张三", 18, 90.5};</code></li>
          </ul>
        `,
        codes: [
          {
            title: '结构体的定义、初始化与成员引用',
            code: String.raw`#include <stdio.h>
#include <string.h>

/* 定义学生结构体类型 —— 末尾的分号千万不要漏 */
struct Student
{
    int    num;         /* 学号 */
    char   name[20];    /* 姓名 */
    float  score;       /* 成绩 */
};

int main(void)
{
    /* 定义变量并初始化 */
    struct Student s1 = {1001, "张三", 92.5};
    struct Student s2, s3;
    struct Student *p;

    /* 引用成员：用变量名 + 点 */
    printf("学号：%d\n", s1.num);
    printf("姓名：%s\n", s1.name);
    printf("成绩：%.1f\n", s1.score);

    /* 修改成员 */
    s1.score = 95.0;

    /* 同类型结构体可以整体赋值 */
    s2 = s1;
    printf("整体赋值后 s2.name = %s\n", s2.name);

    /* 用指针访问：箭头 -> */
    p = &s3;
    p->num = 1002;
    strcpy(p->name, "李四");       /* 字符数组不能用 = 赋值，要用 strcpy */
    p->score = 88.0;
    printf("指针访问：%d %s %.1f\n", p->num, p->name, p->score);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch09-s2',
        title: '9.2 结构体数组',
        content: String.raw`
          <h4>要点</h4>
          <ul class="key-list">
            <li>定义：<code>struct Student stu[3];</code>，每个元素都是一个结构体变量。</li>
            <li>初始化：<code>struct Student stu[2] = {{1001,"张三",90},{1002,"李四",85}};</code></li>
            <li>引用：<code>stu[i].name</code>，第 i 个学生的姓名。</li>
            <li>常见应用：按成绩排序、查找特定学号的学生、统计平均分、求最高分学生。</li>
            <li>结构体数组名作为函数参数时，与普通数组一样是地址传递。</li>
          </ul>
        `,
        codes: [
          {
            title: '结构体数组：按成绩排序并输出',
            code: String.raw`#include <stdio.h>

struct Student
{
    int   num;
    char  name[20];
    float score;
};

int main(void)
{
    struct Student stu[4] = {
        {1001, "张三", 78.5},
        {1002, "李四", 92.0},
        {1003, "王五", 65.5},
        {1004, "赵六", 88.0}
    };
    int i, j;
    struct Student t;

    /* 冒泡排序：按成绩从高到低 */
    for (i = 0; i < 3; i++)
        for (j = 0; j < 3 - i; j++)
            if (stu[j].score < stu[j + 1].score)
            {
                t = stu[j];             /* 结构体变量可以整体交换 */
                stu[j] = stu[j + 1];
                stu[j + 1] = t;
            }

    printf("姓名\t成绩\n");
    for (i = 0; i < 4; i++)
        printf("%s\t%.1f\n", stu[i].name, stu[i].score);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch09-s3',
        title: '9.3 结构体指针与链表',
        content: String.raw`
          <h4>1. 结构体指针</h4>
          <ul class="key-list">
            <li>定义：<code>struct Student *p;</code>，让它指向一个结构体变量：<code>p = &amp;stu1;</code>。</li>
            <li>访问成员用 <code>p-&gt;num</code> 或 <code>(*p).num</code>，注意 <code>*p.num</code> 是<strong>错误</strong>的（因为 <code>.</code> 优先级高于 <code>*</code>）。</li>
            <li>用指针指向结构体数组：<code>p = stu;</code>，则 <code>p-&gt;score</code> 是第一个元素的成绩。</li>
          </ul>

          <h4>2. 链表（动态数据结构）</h4>
          <ul class="key-list">
            <li>链表由若干<strong>结点</strong>组成，每个结点包含“数据域”和“指针域”，指针指向下一个结点。</li>
            <li>链表的最后一个结点的指针域为 <code>NULL</code>，表示链表结束。</li>
            <li>需要一个<strong>头指针</strong>指向第一个结点，才能访问整个链表。</li>
            <li>基本操作：建立链表、遍历输出、插入结点、删除结点。</li>
            <li>结点类型定义：<code>struct Node { int data; struct Node *next; };</code>——结构体内含指向自身类型的指针是合法的。</li>
          </ul>

          <div class="tip tip-note">链表题在专升本中多以程序阅读题形式出现：给出建表和遍历代码，让你写出输出结果，或让你补全插入、删除的语句。</div>
        `,
        codes: [
          {
            title: '建立并遍历一个简单链表',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

/* 结点类型：数据域 + 指针域 */
struct Node
{
    int data;
    struct Node *next;
};

int main(void)
{
    struct Node *head = NULL, *p, *q;
    int i;

    /* 建立链表：头插法，输入 1~5 */
    for (i = 1; i <= 5; i++)
    {
        p = (struct Node *)malloc(sizeof(struct Node));
        p->data = i;
        p->next = head;         /* 新结点指向原来的头结点 */
        head = p;               /* 头指针指向新结点 */
    }

    /* 遍历输出 */
    q = head;
    while (q != NULL)
    {
        printf("%d -> ", q->data);
        q = q->next;            /* 移到下一个结点 */
    }
    printf("NULL\n");

    /* 释放内存 */
    while (head != NULL)
    {
        q = head;
        head = head->next;
        free(q);
    }

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch09-s4',
        title: '9.4 共用体与枚举类型',
        content: String.raw`
          <h4>1. 共用体（union）</h4>
          <ul class="key-list">
            <li>定义形式与结构体相似，但<strong>所有成员共用同一块存储空间</strong>。</li>
            <li>共用体变量的长度等于<strong>最长成员</strong>所占的字节数。</li>
            <li>同一时刻只能有一个成员有效——给一个成员赋值会覆盖其它成员。</li>
            <li>用途：节省内存，实现数据类型的“共用”。</li>
          </ul>

          <h4>2. 枚举类型（enum）</h4>
          <ul class="key-list">
            <li>定义：<code>enum Weekday { sun, mon, tue, wed, thu, fri, sat };</code></li>
            <li>枚举元素是常量，按顺序默认取值为 0、1、2、…；也可以人为指定初值。</li>
            <li>枚举变量只能取枚举列表中的值，不能直接赋整数（需强制转换）。</li>
            <li>枚举值可以参与比较和输出（输出的是整数）。</li>
          </ul>

          <h4>3. typedef 声明新类型名</h4>
          <ul class="key-list">
            <li>作用：为已有的数据类型起一个别名。<code>typedef int INTEGER;</code> 之后 <code>INTEGER a;</code> 等价于 <code>int a;</code>。</li>
            <li>常用于简化结构体定义：<code>typedef struct Student { … } STU;</code> 之后可以直接写 <code>STU s1;</code>。</li>
          </ul>
        `,
        codes: [
          {
            title: '共用体与枚举演示',
            code: String.raw`#include <stdio.h>

union Data
{
    int   i;
    char  ch;
};                          /* 长度取最长成员：4 字节 */

enum Color { RED, GREEN, BLUE };

int main(void)
{
    union Data d;
    enum Color c;

    printf("sizeof(union Data) = %d\n", (int)sizeof(d));   /* 4 */

    d.i = 65;
    printf("d.i = %d\n", d.i);
    d.ch = 'A';             /* 赋值会覆盖之前的 i */
    printf("d.ch = %c\n", d.ch);

    c = GREEN;              /* 枚举值默认从 0 开始 */
    printf("GREEN = %d\n", c);        /* 1 */
    printf("BLUE  = %d\n", BLUE);     /* 2 */

    return 0;
}`
          }
        ]
      }
    ]
  },

  /* ======================================================================
     第 10 章　文件
     ====================================================================== */
  {
    id: 'ch10',
    no: '第10章',
    title: '文件',
    desc: '掌握文件的基本概念、文件指针，文件的打开与关闭，以及字符、字符串、格式化数据的读写和文件的随机定位。',
    sections: [
      {
        id: 'ch10-s1',
        title: '10.1 文件的基本概念与文件指针',
        content: String.raw`
          <h4>1. 文件的分类</h4>
          <ul class="key-list">
            <li>按存储形式：<strong>ASCII 文件</strong>（文本文件，按字符存储）与<strong>二进制文件</strong>（按内存中的二进制形式存储）。</li>
            <li>按处理方式：缓冲文件系统与非缓冲文件系统，C 语言采用缓冲文件系统。</li>
            <li>文件结束标志：EOF，其值为 <strong>-1</strong>，定义在 <code>&lt;stdio.h&gt;</code> 中。</li>
          </ul>

          <h4>2. 文件指针</h4>
          <ul class="key-list">
            <li>C 语言用 <code>FILE</code> 结构体类型描述文件信息，需要包含 <code>&lt;stdio.h&gt;</code>。</li>
            <li>定义形式：<code>FILE *fp;</code>，fp 称为文件指针。</li>
            <li>对文件的所有操作都通过文件指针进行。</li>
          </ul>
        `,
        codes: []
      },
      {
        id: 'ch10-s2',
        title: '10.2 文件的打开与关闭',
        content: String.raw`
          <h4>1. fopen 与 fclose</h4>
          <pre><code>fp = fopen("文件名", "使用方式");
if (fp == NULL) { /* 打开失败的处理 */ }
...
fclose(fp);</code></pre>

          <h4>2. 使用方式（必背）</h4>
          <table>
            <thead><tr><th>方式</th><th>含义</th><th>说明</th></tr></thead>
            <tbody>
              <tr><td>"r"</td><td>只读</td><td>文件必须存在，否则返回 NULL</td></tr>
              <tr><td>"w"</td><td>只写</td><td>文件不存在则建立，存在则<strong>清空</strong></td></tr>
              <tr><td>"a"</td><td>追加</td><td>在文件末尾添加数据</td></tr>
              <tr><td>"rb" / "wb"</td><td>二进制读 / 写</td><td>用于二进制文件</td></tr>
              <tr><td>"r+"</td><td>读写</td><td>文件必须存在</td></tr>
              <tr><td>"w+"</td><td>读写</td><td>先清空文件</td></tr>
            </tbody>
          </table>

          <div class="tip tip-warn">易错点：用 <code>"w"</code> 方式打开一个已存在的文件，会<strong>把原内容全部清除</strong>；若想保留原内容并在后面追加，必须用 <code>"a"</code>。曾有很多人因此丢掉数据。</div>
        `,
        codes: [
          {
            title: '打开文件并判断是否成功',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    FILE *fp;

    /* 以"写"方式打开，文件不存在会自动创建 */
    fp = fopen("test.txt", "w");

    if (fp == NULL)                 /* 打开失败一定要判断 */
    {
        printf("文件打开失败！\n");
        exit(1);                    /* 退出程序 */
    }

    fprintf(fp, "Hello File\n");    /* 向文件写数据 */
    fputs("第二行内容\n", fp);

    fclose(fp);                     /* 使用完必须关闭 */

    printf("写入完成，请查看 test.txt\n");

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch10-s3',
        title: '10.3 文件的顺序读写',
        content: String.raw`
          <h4>常用读写函数</h4>
          <table>
            <thead><tr><th>函数</th><th>功能</th></tr></thead>
            <tbody>
              <tr><td><code>fputc(ch, fp)</code></td><td>写一个字符到文件</td></tr>
              <tr><td><code>fgetc(fp)</code></td><td>从文件读一个字符</td></tr>
              <tr><td><code>fputs(s, fp)</code></td><td>写一个字符串到文件</td></tr>
              <tr><td><code>fgets(s, n, fp)</code></td><td>从文件读 n-1 个字符（含换行）</td></tr>
              <tr><td><code>fprintf(fp, 格式, ...)</code></td><td>格式化写（与 printf 类似，多一个文件指针）</td></tr>
              <tr><td><code>fscanf(fp, 格式, ...)</code></td><td>格式化读（与 scanf 类似）</td></tr>
              <tr><td><code>fread / fwrite</code></td><td>按数据块读写二进制数据</td></tr>
            </tbody>
          </table>

          <div class="tip tip-ok">判断文件是否结束要用 <code>feof(fp)</code>（返回非 0 表示已到文件末尾），<strong>不能</strong>用 <code>EOF</code> 直接判断所有情况。循环读文件的标准写法：<code>while (!feof(fp)) { ch = fgetc(fp); … }</code>。</div>
        `,
        codes: [
          {
            title: '写文件并读回显示',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    FILE *fp;
    char ch;

    /* 一、写入：把 26 个大写字母写入文件 */
    fp = fopen("alpha.txt", "w");
    if (fp == NULL) { printf("打开失败\n"); exit(1); }

    for (ch = 'A'; ch <= 'Z'; ch++)
        fputc(ch, fp);              /* 一次写一个字符 */

    fclose(fp);

    /* 二、读取：把文件内容显示到屏幕 */
    fp = fopen("alpha.txt", "r");
    if (fp == NULL) { printf("打开失败\n"); exit(1); }

    while ((ch = fgetc(fp)) != EOF) /* 读到文件末尾结束 */
        putchar(ch);
    putchar('\n');

    fclose(fp);

    return 0;
}`
          },
          {
            title: '用 fprintf / fscanf 读写格式化数据',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    FILE *fp;
    int   num;
    char  name[20];
    float score;

    /* 写入一行记录 */
    fp = fopen("score.txt", "w");
    if (!fp) exit(1);

    fprintf(fp, "%d %s %.1f\n", 1001, "张三", 92.5);
    fprintf(fp, "%d %s %.1f\n", 1002, "李四", 88.0);
    fclose(fp);

    /* 读出所有记录 */
    fp = fopen("score.txt", "r");
    if (!fp) exit(1);

    printf("学号\t姓名\t成绩\n");
    while (fscanf(fp, "%d %s %f", &num, name, &score) == 3)
        printf("%d\t%s\t%.1f\n", num, name, score);

    fclose(fp);

    return 0;
}`
          }
        ]
      },
      {
        id: 'ch10-s4',
        title: '10.4 文件的随机读写与定位',
        content: String.raw`
          <h4>三个定位函数</h4>
          <ul class="key-list">
            <li><code>fseek(fp, 位移量, 起始点)</code>：把文件位置指针移动到指定位置。</li>
            <li>起始点：<code>SEEK_SET</code>（文件开头，0）、<code>SEEK_CUR</code>（当前位置，1）、<code>SEEK_END</code>（文件末尾，2）。</li>
            <li><code>ftell(fp)</code>：返回当前位置相对于文件开头的字节数（常用于求文件长度）。</li>
            <li><code>rewind(fp)</code>：把文件指针重新移到文件开头。</li>
            <li>位移量要求为 <strong>long</strong> 型数据，文件长度用 <code>ftell(f, 0L, SEEK_END)</code> 配合求得。</li>
          </ul>

          <h4>文件读写出错检测</h4>
          <ul class="key-list">
            <li><code>feof(fp)</code>：判断文件是否结束。</li>
            <li><code>ferror(fp)</code>：判断文件操作是否出错，返回非 0 表示出错。</li>
            <li><code>clearerr(fp)</code>：使文件错误标志和文件结束标志置为 0。</li>
          </ul>
        `,
        codes: [
          {
            title: 'fseek 定位与 ftell 求文件长度',
            code: String.raw`#include <stdio.h>
#include <stdlib.h>

int main(void)
{
    FILE *fp;
    long len;

    /* 先写点内容 */
    fp = fopen("data.txt", "wb");
    if (!fp) exit(1);
    fputs("0123456789", fp);

    /* 求文件长度 */
    fseek(fp, 0L, SEEK_END);        /* 移到文件末尾 */
    len = ftell(fp);                /* 当前位置即文件长度 */
    printf("文件长度 = %ld 字节\n", len);   /* 10 */

    /* 定位到第 6 个字节，读取后续内容 */
    rewind(fp);                     /* 回到文件开头 */
    fseek(fp, 6L, SEEK_SET);        /* 从开头偏移 6 个字节 */
    printf("从第 6 字节开始的内容：");
    int ch;
    while ((ch = fgetc(fp)) != EOF)
        putchar(ch);                /* 输出 6789 */
    putchar('\n');

    fclose(fp);

    return 0;
}`
          }
        ]
      }
    ]
  }

]);
