; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  ret i32 0
}

declare void @console__log(%string)

define void @foo() {
entry:
  %0 = call i8* @gc__allocate(i32 16)
  %a1 = bitcast i8* %0 to { double, double }*
  %a = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 0
  store double 1.000000e+00, double* %a
  %b = getelementptr inbounds { double, double }, { double, double }* %a1, i32 0, i32 1
  store double 2.000000e+00, double* %b
  ret void
}

declare i8* @gc__allocate(i32)
