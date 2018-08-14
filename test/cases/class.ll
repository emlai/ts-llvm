%A = type { double, double }
%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  %0 = call i8* @gc__allocate(i32 16)
  %a = bitcast i8* %0 to %A*
  ret i32 0
}

declare void @console__log(%string)

define void @A__a() {
entry:
  call void @console__log(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  ret void
}
