%A = type { double, double }
%string = type { i8*, i32 }

define i32 @main() {
entry:
  %0 = call i8* @gc__allocate(i32 16)
  %a = bitcast i8* %0 to %A*
  ret i32 0
}
