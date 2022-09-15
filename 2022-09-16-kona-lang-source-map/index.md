---
title: "Konac 杂记 (1): 源码管理器"
---

# Konac 杂记 (1): 源码管理器

Kona 是我目前正在实现的语言, 在计划中, 它是一个 ML 家族的方言, 语法和 Standard ML 相似, 但会额外支持行多态 (row polymorphism) 和多态变体 (polymorphic variant). 不过截止到当前, 我连词法解析器都还没开始写, 所以这里就不花篇幅介绍了, 你只需要知道 "Konac" 是一个编译器/解释器就好.

## 源码管理器

考虑一下, 如果我们想要输出像 Rustc 这样的诊断, 都需要什么样的位置信息?

<pre><code><strong style="color:red">error[E0277]</strong>: cannot add `&str` to `{integer}`
<strong style="color:blue"> --&gt;</strong> src/main.rs:2:15
<strong style="color:blue">  |</strong>
<strong style="color:blue">2 |</strong>     let x = 1 + "one";
<strong style="color:blue">  |</strong>               <strong style="color:red">^ no implementation for `{integer} + &str`</strong>
<strong style="color:blue">  |</strong>
<strong style="color:blue">  =</strong> help: the trait `Add<&str>` is not implemented for `{integer}`
</code></pre>

有几个显而易见的答案:

1. 我们需要知道发生错误的源文件的名字 (`src/main.rs`);
2. 我们需要知道错误发生在哪一行 (`2`) 哪一列 (`15`);
3. 我们需要知道发生错误的那一行的全部源码 (`    let x = 1 + "one";`);

在 Kona 的语法树中, 每个 token 乃至语法节点, 都需要一对这样的位置信息来表示它们的起止位置. 如果直接存储全部的这些内容, 就会造成巨大的空间浪费. 我们需要一个缓存机制, 让我们能用更小巧的方式来定位源码, 在需要时也可以获得完整的信息, 这时候就需要源码管理器啦!

源码管理器会给每个位置分配一个全局唯一的整数 `Pos(u32)`, 通过源码管理器, 我们能以较小的开销获得一个 `Pos(u32)` 对应的文件名、行号、列号等信息. 类似地, `Span(u32..u32)` 是由一对 `Pos` 组成的区间, 你可以通过源码管理器获取这个区间对应的源码.

<img src="images/source-manager.jpg" />

在 Konac 中, 源码管理器所需的一切信息, 都被保存在一个叫做 `SourceMap` 的结构体中. 如果把 `SourceMap` 比作一个巨大的, 横跨多个文件的字符串, 那 `Pos` 就是这个字符串的索引.

    source_map.query_info(pos)
    // PosInfo {
    //     file_name: "src/main.rs",
    //     line: 2,
    //     column: 15,
    //     ..
    // }

    source_map.query_line(pos)
    // 2

    source_map.query_column(pos)
    // 15

    source_map.query_source(start..end)
    // "let x = 1 + \"one\""

## 它在哪个文件里
