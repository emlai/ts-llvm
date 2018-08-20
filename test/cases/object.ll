; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  call void @foo()
  ret i32 0
}

define void @foo() {
entry:
  %0 = call i8* @gc__allocate(i32 16)
  %a1 = bitcast i8* %0 to { double, double }*
  %a = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 0
  store double 1.000000e+00, double* %a
  %b = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 1
  store double 2.000000e+00, double* %b
  %a2 = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 0
  %b3 = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 1
  %b3.load = load double, double* %b3
  store double %b3.load, double* %a2
  ret void
}

declare i8* @gc__allocate(i32)
