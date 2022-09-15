---
title: "Expression Problem (1): 从 Pattern Matching 到 Visitor Pattern"
---

# Expression Problem (1): 从 Pattern Matching 到 Visitor Pattern

本来我是想直接从 LLVM's style RTTI 开始讲 AST 的实现 idiom 的, 不过稍微研究了一下发现, AST 的设计模式 (pattern) 本身也很值得研究. 所以我临时改了主意, 我打算以 expression problem 为引, 先讲一些有趣的东西.

## Expression Problem

Expression problem 是一个讨论各种编程范式 (programming paradigms) 和编程语言的优劣势时常用的例子. 它由 Philip Wadler 在 Rice University's Programming Language Team (就是 Racket aka. PLT Scheme 的那个 PLT) 的一次[讨论]中提出.

[讨论]: http://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt

> The goal is to define a datatype by cases, where one can add new cases to the
> datatype and new functions over the datatype, without recompiling existing
> code, and while retaining static type safety (e.g., no casts).

一言以蔽之, 扩展性 (extensibility) 和静态类型安全 (type safe).

下面我举两个不同类型的语言的例子:

## 例子 1: 用 ADT 实现 AST

考虑这样一个语言: 它由整数字面量 (literal) 和 `+` 运算符组成, 它的 AST 在 Haskell 里可以被这样表示:

    data Expr where
      Lit :: Int -> Expr
      Add :: Expr -> Expr -> Expr

`Expr` 类型拥有 `Lit` 和 `Add` 两个 data constructor.

现在我们给这个语言写一个 interpreter:

    eval :: Expr -> Int
    eval (Lit n)   = n
    eval (Add l r) = eval l + eval r

有了上边这些 “已有代码” 之后, 我们开始考虑 expression problem 中的问题. 首先, 尝试给 `Expr` 增加一个新的函数, 用于打印整棵 AST.

    dump :: Expr -> String
    dump (Lit n)   = "(Lit " ++ show n ++ ")"
    dump (Add l r) = "(Add " ++ dump l ++ " " ++ dump r ++ ")"

还很容易.

但当我们试图给 `Expr` 新增一个构造时候, 问题就被暴露出来了. 我们必须给 `Expr` 添上一个新的 data constructor, 意味着需要修改原有代码:


                 data Expr where
                   Lit :: Int -> Expr
                   Add :: Expr -> Expr -> Expr
    /*addition*/   Sub :: Expr -> Expr -> Expr


由于 `eval` 和 `dump` 函数都是用 pattern matching 实现的, 这些函数也必须对 `Sub` 进行补充.

                 eval :: Expr -> Int
                 eval (Lit n)   = n
                 eval (Add l r) = eval l + eval r
    /*addition*/ eval (Sub l r) = eval l - eval r

                 dump :: Expr -> String
                 dump (Lit n)   = "(Lit " ++ show n ++ ")"
                 dump (Add l r) = "(Add " ++ dump l ++ " " ++ dump r ++ ")"
    /*addition*/ dump (Sub l r) = "(Sub " ++ dump l ++ " " ++ dump r ++ ")"

## 例子 2: 用 Subtyping 实现 AST

接下来我们换一门 OOP 语言 Swift.

    protocol Expr {
        func eval() -> Int
    }

    class Lit: Expr {
        let n: Int
        func eval() -> Int { n }
    }

    class Add: Expr {
        let left, right: Expr
        func eval() -> Int { left.eval() + right.eval() }
    }

巧的是, 和 Haskell 恰恰相反, 当我们想给 `Expr` 新增一个构造 `Sub` 时, 要做的只是添加一个新的类 `Sub`, 完全不用改动已有的代码.

    class Sub: Expr {
        let left, right: Expr
        func eval() -> Int { left.eval() - right.eval() }
    }

但添加新函数 `dump` 时, 反而要改动很多地方.

                 protocol Expr {
                     func eval() -> Int
    /*addition*/     func dump() -> String
                 }

                 class Lit: Expr {
                     let n: Int
                     func eval() -> Int { n }
    /*addition*/     func dump() -> String { "(Lit \(n))" }
                 }

                 class Add: Expr {
                     let left, right: Expr
                     func eval() -> Int { left.eval() + right.eval() }
    /*addition*/     func dump() -> String { "(Add \(left) \(right))" }
                 }

                 class Sub: Expr {
                     let left, right: Expr
                     func eval() -> Int { left.eval() - right.eval() }
    /*addition*/     func dump() -> String { "(Sub \(left) \(right))" }
                 }

