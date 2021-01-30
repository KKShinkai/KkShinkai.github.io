<img src="./cover.jpg" style="width: 100%" />

# Expression Problem (1): 从 Pattern Matching 到 Visitor Pattern

本来我是想直接从 LLVM's style RTTI 开始讲 AST 的实现 idiom 的, 不过稍微研究了一下发现, AST 的设计模式 (pattern) 本身也很值得研究. 所以我临时改了主意, 我打算以 expression problem 为引, 先讲一些有趣的东西.

## Expression Problem

Expression problem 是一个讨论各种编程范式 (programming paradigms) 和编程语言的优劣势时常用的例子. 它由 Philip Wadler 在 Rice University's Programming Language Team (就是 Racket aka. PLT Scheme 的那个 PLT) 的一次[讨论](http://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt)中提出.

表达式问题要解决的目标是:

> 在为一个数据类型定义不同的构造后, 可以在不修改已有代码的情况下增加新的构造和对应的函数, 并同时保持静态类型安全 (type safe).

下面我举两个不同家族的语言的例子:

## 例子 1: 用 ADT 实现 AST

考虑这样一个语言: 它由整数字面量 (literal) 和 `+` 运算符组成, 它的 AST 在 Haskell 里可以被这样表示:

```hs
data Expr where
  Lit :: Int -> Expr
  Add :: Expr -> Expr -> Expr
```

`Expr`{.hs} 类型拥有 `Lit`{.hs} 和 `Add`{.hs} 两个 data constructor.

现在我们给这个语言写一个 interpreter:

```hs
eval :: Expr -> Int
eval (Lit n)   = n
eval (Add l r) = eval l + eval r
```

有了上边这些 “已有代码” 之后, 我们开始考虑 expression problem 中的问题. 首先, 尝试给 `Expr`{.hs} 增加一个新的函数, 用于打印整棵 AST.

```hs
dump :: Expr -> String
dump (Lit n)   = "(Lit " ++ show n ++ ")"
dump (Add l r) = "(Add " ++ dump l ++ " " ++ dump r ++ ")"
```

还是很容易做到的.

但当我们试图给 `Expr`{.hs} 新增一个构造时候, 问题就暴露出来了. 我们必须给 `Expr`{.hs} 添上一个新 data constructor, 这也就意味着修改原有代码:

```hs {4}
data Expr where
  Lit :: Int -> Expr
  Add :: Expr -> Expr -> Expr
  Sub :: Expr -> Expr -> Expr
```

由于 `eval`{.hs} 和 `dump`{.hs} 函数都是用 pattern matching 实现的, 这些函数也必须对 `Sub`{.hs} 进行补充.

```hs {4,9}
eval :: Expr -> Int
eval (Lit n)   = n
eval (Add l r) = eval l + eval r
eval (Sub l r) = eval l - eval r

dump :: Expr -> String
dump (Lit n)   = "(Lit " ++ show n ++ ")"
dump (Add l r) = "(Add " ++ dump l ++ " " ++ dump r ++ ")"
dump (Sub l r) = "(Sub " ++ dump l ++ " " ++ dump r ++ ")"
```

## 例子 2: 用 Subtyping 实现 AST

接下来我们换一门 OOP 语言 Swift.

```swift
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
```

巧合的是, 和 Haskell 恰恰相反, 当我们想给 `Expr`{.swift} 新增一个构造 `Sub`{.swift} 时, 要做的只是添加一个新的类 `Sub`{.swift}, 完全不用改动已有的代码.

```swift
class Sub: Expr {
    let left, right: Expr
    func eval() -> Int { left.eval() - right.eval() }
}
```

但增加新函数 `dump`{.swift} 时, 反而要改动很多地方.

```swift {3,9,15,21}
protocol Expr {
    func eval() -> Int
    func dump() -> String
}

class Lit: Expr {
    let n: Int
    func eval() -> Int { n }
    func dump() -> String { "(Lit \(n))" }
}

class Add: Expr {
    let left, right: Expr
    func eval() -> Int { left.eval() + right.eval() }
    func dump() -> String { "(Add \(left) \(right))" }
}

class Sub: Expr {
    let left, right: Expr
    func eval() -> Int { left.eval() - right.eval() }
    func dump() -> String { "(Sub \(left) \(right))" }
}
```

