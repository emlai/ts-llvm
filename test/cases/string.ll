; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"
@1 = private unnamed_addr constant [4 x i8] c"123\00"
@2 = private unnamed_addr constant [4 x i8] c"   \00"
@3 = private unnamed_addr constant [4 x i8] c"AAA\00"

define i32 @main() {
entry:
  %a = alloca %string
  store %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 }, %string* %a
  %0 = load %string, %string* %a
  %1 = load %string, %string* %a
  %2 = call %string @string__concat(%string %0, %string %1)
  store %string %2, %string* %a
  %3 = load %string, %string* %a
  %b = call %string @string__concat(%string %3, %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @1, i32 0, i32 0), i32 3 })
  %4 = call %string @string__concat(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @2, i32 0, i32 0), i32 3 }, %string %b)
  %5 = call %string @string__concat(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @3, i32 0, i32 0), i32 3 }, %string %4)
  call void @console__log(%string %5)
  ret i32 0
}

declare %string @string__concat(%string, %string)

declare void @console__log(%string)
