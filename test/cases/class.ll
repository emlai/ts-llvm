; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%B = type { double }
%A = type { %B*, double }
%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  %x = alloca %B*
  %a = call %A* @A__constructor(double 4.000000e+00)
  %c = getelementptr inbounds %A, %A* %a, i32 0, i32 1
  store double 1.000000e+00, double* %c
  %b = getelementptr inbounds %A, %A* %a, i32 0, i32 0
  %b.load = load %B*, %B** %b
  store %B* %b.load, %B** %x
  call void @A__a(%A* %a)
  ret i32 0
}

define %A* @A__constructor(double %b) {
entry:
  %a = alloca double
  %0 = call i8* @gc__allocate(i32 16)
  %1 = bitcast i8* %0 to %A*
  %b1 = getelementptr inbounds %A, %A* %1, i32 0, i32 0
  %2 = call %B* @B__constructor()
  store %B* %2, %B** %b1
  %c = getelementptr inbounds %A, %A* %1, i32 0, i32 1
  store double 0.000000e+00, double* %c
  store double %b, double* %a
  ret %A* %1
}

declare i8* @gc__allocate(i32)

define %B* @B__constructor() {
entry:
  %0 = call i8* @gc__allocate(i32 8)
  %1 = bitcast i8* %0 to %B*
  ret %B* %1
}

define void @A__a(%A* %this) {
entry:
  %b = getelementptr inbounds %A, %A* %this, i32 0, i32 0
  %b.load = load %B*, %B** %b
  %b1 = getelementptr inbounds %B, %B* %b.load, i32 0, i32 0
  %c = getelementptr inbounds %A, %A* %this, i32 0, i32 1
  %c.load = load double, double* %c
  store double %c.load, double* %b1
  call void @console__log(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  ret void
}

declare void @console__log(%string)
