%A = type { double, double }
%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  %a = call %A* @A__constructor(double 4.000000e+00)
  ret i32 0
}

declare void @console__log(%string)

define %A* @A__constructor(double %b) {
entry:
  %a = alloca double
  %0 = call i8* @gc__allocate(i32 16)
  %1 = bitcast i8* %0 to %A*
  store double %b, double* %a
  ret %A* %1
}

declare i8* @gc__allocate(i32)

define void @A__a() {
entry:
  call void @console__log(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  ret void
}
