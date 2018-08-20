; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

define i32 @main() {
entry:
  call void @foo(double 1.000000e+00, double 2.000000e+00)
  call void @fooObj()
  call void @bar(double 1.000000e+00, double 2.000000e+00)
  ret i32 0
}

define void @foo(double %a, double %b) {
entry:
  %a.alloca = alloca double
  store double %a, double* %a.alloca
  %a.alloca.load = load double, double* %a.alloca
  %0 = fsub double -0.000000e+00, %a.alloca.load
  %a.alloca.load1 = load double, double* %a.alloca
  %1 = fptosi double %a.alloca.load1 to i32
  %2 = xor i32 %1, -1
  %3 = sitofp i32 %2 to double
  %a.alloca.load2 = load double, double* %a.alloca
  %4 = fadd double %a.alloca.load2, 1.000000e+00
  store double %4, double* %a.alloca
  %a.alloca.load3 = load double, double* %a.alloca
  %5 = fsub double %a.alloca.load3, 1.000000e+00
  store double %5, double* %a.alloca
  %a.alloca.load4 = load double, double* %a.alloca
  %6 = fadd double %a.alloca.load4, 1.000000e+00
  store double %6, double* %a.alloca
  %a.alloca.load5 = load double, double* %a.alloca
  %7 = fsub double %a.alloca.load5, 1.000000e+00
  store double %7, double* %a.alloca
  ret void
}

define void @fooObj() {
entry:
  %0 = call i8* @gc__allocate(i32 8)
  %a = bitcast i8* %0 to { double }*
  %b = getelementptr inbounds { double }, { double }* %a, i32 0, i32 0
  store double 0.000000e+00, double* %b
  %b1 = getelementptr inbounds { double }, { double }* %a, i32 0, i32 0
  %b1.load = load double, double* %b1
  %1 = fadd double %b1.load, 1.000000e+00
  store double %1, double* %b1
  %b2 = getelementptr inbounds { double }, { double }* %a, i32 0, i32 0
  %b2.load = load double, double* %b2
  %2 = fsub double %b2.load, 1.000000e+00
  store double %2, double* %b2
  %b3 = getelementptr inbounds { double }, { double }* %a, i32 0, i32 0
  %b3.load = load double, double* %b3
  %3 = fadd double %b3.load, 1.000000e+00
  store double %3, double* %b3
  %b4 = getelementptr inbounds { double }, { double }* %a, i32 0, i32 0
  %b4.load = load double, double* %b4
  %4 = fsub double %b4.load, 1.000000e+00
  store double %4, double* %b4
  ret void
}

declare i8* @gc__allocate(i32)

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