其中的原因不难理解. 类的继承 (inherit) 是 “open” 的, 而 sum type 则是 “closed” 的, 编译器能处理好 dynamic dispatch 和 RTTI, 却无法自动为 pattern matching 添加分支代码, 因此 OOP 的实现在新增构造时更容易. 另一边, 在 OOP 语言中, 每个函数中蕴含的逻辑和它的构造耦合在一起, 需要新增函数时, 我们就必须把对应的逻辑逐个插入到不同的类中, 因此使用 ADT 的语言新增函数更容易. 这两类语言的 idiom 各自解决了 expression problem 的一半.

Swift 有类扩展 (extension) 的功能, 能扩展一个已有的类型, 可以直接解决这个问题. 不过这不是我们今天的重点, 因此你需要暂时先把它假想成 Java 那样的语言.

## Visitor Pattern

既然造成 OOP 语言新增函数困难的罪魁祸首是: 每个构造都和处理它的不同逻辑相耦合, 那我们把它解耦不就好了? 以下边这段代码为例, 我们是不是可以考虑把 `eval` 和 `dump` 函数共性的东西提取出来, 抽象成一个新接口?

                class Add: Expr {
                    let left, right: Expr
    /*deletion*/     func eval() -> Int { left.eval() + right.eval() }
    /*deletion*/     func dump() -> String { "(Add \(left) \(right))" }
    /*addition*/     func someInterface() -> SomeType { ... }
                }

这就是访问者模式 (visitor pattern) 的原理.

    protocol Expr {
        func visited<V>(by visitor: V) -> V.Result where V : Visitor
    }

    protocol Visitor {
        associatedtype Result
        func lit(_ literal: Lit) -> Result
        func add(_ add: Add) -> Result
    }

    class Lit: Expr {
        let n: Int
        func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.lit(self)
        }
    }

    class Add: Expr {
        let left, right: Expr
        func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.add(self)
        }
    }

现在, 我们为 `Expr` 实现一个 “访问者” `Eval` 作为例子:

    class Eval: Visitor {
        typealias Result = Int
        func lit(_ literal: Lit) -> Int {
            literal.n
        }
        func add(_ add: Add) -> Int {
            add.left.visited(by: self) + add.right.visited(by: self)
        }
    }

类似地, 实现 `Dump` 也不是件难事

    class Dump: Visitor {
        typealias Result = String
        func lit(_ literal: Lit) -> String {
            "(Lit \(literal.n))"
        }

        func add(_ add: Add) -> String {
            "(Add \(add.left.visited(by: self)) \(add.right.visited(by: self)))"
        }
    }

让我们把视线拉回到 Haskell 的 `eval` 实现上

    eval :: Expr -> Int
    eval (Lit n)   = n
    eval (Add l r) = eval l + eval r

容易观察到, Swift 中的 `Eval` 和 Haskell 中的 `eval` 在形式上是一致的, 其实 visitor pattern 之于 GoF, 就相当于 pattern matching 之于 ADT. 当然, 这么说同时也就意味着, visitor pattern 并不是一个 expression problem 的合格解, `Visitor` 的域就像 ADT 的 data constructor 一样, 想要扩展它们, 除了修改源码外别无他法.

                 protocol Visitor {
                     associatedtype Result
                     func lit(_ literal: Lit) -> Result
                     func add(_ add: Add) -> Result
    /*addition*/     func sub(_ sub: Sub) -> Result
                 }

这似乎是件蠢事, 把 subtyping 实现方式的缺陷转换成了 ADT 实现方式的缺陷, 却没有解决实质问题.

事实确实如此, 但我之所以要花长篇幅介绍 visitor pattern, 还有些潜在的原因:

-   实现 visitor pattern 不需要足够好的类型系统, 也不需要 ADT 和 pattern matching 这类 ML 家族语言的特性, 只要支持 dynamic dispatch 就可以, 不少比较落后的语言也能做到.
-   真正实现编译器或解释器时并不需要解决 expression problem, 适当的修改已有代码不是坏事, 那些真正解决了 expression problem 的方案反而可能会让项目架构变得混乱.
-   Visitor pattern 可以和一些 OOP 的辅助设施融洽相处, 更充分地发挥类的潜在威力.

接下来我会介绍一些 visitor pattern 实现的细节, 如果你只对 expression problem 相关的内容感兴趣, 可以跳过后半部分, 等下一篇文章<!-- TODO -->.

## Visitor Pattern 和多级 AST

