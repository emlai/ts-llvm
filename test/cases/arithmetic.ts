function foo(a: number, b: number) {
  a = +a;
  -a;
  ~a;
  a++;
  a--;
  ++a;
  --a;
}

function fooObj() {
  const a = { b: 0 };
  a.b++;
  a.b--;
  ++a.b;
  --a.b;
}

function bar(a: number, b: number) {
  a + b;
  a - b;
  a * b;
  a / b;
  a % b;
  a & b;
  a | b;
  a ^ b;
  a << b;
  a >> b;
  a >>> b;

  // TODO:
  // a ** b;
  // a += b;
  // a -= b;
  // a *= b;
  // a /= b;
  // a %= b;
  // a &= b;
  // a |= b;
  // a ^= b;
  // a <<= b;
  // a >>= b;
  // a >>>= b;
  // a **= b;
}

foo(1, 2);
fooObj();
bar(1, 2);
