; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  %a = alloca double
  store double 4.000000e+00, double* %a
  %a.load = load double, double* %a
  %0 = fadd double %a.load, 1.000000e+00
  store double %0, double* %a
  call void @foo()
  ret i32 0
}

define void @foo() {
entry:
  ret void
}
