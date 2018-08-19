; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  call void @console__log(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  ret i32 0
}

declare void @console__log(%string)
