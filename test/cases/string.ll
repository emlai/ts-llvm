; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%string = type { i8*, i32 }

@0 = private unnamed_addr constant [4 x i8] c"foo\00"
@1 = private unnamed_addr constant [4 x i8] c"123\00"
@2 = private unnamed_addr constant [4 x i8] c"AAA\00"
@3 = private unnamed_addr constant [4 x i8] c"   \00"
@4 = private unnamed_addr constant [7 x i8] c"123456\00"

define i32 @main() {
entry:
  %l = alloca double
  %a = alloca %string
  store %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 }, %string* %a
  %a.load = load %string, %string* %a
  %a.load1 = load %string, %string* %a
  %0 = call %string @string__concat(%string %a.load1, %string %a.load)
  store %string %0, %string* %a
  %a.load2 = load %string, %string* %a
  %b = call %string @string__concat(%string %a.load2, %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @1, i32 0, i32 0), i32 3 })
  %1 = call %string @string__concat(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @3, i32 0, i32 0), i32 3 }, %string %b)
  %2 = call %string @string__concat(%string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @2, i32 0, i32 0), i32 3 }, %string %1)
  call void @console__log(%string %2)
  store double 6.000000e+00, double* %l
  %3 = extractvalue %string %b, 1
  %b.length = uitofp i32 %3 to double
  %a.load3 = load %string, %string* %a
  %4 = extractvalue %string %a.load3, 1
  %a.load3.length = uitofp i32 %4 to double
  %a.load4 = load %string, %string* %a
  %5 = call %string @string__concat(%string %a.load4, %string %b)
  %6 = extractvalue %string %5, 1
  %.length = uitofp i32 %6 to double
  ret i32 0
}

declare %string @string__concat(%string, %string)

declare void @console__log(%string)