其中的原因不难理解. 类的继承 (inherit) 是 “open” 的, 而 sum type 则是 “closed” 的, 编译器能处理 dynamic dispatch, 却无法自动为 pattern matching 添加分支, 因此 OOP 的实现在新增构造时更容易. 另一边, 在 OOP 语言中, 每个函数中蕴含的逻辑和它的构造是耦合在一起的, 当新增函数时, 我们就必须把对应的逻辑逐个插入到不同的类中, 因此使用 ADT 的语言新增函数更容易. 这两类语言的 idiom 各自解决了 expression problem 的一半.

Swift 有类扩展 (extension) 的功能, 能解决这个问题, 不过这不是我们今天的重点, 因此需要你暂时先把它假想成 Java 那样的语言.

## Visitor Pattern

既然造成 OOP 语言新增函数困难的罪魁祸首是 “每个构造都和处理它的不同逻辑相耦合”, 那我们把它解耦不就好了? 这就是访问器模式 (visitor pattern) 的原理. 我们把 `eval`{.swift}, `dump`{.swift} 这些函数的具体逻辑从 `Expr`{.swift} 接口中剥离出去, 将它们抽象成不同的 “访问器” `Visitor`{.swift}, 只给 `Expr`{.swift} 留一个 “访问器接口” `Expr.visit(Visitor)`{.swift}, 用于读取并执行访问器中蕴含的逻辑. 这样一来, 一个构造和各种各样的逻辑就不再耦合了.

```swift
protocol Expr {
    func visit<V>(by visitor: V) -> V.Result where V : Visitor
}

protocol Visitor {
    associatedtype Result
    func lit(_ literal: Lit) -> Result
    func add(_ add: Add) -> Result
}

class Lit: Expr {
    let n: Int
    func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.lit(self)
    }
}

class Add: Expr {
    let left, right: Expr
    func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.add(self)
    }
}
```

现在, 我们为 `Expr`{.swift} 实现一个 “访问器” `Eval`{.swift} 作为例子

```swift
class Eval: Visitor {
    typealias Result = Int
    func lit(_ literal: Lit) -> Int {
        literal.n
    }
    func add(_ add: Add) -> Int {
        add.left.visit(by: self) + add.right.visit(by: self)
    }
}
```

类似的, 实现 `Dump`{.swift} 也不是件难事

```swift
class Dump: Visitor {
    typealias Result = String
    func lit(_ literal: Lit) -> String {
        "(Lit \(literal.n))"
    }
    
    func add(_ add: Add) -> String {
        "(Add \(add.left.visit(by: self)) \(add.right.visit(by: self)))"
    }
}
```

我们把视线拉回到 Haskell 的 `eval` 实现上

```hs
eval :: Expr -> Int
eval (Lit n)   = n
eval (Add l r) = eval l + eval r
```

很容易就能发现, Swift 中的 `Eval`{.swift} 和 Haskell 中的 `eval`{.hs} 在形式上是一致的, 其实 visitor pattern 之于 GoF, 就相当于 pattern matching 之于 ADT. 当然, 这么说同时也就意味着, visitor pattern 并不是一个 expression problem 的合格解, `Visitor`{.swift} 的域就像 ADT 的 data constructor 一样, 想要扩展它们, 除了修改源码外别无他法.

```swift {5}
protocol Visitor {
    associatedtype Result
    func lit(_ literal: Lit) -> Result
    func add(_ add: Add) -> Result
    func sub(_ sub: Sub) -> Result
}
```

这似乎是件蠢事, 把 subtyping 实现方式的缺陷转换成了 ADT 实现方式的缺陷, 却没有解决实质问题.

事实确实如此, 但我之所以要花长篇幅介绍 visitor pattern, 还有些潜在的原因:

-   实现 visitor pattern 不需要足够好的类型系统, 也不需要 ADT 和 pattern matching 这类 ML 家族语言的特性, 只要支持 dynamic dispatch 就可以, 不少比较落后的语言也能做到.
-   真正实现编译器或解释器时并不需要解决 expression problem, 适当的修改已有代码不是坏事, 那些真正解决了 expression problem 的方案反而可能会让项目架构变得混乱.
-   Visitor pattern 可以和一些 OOP 的辅助设施融洽相处, 更充分地发挥类的潜在威力.

接下来我会介绍一些 visitor pattern 实现的细节, 如果你只对 expression problem 相关的内容感兴趣, 可以跳过后半部分, 等下一篇文章<!-- TODO -->.

## Visitor Pattern 和多级 AST

