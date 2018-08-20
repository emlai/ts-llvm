; ModuleID = 'main'
source_filename = "main"
target datalayout = "e-m:e-i64:64-f80:128-n8:16:32:64-S128"
target triple = "x86_64"

%Array__string = type opaque
%string = type { i8*, i32 }
%Array__boolean = type opaque
%Array__number = type opaque

@0 = private unnamed_addr constant [4 x i8] c"bar\00"
@1 = private unnamed_addr constant [4 x i8] c"baz\00"
@2 = private unnamed_addr constant [4 x i8] c"foo\00"

define i32 @main() {
entry:
  %e = alloca %Array__string*
  %baz = alloca %string
  %d = alloca %Array__boolean*
  %c = alloca double
  %b = alloca double
  %a = call %Array__number* @Array__number__constructor()
  call void @Array__number__push(%Array__number* %a, double 1.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 2.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 3.000000e+00)
  call void @Array__number__push(%Array__number* %a, double 4.000000e+00)
  %0 = call double* @Array__number__subscript(%Array__number* %a, double 1.000000e+00)
  %.load = load double, double* %0
  store double %.load, double* %b
  %1 = call double* @Array__number__subscript(%Array__number* %a, double 1.000000e+00)
  %b.load = load double, double* %b
  %2 = call double* @Array__number__subscript(%Array__number* %a, double %b.load)
  %.load1 = load double, double* %2
  %3 = call double* @Array__number__subscript(%Array__number* %a, double %.load1)
  %.load2 = load double, double* %3
  store double %.load2, double* %1
  %4 = call double @Array__number__length(%Array__number* %a)
  store double %4, double* %c
  %5 = call %Array__boolean* @Array__boolean__constructor()
  call void @Array__boolean__push(%Array__boolean* %5, i1 false)
  call void @Array__boolean__push(%Array__boolean* %5, i1 true)
  %6 = call double @Array__number__length(%Array__number* %a)
  %7 = fcmp oeq double %6, 4.000000e+00
  call void @Array__boolean__push(%Array__boolean* %5, i1 %7)
  store %Array__boolean* %5, %Array__boolean** %d
  store %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @1, i32 0, i32 0), i32 3 }, %string* %baz
  %8 = call %Array__string* @Array__string__constructor()
  call void @Array__string__push(%Array__string* %8, %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @2, i32 0, i32 0), i32 3 })
  call void @Array__string__push(%Array__string* %8, %string { i8* getelementptr inbounds ([4 x i8], [4 x i8]* @0, i32 0, i32 0), i32 3 })
  %baz.load = load %string, %string* %baz
  call void @Array__string__push(%Array__string* %8, %string %baz.load)
  store %Array__string* %8, %Array__string** %e
  ret i32 0
}

declare %Array__number* @Array__number__constructor()

declare void @Array__number__push(%Array__number*, double)

declare double* @Array__number__subscript(%Array__number*, double)

declare double @Array__number__length(%Array__number*)

declare %Array__boolean* @Array__boolean__constructor()

declare void @Array__boolean__push(%Array__boolean*, i1)

declare %Array__string* @Array__string__constructor()

declare void @Array__string__push(%Array__string*, %string)
