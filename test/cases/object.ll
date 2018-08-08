define void @foo() {
entry:
  %0 = call i8* @gc__allocate(i32 16)
  %a = bitcast i8* %0 to { double, double }*
  %1 = getelementptr inbounds { double, double }, { double, double }* %a, i32 0, i32 0
  store double 1.000000e+00, double* %1
  %2 = getelementptr inbounds { double, double }, { double, double }* %a, i32 0, i32 1
  store double 2.000000e+00, double* %2
  ret void
}
