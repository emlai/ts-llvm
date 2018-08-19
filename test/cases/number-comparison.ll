; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  call void @foo(double 1.000000e+00, double 2.000000e+00)
  ret i32 0
}

define void @foo(double %a, double %b) {
entry:
  %0 = fcmp oeq double %a, %b
  %1 = fcmp one double %a, %b
  %2 = fcmp olt double %a, %b
  %3 = fcmp ogt double %a, %b
  %4 = fcmp ole double %a, %b
  %5 = fcmp oge double %a, %b
  ret void
}
