; ModuleID = 'main'
source_filename = "main"

%string = type { i8*, i32 }

define i32 @main() {
entry:
  ret i32 0
}

declare void @console__log(%string)

define i1 @foo(i1 %a, i1 %b, i1 %c) {
entry:
  br i1 %a, label %then, label %else

then:                                             ; preds = %entry
  ret i1 false

else:                                             ; preds = %entry
  br i1 %b, label %then1, label %else2

endif:                                            ; preds = %endif3
  ret i1 %c

then1:                                            ; preds = %else
  br i1 %c, label %then4, label %else5

else2:                                            ; preds = %else
  br label %endif3

endif3:                                           ; preds = %else2, %endif6
  br label %endif

then4:                                            ; preds = %then1
  ret i1 true

else5:                                            ; preds = %then1
  ret i1 %b

endif6:                                           ; No predecessors!
  br label %endif3
}
