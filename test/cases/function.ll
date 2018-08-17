; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  ret i32 0
}

declare void @console__log(%string)

define double @foo(double %a, double %b) {
entry:
  %0 = fadd double %a, %b
  ret double %0
}

define void @bar(double %a, double %b) {
entry:
  %0 = call double @foo(double %b, double %a)
  ret void
}
