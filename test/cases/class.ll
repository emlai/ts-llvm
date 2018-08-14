%A = type { double, double }
%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  %x = alloca double
  %a = call %A* @A__constructor(double 4.000000e+00)
  %0 = getelementptr inbounds %A, %A* %a, i32 0, i32 1
  store double 1.000000e+00, double* %0
  %1 = getelementptr inbounds %A, %A* %a, i32 0, i32 0
  %2 = load double, double* %1
  store double %2, double* %x
  call void @A__a(%A* %a)
  ret i32 0
}

declare void @console__log(%string)

define %A* @A__constructor(double %b) {
entry:
  %a = alloca double
  %0 = call i8* @gc__allocate(i32 16)
  %1 = bitcast i8* %0 to %A*
  %2 = getelementptr inbounds %A, %A* %1, i32 0, i32 0
  store double %b, double* %2
  %3 = getelementptr inbounds %A, %A* %1, i32 0, i32 1
  store double 0.000000e+00, double* %3
  store double %b, double* %a
  ret %A* %1
}

declare i8* @gc__allocate(i32)

define void @A__a(%A* %this) {
entry:
  %0 = getelementptr inbounds %A, %A* %this, i32 0, i32 0
  %1 = getelementptr inbounds %A, %A* %this, i32 0, i32 1
  %2 = load double, double* %1
  store double %2, double* %0
  call void @console__log(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  ret void
}
