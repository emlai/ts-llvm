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
