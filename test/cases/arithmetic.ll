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
  %aa = alloca double
  store double %a, double* %aa
  %0 = fsub double -0.000000e+00, %a
  %1 = fptosi double %a to i32
  %2 = xor i32 %1, -1
  %3 = sitofp i32 %2 to double
  %4 = load double, double* %aa
  %5 = fadd double %4, 1.000000e+00
  store double %5, double* %aa
  %6 = load double, double* %aa
  %7 = fsub double %6, 1.000000e+00
  store double %7, double* %aa
  %8 = load double, double* %aa
  %9 = fadd double %8, 1.000000e+00
  store double %9, double* %aa
  %10 = load double, double* %aa
  %11 = fsub double %10, 1.000000e+00
  store double %11, double* %aa
  %12 = fadd double %a, %b
  %13 = fsub double %a, %b
  %14 = fmul double %a, %b
  %15 = fdiv double %a, %b
  %16 = frem double %a, %b
  %17 = fptosi double %a to i32
  %18 = fptosi double %b to i32
  %19 = and i32 %17, %18
  %20 = sitofp i32 %19 to double
  %21 = fptosi double %a to i32
  %22 = fptosi double %b to i32
  %23 = or i32 %21, %22
  %24 = sitofp i32 %23 to double
  %25 = fptosi double %a to i32
  %26 = fptosi double %b to i32
  %27 = xor i32 %25, %26
  %28 = sitofp i32 %27 to double
  %29 = fptosi double %a to i32
  %30 = fptosi double %b to i32
  %31 = shl i32 %29, %30
  %32 = sitofp i32 %31 to double
  %33 = fptosi double %a to i32
  %34 = fptosi double %b to i32
  %35 = ashr i32 %33, %34
  %36 = sitofp i32 %35 to double
  %37 = fptosi double %a to i32
  %38 = fptosi double %b to i32
  %39 = lshr i32 %37, %38
  %40 = sitofp i32 %39 to double
  ret void
}
