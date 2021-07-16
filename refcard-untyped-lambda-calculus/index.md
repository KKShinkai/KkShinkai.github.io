# Untyped Lambda Calculus

## 1. Definitions

### Lambda-terms

$$\Lambda = V \mid (\Lambda \Lambda) \mid (\lambda V . \Lambda)$$

-   Variable - $x$
-   Application - $MN$
-   Abstraction - $\lambda x.M$

### Free and bound variables

-   Free variable ($FV$) - $\lambda x.\lambda y.\boxed{w}xy\boxed{z}$
-   Bound variable - $\lambda x.\lambda y.w\boxed{xy}z$
-   Binding variable - $\lambda \boxed{x}.\lambda \boxed{y}.wxyz$

### Operations

-   $\alpha$-conversion (renaming) - $(\lambda x.M)\to(\lambda y.M^{x\to y})$
-   $\beta$-reduction - $((\lambda x.M)N)\to(M[x:=N])$
-   $\eta$-reduction - $(\lambda x.f x)\to f$

### Normal forms

-   $M$ is weakly normalising if there is an $N$ in $\beta$-normal form such that $M \twoheadrightarrow_\beta N$.
-   $M$ is strongly normalising if there are no infinite reduction paths starting from $M$.
-   Church–Rosser.
