function foo(a: number, b: number) {
  a = +a;
  -a;
  ~a;
  a++;
  a--;
  ++a;
  --a;
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
bar(1, 2);