上文中出现的 AST 是一个比较理想化的例子, 它的层次结构极其简单 (下例左), 这在任何语言的编译器中都几乎是不可能出现的情况. 为了模拟真实情况, 我把 `Add` 和 `Sub` 另划一类, 加入了用于统一表示二元运算符的层次 `Op` (下例右).

    Expr           Expr
    |-Lit          |-Lit
    |-Add          `-Op
    `-Sub            |-Add
                     `-Sub

对 Haskell 来说, 只要设置双层的 ADT 就可以了.

    data Expr where
    Lit :: Int -> Expr
    Op :: Op -> Expr

    data Op where
    Add :: Expr -> Expr -> Op
    Sub :: Expr -> Expr -> Op

实现 `eval` 函数时, 也需要双层的 pattern matching.

    eval :: Expr -> Int
    eval (Lit n) = n
    eval (Op op) =
      case op of (Add l r) -> eval l + eval r
                 (Sub l r) -> eval l - eval r

这种层次结构在实践中很有必要, 因为当 AST 足够复杂时, 会需要一些辅助函数, 这些函数并不都是针对 `Expr` 的, 有可能只适用于 `Op`, 如果这时候 `Add` 和 `Sub` 没有被单独划为一类, 而是和其他 `Expr` 一样放在一起, 类型检查器就无法有效地工作. 你可能会写出这样的代码:

                 commutative :: Expr -> Bool
                 commutative (Add _ _) = True
                 commutative (Sub _ _) = False
    /*addition*/ commutative (Lit _)   = error "not an operator" -- No, ⊥!

虽然我有让你必须这么做的理由, 但也不得不承认, Haskell 的实现有些恼人. 如果你想构造一个 `Op` 类型的实例, 写法将会是 `(Op (Add l r))` 而不是 `(Add l r)`, 随着 AST 层级结构越来越多, 这个套娃也会越来越臃肿, 每一层的名字都会参与到这个构造过程中. 想象一下, 在一门更复杂的语言里, 你很有可能会遇到 `(Ast (Expr (BinOp (Add (Lit (Num (Int 1))) (Lit (Num (Int 2)))))))` 这样的构造, 而这个庞然大物却仅仅是一个加法运算的 AST 节点. 这些层叠的结构名会喧宾夺主, 让人很难理清这段代码到底在构造什么.

    eval (Add (Add (Lit 1) (Lit 2)) (Lit 3))           -- 增加层级结构前
    eval (Op (Add (Op (Add (Lit 1) (Lit 2))) (Lit 3))) -- 增加层级结构后

而 Swift 中使用 visitor pattern 的实现就没有这个问题, 因为 class hierarchy 会以 RTTI 的形式隐晦地存在于代码中, `Add` 当然可以既是 `Op` 的 subtype, 又同时是 `Expr` 的 subtype.

    protocol Expr {
        func visited<V>(by visitor: V) -> V.Result where V : Visitor
    }

    protocol Visitor {
        associatedtype Result

        func expr(_ expr: Expr) -> Result
        func lit(_ literal: Lit) -> Result
        func op(_ op: Op) -> Result
        func add(_ add: Add) -> Result
        func sub(_ sub: Sub) -> Result
    }

    class Lit: Expr {
        let n: Int
        func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.lit(self)
        }

        init(_ n: Int) {
            self.n = n
        }
    }

    class Op: Expr {
        let left, right: Expr
        func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.op(self)
        }
        init(_ left: Expr, _ right: Expr) {
            self.left = left
            self.right = right
        }
    }

    class Add: Op {
        override func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.add(self)
        }
    }

    class Sub: Op {
        override func visited<V>(by visitor: V) -> V.Result where V : Visitor {
            visitor.sub(self)
        }
    }

    class Dump: Visitor {
        typealias Result = String
        func expr(_ expr: Expr) -> String {
            "(Expr)"
        }
        func lit(_ literal: Lit) -> String {
            "(Lit \(literal.n))"
        }
        func op(_ op: Op) -> String {
            "(Op \(op.left.visited(by: self)) \(op.right.visited(by: self)))"
        }
        func add(_ add: Add) -> String {
            "(Add \(add.left.visited(by: self)) \(add.right.visited(by: self)))"
        }
        func sub(_ sub: Sub) -> String {
            "(Sub \(sub.left.visited(by: self)) \(sub.right.visited(by: self)))"
        }
    }

到目前为止, 类的威力还没有完全展露, 现在, 我们给 `Visitor` 接口增加一系列默认实现, 当一个访问器不被 override 所定制时, 它总是会默认地调用它上一级层次结构的访问器.

    extension Visitor {
        func lit(_ literal: Lit) -> Result { self.expr(literal) }
        func op(_ op: Op) -> Result { self.expr(op) }
        func add(_ add: Add) -> Result { self.op(add) }
        func sub(_ sub: Sub) -> Result { self.op(sub) }
    }

如果加入一个新的 AST 节点 `Multi`.

                 extension Visitor {
                     func lit(_ literal: Lit) -> Result { self.expr(literal) }
                     func op(_ op: Op) -> Result { self.expr(op) }
                     func add(_ add: Add) -> Result { self.op(add) }
                     func sub(_ sub: Sub) -> Result { self.op(sub) }
    /*addition*/     func multi(_ multi: Multi) -> Result { self.op(sub) }
                 }

    /*addition*/ class Multi: Op {
    /*addition*/     override func visited<V>(by visitor: V) -> V.Result where V : Visitor {
    /*addition*/         visitor.multi(self)
    /*addition*/     }
    /*addition*/ }


在没有修改 `Dump` visitor 的情况下, 程序并没有发生错误, `Visitor.multi` 调用了它的默认实现, 用 `Dump.op` 打印出了一个 “虽然不那么漂亮, 但仍然好用” 的结果.

    Multi(Lit(1), Add(Lit(2), Lit(3)))
        .visited(by: Dump())
    // Print "(Op (Lit 1) (Add (Lit 2) (Lit 3)))"

你会发现, 在 visitor pattern 中, 你可以很好地控制程序的粒度. 假设我们现在需要一个 `Count` visitor 来计算 AST 的节点数量, 对 `Op` 来说, 我们就不需要知道它具体是 `Add` 还是 `Sub`, 只取得它的左右子树. 这时我们可以不必 override `Visitor.add` 和 `Visitor.sub`, 关注更粗粒度的 `Visitor.op` 就可以了.

    class Count: Visitor {
        typealias Result = Int
        func expr(_ expr: Expr) -> Int { fatalError("unreachable") }
        func lit(_ literal: Lit) -> Int { 1 }
        func op(_ op: Op) -> Int {
            1 + op.left.visited(by: self) + op.right.visited(by: self)
        }
    }

    Add(Lit(1), Multi(Lit(2), Lit(3))).visited(by: Count()) // Print "5"

## ADT 和 Subtyping 之间一点微妙的关系

在用 Haskell 中实现 `Op` 时, 有两种可选的方案:

    -- (1)
    data Expr where
    Op :: Op -> Expr
    ...
    data Op where
    Add :: Expr -> Expr -> Op
    Sub :: Expr -> Expr -> Op
    Multi :: Expr -> Expr -> Op

    -- (2)
    data Expr where
    Op :: OpExpr -> Expr
    ...
    data OpExpr where
    OpExpr :: Op -> OpExpr
    data Op where
    Add :: Op
    Sub :: Op
    Multi :: Op

这两种方案理论上是等价的, 但我们应该选择哪种呢?

我更推荐后者.

假设我们现在需要一个 `getFirstOperand` 函数来获取 `Op` 的第一个操作数, 这两种方案对应的函数分别是:

    -- (1)
    getFirstOperand :: Op -> Expr
    getFirstOperand (Add l _) = l
    getFirstOperand (Sub l _) = l
    getFirstOperand (Multi l _) = l

    -- (2)
    getFirstOperand :: Op -> Expr
    getFirstOperand (OpExpr l _) = l

你会发现, 前者总是被迫去关注所有类型的节点, 而后者则可以视实际情况选择, 当不需要关心 `Op` 究竟是什么时, 后者总是能提供更简洁的代码.

如果你读过 *Type and Programming Language*, 你应该记得, 书中示例代码中的 AST 用的就是前者这种糟糕的设计, 它的每个 AST 节点的 data constructor 都有一个用于表示源码位置信息的 `info` 参数.

    type term = TmTrue   of info
              | TmFalse  of info
              | TmIf     of info * term * term * term
              | TmZero   of info
              | TmSucc   of info * term
              | TmPred   of info * term
              | TmIsZero of info * term

如果我们想写一个 `get_info` 函数, 恐怕要写成这样:

    let get_info t =
        match t with TmTrue(info)     = info
                   | TmFalse(info)    = info
                   | TmIf(info,_,_,_) = info
                   | TmZero(info)     = info
                   | TmSucc(info,_)   = info
                   | TmPred(info,_)   = info
                   | TmIsZero(info,_) = info

当然, 作为例子是没问题的, 但如果你在写一个正式的编译器, 可能就需要好好考虑一下了.

这个问题在 OOP 中同样存在, 想一想, 下边哪种的写法在 Swift 中才是更可取的, 为什么?

    // (1)
    class Op: Expr { let left, right: Expr }
    class Add: Op {}
    class Sub: Op {}

    // (2)
    class Op: Expr {}
    class Add: Op { let left, right: Expr }
    class Sub: Op { let left, right: Expr }

## 结尾

接下来的一周我不会继续写 expression problem 的文章了, 可能会在下边的话题里选一个:

-   C++ RTTI 和 LLVM's style RTTI
-   使用 LLVM 工具将源文件读入内存
