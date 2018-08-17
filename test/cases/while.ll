define i32 @main() {
entry:
  br label %while.cond

while.cond:                                       ; preds = %while.body, %entry
  %0 = call i1 @foo()
  br i1 %0, label %while.body, label %while.end

while.body:                                       ; preds = %while.cond
  %1 = call i1 @foo()
  br label %while.cond

while.end:                                        ; preds = %while.cond
  ret i32 0
}
