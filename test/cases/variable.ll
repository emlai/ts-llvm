; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  %0 = call double @foo(double 1.000000e+00)
  ret i32 0
}

define double @foo(double %param) {
entry:
  %localVar = alloca double
  %localLet = alloca double
  %localConst = fadd double %param, %param
  %0 = fadd double %localConst, %param
  store double %0, double* %localLet
  %localAllocaAlias = load double, double* %localLet
  store double %localConst, double* %localLet
  store double %localAllocaAlias, double* %localVar
  %localLet.load = load double, double* %localLet
  %1 = fadd double %param, %localLet.load
  store double %1, double* %localVar
  %localVar.load = load double, double* %localVar
  ret double %localVar.load
}
