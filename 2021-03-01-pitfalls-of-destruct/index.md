# 解构赋值的陷阱

有解构赋值的语言都支持一种诡异的写法来交换两个变量的值:

    a, b = b, a

其实, 这里有一个隐晦的小问题. 考虑下边这段 Swift 代码:

    (a, b) = (c, d)

它的访问顺序是 `c` → `d` → `a` → `b`. 在支持带副作用 (side effect) 的计算属性 (computed property) 的 Swift 中, 保证这个顺序是非常重要的.

我不知道你有没有发现这个问题, 编译器不能直接把 `c` 赋给 `a`, 再把 `d` 赋给 `b`, 否则访问顺序就变成 `c` → `a` → `d` → `b` 了. 唯一可行的办法是创建两个临时变量 `e` 和 `f`, 将 `c` 放进 `e`, `d` 放进 `f`, 再将 `e` 放进 `a`, `f` 放进 `b`, 访问顺序是 `c` → `e` → `d` → `f` → `e` → `a` → `f` → `b`. 删掉其中的 `e` 和 `f` 后, 才刚好符合要求.

不幸的是, 编译器常常没法优化掉这里的额外开销. 如果你肯用传统的办法交换对象, 或使用标准库内置的 `swap` 函数, 你可能只需要一个临时变量, 而不是两个:

    let tmp = a
    a = b
    b = tmp

不要小看这个临时变量的开销喔, 如果你在写一个通用型数据结构, 不知道元素的大小, 还是考虑一下后者这种淳朴的写法叭! 当然, 如果只是普通场景, 怎么写都无所谓啦, 毕竟开心才最重要嘛.

这是 Swift 标准库中 `MutableCollection` 的 `swapAt` 函数的实现:

    @inlinable
    public mutating func swapAt(_ i: Index, _ j: Index) {
        guard i != j else { return }
        let tmp = self[i]
        self[i] = self[j]
        self[j] = tmp
    }

**思考题**: 可以用 `swap(&self[i], &self[j])` 简化它么? 为什么? 那 `(self[i], self[j]) = (self[j], self[i])` 呢? 它们有什么本质区别?