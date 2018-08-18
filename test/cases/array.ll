; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  %c = alloca double
  %b = alloca double
  %a = call i8* @Array__number__constructor()
  call void @Array__number__push(i8* %a, double 1.000000e+00)
  call void @Array__number__push(i8* %a, double 2.000000e+00)
  call void @Array__number__push(i8* %a, double 3.000000e+00)
  call void @Array__number__push(i8* %a, double 4.000000e+00)
  %0 = call double* @Array__number__subscript(i8* %a, double 1.000000e+00)
  %1 = load double, double* %0
  store double %1, double* %b
  %2 = call double* @Array__number__subscript(i8* %a, double 1.000000e+00)
  %3 = load double, double* %b
  %4 = call double* @Array__number__subscript(i8* %a, double %3)
  %5 = load double, double* %4
  %6 = call double* @Array__number__subscript(i8* %a, double %5)
  %7 = load double, double* %6
  store double %7, double* %2
  %8 = call double @Array__number__length(i8* %a)
  store double %8, double* %c
  ret i32 0
}

declare void @console__log(%string)

declare i8* @Array__number__constructor()

declare void @Array__number__push(i8*, double)

declare double* @Array__number__subscript(i8*, double)

declare double @Array__number__length(i8*)
