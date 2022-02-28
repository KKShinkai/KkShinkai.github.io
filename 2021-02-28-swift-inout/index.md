# Swift 中 `inout` 参数的求值策略

## 传引用调用

故事要从 Python, Java, JavaScript 这类语言的求值策略 (evaluation strategy) 说起, 它们是典型的传共享对象调用 (call by shared object) 的语言, 以 JavaScript 为例:

    function example(xs) {
        xs = [2, 3, 4]
    }

    let ys = [1, 2, 3]
    example(ys)
    console.log(ys) // Print "[1, 2, 3]"

在 `example` 函数中, 形式参数 `xs` 被改成了 `[2, 3, 4]`, 但调用后, `ys` 的值却没有变.

如果拿一段看起来差不多的 C++ 代码来对比

    void example(std::array<int, 3> &xs) {
        xs = {2, 3, 4};
    }

    std::array<int, 3> ys = {1, 2, 3};
    example(ys);
    support::fmt("{}", ys); // Print "[2, 3, 4]"

你会发现它们做的根本不是一件事. 参照下边的这三个函数, 也许你能弄清楚这里发生了什么.

    int i = 42;

    void callValue(int value_object) {
        value_object = i;
    }

    void callSharedObject(int *shared_object) {
        shared_object = &i;
    }

    void callReference(int *reference) {
        *reference = i;
    }

    int x = 0;

    callValue(x);
    printf("%d\n", x); // Print "0"

    callSharedObject(&x);
    printf("%d\n", x); // Print "0"

    callReference(&x);
    printf("%d\n", x); // Print "42"

换句话说, 如果你想传递引用, 语言内部就必须或显式或隐晦地提供解引用 (dereference) 的方法, 像 C 语言里的 `*` 操作符那样; 否则对参数赋值就只会让它指向其他地方, 却不能造成原数据的修改.

Swift 的 `class` 类型就是传共享对象调用的, 但为了避免上边 JavaScript 中那样令人费解的代码, Swift 的参数被设计为不可变的.

    func call(_ sharedObject: NSArray) {
        sharedObject = [2, 3, 4]
        // Error: Cannot assign to value: 'ref' is a 'let' constant
    }

如果你想要改变 `sharedObject` 对应的实际参数的值, 就到了使用 `inout` 参数的时候啦!

    func call(_ sharedObject: inout NSArray) {
        sharedObject = [2, 3, 4]
    }

    var array: NSString = [1, 2, 3]
    call(&array)
    print(array) // Print "(2, 3, 4)"

这么说, Swift 中的 `inout` 参数是传引用调用 (call by reference) 的喵? 并不, 这就要涉及到我想说的第二个问题了.

## 传副本恢复调用

Swift 中比 C++ 之类的语言多了计算属性 (computed property) 的概念. 以下边的这个 `Angle` 类型为例:

    struct Angle {
        var degree: Double = 0

        var radians: Double {
            set { degree = newValue / .pi * 180 }
            get { degree * .pi / 180 }
        }
    }

    var angle = Angle()
    angle.radians = 2.0 * .pi
    print(angle.degree) // Print "360.0"

这是个非常棒的特性, 你可以用 `angle.radians = ...` 语句来为 `radians` 赋值, 也可以读取它的值, Swift 会帮你调用 `radians` 的 `set(newValue)` 或 `get` 函数. 通过 `radians` 属性, 你可以以弧度制 (而不是角度制) 来操作 `Angle`, 但对 `Angle` 来说, 存储的数据始终都只有角度制的 `degree`, 不会额外浪费空间, 也不涉及数据同步性的问题.

我们把 `degree` 这样拥有自己的内存空间的对象称为物理对象 (physical object); 而把 `radians` 这样看起来和用起来都和物理对象无异, 但可能没有自己的内存空间的对象称为逻辑对象 (logical object). 这时候问题就出现了, 由于逻辑对象有时候没有自己的内存空间, 就谈不上指针和引用, 那当它作为 `inout` 参数被传递时, 求值策略该如何定义呢?

Swift 中 `inout` 参数的语义是传副本恢复调用 (call by value result), 过程是这样哒:

1.  当函数被调用时, 实际参数的值被拷贝 (copy);
2.  在函数体中, 对这个副本进行修改;
3.  当函数返回时, 将这个副本赋值给原来的实际参数;

我们能不能说, 在参数是物理对象时, Swift 是传引用调用的; 在参数的逻辑对象时, Swift 是传副本恢复调用的呢? 其实, 这可不是个好主意. 这就是我要说的第三个问题了.

如果我们把逻辑对象定义成: 不管看起来还是用起来都和物理对象一样的对象. 那不难想到, 物理对象完全能满足这个定义, 一个物理对象必然也是逻辑对象. 换句话说, 逻辑对象是物理对象的严格超集. 同理, 传副本恢复调用其实也是传引用调用的严格超集, 我们在 Swift 里根本就没必要提传引用调用这件事.

## 语义和实现

之前有人问过我这样一个问题: “既然 Swift 是传副本恢复调用的, 那为什么物理对象作为 `inout` 参数传入时, 生成的汇编 / LLVM IR 只传递了它的地址, 而没有拷贝的过程呢?”. 这就是典型的对 “语义 (semantics)” 的误解啦.

用通俗的话来讲, 语义只在意一个语言 “像什么”, 而编译器实现才在意一个语言 “是什么”. 传副本恢复调用可不会逼着编译器进行无意义的复制和写回, 只要结果没有问题, 那不管怎么优化都不关语义的事.

实际上, 通过汇编来反推语义是非常错误的行为. 举个例子, 当你声明了一个未被使用的变量时:

    let x = 42
    // Warning: Initialization of immutable value 'x' was never used.

编译器不会为这个语句生成任何代码. 想象一下, 这时候如果有人一本正经地说: “变量声明的语义需要分类讨论, 当变量未被使用时, 它的语义是什么都不做; 当变量被使用时, 它的语义是将值和标识符绑定”. 是不是有点滑稽.

所以呢, Swift 中 `inout` 参数的语义就是传副本恢复调用, 和传引用调用是完全没有关系哒.
