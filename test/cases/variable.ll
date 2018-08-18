; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  ret i32 0
}

declare void @console__log(%string)

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
  %1 = load double, double* %localLet
  %2 = fadd double %param, %1
  store double %2, double* %localVar
  %3 = load double, double* %localVar
  ret double %3
}
