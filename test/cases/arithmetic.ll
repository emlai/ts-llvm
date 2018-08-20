; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  call void @foo(double 1.000000e+00, double 2.000000e+00)
  call void @bar(double 1.000000e+00, double 2.000000e+00)
  ret i32 0
}

define void @foo(double %a, double %b) {
entry:
  %a.alloca = alloca double
  store double %a, double* %a.alloca
  %0 = load double, double* %a.alloca
  %1 = fsub double -0.000000e+00, %0
  %2 = load double, double* %a.alloca
  %3 = fptosi double %2 to i32
  %4 = xor i32 %3, -1
  %5 = sitofp i32 %4 to double
  %6 = load double, double* %a.alloca
  %7 = fadd double %6, 1.000000e+00
  store double %7, double* %a.alloca
  %8 = load double, double* %a.alloca
  %9 = fsub double %8, 1.000000e+00
  store double %9, double* %a.alloca
  %10 = load double, double* %a.alloca
  %11 = fadd double %10, 1.000000e+00
  store double %11, double* %a.alloca
  %12 = load double, double* %a.alloca
  %13 = fsub double %12, 1.000000e+00
  store double %13, double* %a.alloca
  ret void
}

define void @bar(double %a, double %b) {
entry:
  %0 = fadd double %a, %b
  %1 = fsub double %a, %b
  %2 = fmul double %a, %b
  %3 = fdiv double %a, %b
  %4 = frem double %a, %b
  %5 = fptosi double %a to i32
  %6 = fptosi double %b to i32
  %7 = and i32 %5, %6
  %8 = sitofp i32 %7 to double
  %9 = fptosi double %a to i32
  %10 = fptosi double %b to i32
  %11 = or i32 %9, %10
  %12 = sitofp i32 %11 to double
  %13 = fptosi double %a to i32
  %14 = fptosi double %b to i32
  %15 = xor i32 %13, %14
  %16 = sitofp i32 %15 to double
  %17 = fptosi double %a to i32
  %18 = fptosi double %b to i32
  %19 = shl i32 %17, %18
  %20 = sitofp i32 %19 to double
  %21 = fptosi double %a to i32
  %22 = fptosi double %b to i32
  %23 = ashr i32 %21, %22
  %24 = sitofp i32 %23 to double
  %25 = fptosi double %a to i32
  %26 = fptosi double %b to i32
  %27 = lshr i32 %25, %26
  %28 = sitofp i32 %27 to double
  ret void
}
