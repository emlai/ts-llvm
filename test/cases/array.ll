; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%Array__number = type opaque

define i32 @main() {
entry:
  %c = alloca double
  %b = alloca double
  %a = call %Array__number* @Array__number__constructor()
  call void @Array__number__push(%Array__number* %a, double 1.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 2.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 3.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 4.000000e+00)
  %0 = call double* @Array__number__subscript(%Array__number* %a, double 1.000000e+00)
  %1 = load double, double* %0
  store double %1, double* %b
  %2 = call double* @Array__number__subscript(%Array__number* %a, double 1.000000e+00)
  %3 = load double, double* %b
  %4 = call double* @Array__number__subscript(%Array__number* %a, double %3)
  %5 = load double, double* %4
  %6 = call double* @Array__number__subscript(%Array__number* %a, double %5)
  %7 = load double, double* %6
  store double %7, double* %2
  %8 = call double @Array__number__length(%Array__number* %a)
  store double %8, double* %c
  ret i32 0
}

declare %Array__number* @Array__number__constructor()

declare void @Array__number__push(%Array__number*, double)

declare double* @Array__number__subscript(%Array__number*, double)

declare double @Array__number__length(%Array__number*)
