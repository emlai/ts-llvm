; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  call void @bar(double 1.000000e+00, double 2.000000e+00)
  ret i32 0
}

define void @bar(double %a, double %b) {
entry:
  %0 = call double @foo(double %b, double %a)
  ret void
}

define double @foo(double %a, double %b) {
entry:
  %0 = fadd double %a, %b
  ret double %0
}