上文中出现的 AST 是一个比较理想化的例子, 它的层次结构极其简单 (下例左), 这在任何语言的编译器中都几乎是不可能出现的情况. 为了模拟真实情况, 我把 `Add`{.hs} 和 `Sub`{.hs} 另划一类, 加入了用于统一表示二元运算符的层次 `Op`{.hs} (下例右).

```
Expr           Expr
|-Lit          |-Lit
|-Add          `-Op
`-Sub            |-Add
                 `-Sub
```

对 Haskell 来说, 只要设置双层的 ADT 就可以了.

```hs
data Expr where
  Lit :: Int -> Expr
  Op :: Op -> Expr

data Op where
  Add :: Expr -> Expr -> Op
  Sub :: Expr -> Expr -> Op
```

实现 `eval`{.hs} 函数时, 也需要双层的 pattern matching.

```hs
eval :: Expr -> Int
eval (Lit n) = n
eval (Op op) =
  case op of (Add l r) -> eval l + eval r
             (Sub l r) -> eval l - eval r
```

这种层次结构在实践中很有必要, 因为当 AST 足够复杂时, 会需要一些辅助函数, 这些函数并不都是针对 `Expr`{.hs} 的, 有可能只适用于 `Op`{.hs}, 如果这时候 `Add`{.hs} 和 `Sub`{.hs} 没有被单独划为一类, 而是和其他 `Expr`{.hs} 一样放在一起, 类型检查器就无法有效地工作. 你可能会写出这样的代码:

```hs {4}
commutative :: Expr -> Bool
commutative (Add _ _) = True
commutative (Sub _ _) = False
commutative (Lit _)   = error "not an operator" -- ⊥! ⊥! ⊥!
```

虽然我有让你必须这么做的理由, 但也不得不承认, Haskell 的实现有些恼人. 如果你想构造一个 `Op`{.hs} 类型的实例, 写法是 `(Op (Add l r))`{.hs} 而不是 `(Add l r)`{.hs}, 随着 AST 层级结构越来越多, 这个套娃也会越来越臃肿, 每一层的名字都会参与到这个构造过程中. 想象一下, 在一门更复杂的语言里, 你很有可能会遇到 `(Ast (Expr (BinOp (Add (Lit (Num (Int 1))) (Lit (Num (Int 2)))))))`{.hs} 这样的构造, 而这个庞然大物却仅仅是一个加法运算的 AST 节点. 这些层叠的结构名会喧宾夺主, 让人很难快速理清这段代码到底在构造什么.

```hs
eval (Add (Add (Lit 1) (Lit 2)) (Lit 3))           -- 增加层级结构前
eval (Op (Add (Op (Add (Lit 1) (Lit 2))) (Lit 3))) -- 增加层级结构后
```

而 Swift 中使用 visitor pattern 的实现就没有这个问题, 因为 class hierarchy 会以 RTTI 的形式隐晦地存在于代码中, `Add`{.swift} 当然可以既是 `Op`{.swift} 的 subtype, 又同时是 `Expr`{.swift} 的 subtype.

```swift
protocol Expr {
    func visit<V>(by visitor: V) -> V.Result where V : Visitor
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
    func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.lit(self)
    }
    
    init(_ n: Int) {
        self.n = n
    }
}

class Op: Expr {
    let left, right: Expr
    func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.op(self)
    }
    init(_ left: Expr, _ right: Expr) {
        self.left = left
        self.right = right
    }
}

class Add: Op {
    override func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.add(self)
    }
}

class Sub: Op {
    override func visit<V>(by visitor: V) -> V.Result where V : Visitor {
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
        "(Op \(op.left.visit(by: self)) \(op.right.visit(by: self)))"
    }
    func add(_ add: Add) -> String {
        "(Add \(add.left.visit(by: self)) \(add.right.visit(by: self)))"
    }
    func sub(_ sub: Sub) -> String {
        "(Sub \(sub.left.visit(by: self)) \(sub.right.visit(by: self)))"
    }
}
```

到目前为止, 类的威力还没有完全展露, 现在, 我们给 `Visitor`{.swift} 接口增加一系列默认实现, 当一个访问器不被 override 所定制时, 它总是会默认地调用它上一级层次结构的访问器.

```swift
extension Visitor {
    func lit(_ literal: Lit) -> Result { self.expr(literal) }
    func op(_ op: Op) -> Result { self.expr(op) }
    func add(_ add: Add) -> Result { self.op(add) }
    func sub(_ sub: Sub) -> Result { self.op(sub) }
}
```

如果加入一个新的 AST 节点 `Multi`{.swift}.

```swift {6,9-13}
extension Visitor {
    func lit(_ literal: Lit) -> Result { self.expr(literal) }
    func op(_ op: Op) -> Result { self.expr(op) }
    func add(_ add: Add) -> Result { self.op(add) }
    func sub(_ sub: Sub) -> Result { self.op(sub) }
    func multi(_ multi: Multi) -> Result { self.op(sub) }
}

