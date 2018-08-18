; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  %a = call i8* @Array__number__constructor()
  call void @Array__number__push(i8* %a, double 1.000000e+00)
  call void @Array__number__push(i8* %a, double 2.000000e+00)
  call void @Array__number__push(i8* %a, double 3.000000e+00)
  call void @Array__number__push(i8* %a, double 4.000000e+00)
  %0 = call double @Array__number__subscript(i8* %a, double 1.000000e+00)
  %x = call double @Array__number__subscript(i8* %a, double %0)
  ret i32 0
}

declare void @console__log(%string)

declare i8* @Array__number__constructor()

declare void @Array__number__push(i8*, double)

declare double @Array__number__subscript(i8*, double)
