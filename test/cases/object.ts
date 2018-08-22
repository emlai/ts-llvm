function foo() {
  const b = 2;
  const a = {
    a: 1,
    b
  };
  a.a = a.b;
}

foo();
