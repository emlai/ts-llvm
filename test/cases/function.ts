function foo(a: number, b: number) {
  return a + b;
}

function bar(a: number, b: number) {
  foo(b, a);
}

bar(1, 2);
