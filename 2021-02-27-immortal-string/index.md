# 妹之弦

字符串驻留 (string interning) 是项非常普遍的技术, 几乎所有的现代语言都有类似的优化. 之所以要把和这个所有人都知道的东西拿出来再说一遍, 只因为我最近很喜欢 “妹之弦” 梗.

## いもうと

在 Swift 的标准库实现中, 驻留的字符串被称为 “immortal (不朽的)”, 刚好和 “妹 (いもうと)” 同音, 而 “string” 则可以译为 “弦” (比如弦理论就是 string theory 喵), 因此我就把字符串驻留称为 “妹之弦” 了.

## Symbol

妹之弦是一种让字符串拥有部分指针的性质的手段.

以指针比较 (pointer comparison) 为例. 当你能保证一些值和指向它们的指针总能保持双射 (bijection) 关系时, 那判断这些值是否相等的过程就可以简化为对它们的指针的比较. 假设有如下三个字符串:

    const char *a = "AAAAA";
    const char *b = "BBBBB";
    const char *c = "CCCCC";

判断两个长度为 $n$ 的字符串是否相等的普适算法的复杂度是 $O(n)$:

    bool is_equal(const char *s1, const char *s2) {
        while (*s1 == *s2++)
            if (*s1++ == 0)
                return true;
        return false;
    }

但如果仅考虑 Pointer = \{`a`, `b`, `c`\}, 它们和 String = \{`"AAAAA"`, `"BBBBB"`, `"CCCCC"`\} 保持双射关系, 可以作为后者的索引族 (indexed family). 因此, 比较字符串相等性的工作就可以简化为比较指针的相等性了, 复杂度是 $O(1)$:

    bool is_equal(const char *s1, const char *s2) {
        return s1 == s2;
    }

对于编译期已知的静态字符串, 它们会被放在文字常量区 (literal constant area) 里, 编译器不会重复存储它们.

    const char *a = "AAAAAAAAAA";
    const char *b = "AAAAAAAAAA";
    
    printf("%p, %p\n", a, b); // Print "0x100003f9a, 0x100003f9a"

换句话说, 在一些动态语言里, 如果你使用字符串充当枚举 (enumeration), 性能并不会因此而打折扣.

    let fruit = { type: "apple", ... }
    if (fruit.type == "apple" || fruit.type == "orange") // 和枚举类型一样高效
        do something ...

这就是 Lisp (以及 Erlang, Elixir, Ruby) 里 symbol 的本质, 虚拟机会维护一个字符串驻留池 (string intern pool), 不管是调用 `symbol->string` 和 `string->symbol`, 还是享受 $O(1)$ 的时空开销, 都可以各得其所.

# 终

因为仅仅只是想玩下梗, 不是技术性文章, 所以本文到此就结束啦!
