; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  %a = alloca double
  store double 4.000000e+00, double* %a
  %0 = load double, double* %a
  %1 = fadd double %0, 1.000000e+00
  store double %1, double* %a
  call void @foo()
  ret i32 0
}

declare void @console__log(%string)

define void @foo() {
entry:
  ret void
}