class Multi: Op {
    override func visit<V>(by visitor: V) -> V.Result where V : Visitor {
        visitor.multi(self)
    }
}
```

在没有修改 `Dump`{.swift} visitor 的情况下, 程序并没有发生错误, `Visitor.multi`{.swift} 调用了它的默认实现, 用 `Dump.op`{.swift} 打印出了一个 “虽然不那么漂亮, 但仍然好用” 的结果.

```swift
Multi(Lit(1), Add(Lit(2), Lit(3)))
    .visit(by: Dump())
// Print "(Op (Lit 1) (Add (Lit 2) (Lit 3)))"
```

你会发现, 在 visitor pattern 中, 你可以很好地控制程序的粒度. 假设我们现在需要一个 `Count`{.swift} visitor 来计算 AST 的节点数量, 对 `Op`{.swift} 来说, 我们就不需要知道它具体是 `Add`{.swift} 还是 `Sub`{.swift}, 只取得它的左右子树. 这时我们可以不必 override `Visitor.add`{.swift} 和 `Visitor.sub`{.swift}, 关注更粗粒度的 `Visitor.op`{.swift} 就可以了.

```swift
class Count: Visitor {
    typealias Result = Int
    func expr(_ expr: Expr) -> Int { fatalError("unreachable") }
    func lit(_ literal: Lit) -> Int { 1 }
    func op(_ op: Op) -> Int {
        1 + op.left.visit(by: self) + op.right.visit(by: self)
    }
}

Add(Lit(1), Multi(Lit(2), Lit(3))).visit(by: Count()) // Print "5"
```

## ADT 和 Subtyping 之间一点微妙的关系

在用 Haskell 中实现 `Op`{.hs} 时, 有两种可选的方案:

```hs
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
  Op :: Op -> Expr
  ...
data OpExpr where
  OpExpr :: Op -> OpExpr
data Op where
  Add :: Op
  Sub :: Op
  Multi :: Op
```

这两种方案理论上是等价的, 但在实践中, 后者却比前者更合适. 这是因为后者能暴露一些共性的东西. 假设我们现在需要一个 `getFirstOperand`{.hs} 函数来获取 `Op`{.hs} 的第一个操作数, 这两种方案对应的函数分别是:

```hs
-- (1)
getFirstOperand :: Op -> Expr
getFirstOperand (Add l _) = l
getFirstOperand (Sub l _) = l
getFirstOperand (Multi l _) = l

-- (2)
getFirstOperand :: Op -> Expr
getFirstOperand (OpExpr l _) = l
```

你会发现, 前者总是被迫去关注所有类型的节点, 而后者则可以视实际情况选择, 当不需要关系 `Op` 究竟是什么时, 后者总是能提供更简洁的代码.

如果你读过 Type and Programming Language, 你应该能记得, 书中示例代码中的 AST 用的就是前者这种糟糕的设计, 它的每个 AST 节点的 data constructor 都有一个用于表示源码位置信息的 `info`{.ocaml} 参数.

```ocaml
type term = TmTrue   of info
          | TmFalse  of info
          | TmIf     of info * term * term * term
          | TmZero   of info
          | TmSucc   of info * term
          | TmPred   of info * term
          | TmIsZero of info * term
```

如果我们想写一个 `get_info`{.ocaml} 函数, 恐怕要写成这样:

```ocaml
let get_info t =
    match t with TmTrue(info)     = info
               | TmFalse(info)    = info
               | TmIf(info,_,_,_) = info
               | TmZero(info)     = info
               | TmSucc(info,_)   = info
               | TmPred(info,_)   = info
               | TmIsZero(info,_) = info
```

当然, 作为例子是没问题的, 但如果你在写一个正式的编译器, 可能就需要好好思考一下了.

想一想, 上一节中 Swift 实现的 visitor pattern 对应的是哪种写法, 这种粒度控制在拥有 subtyping 和 inheritance 的语言中又是如何起作用的?

## 结尾

接下来的一周我不会继续写 expression problem 的文章了, 可能会在下边的话题里选一个:

-   C++ RTTI 和 LLVM's style RTTI
-   使用 LLVM 工具将源文件读入内存