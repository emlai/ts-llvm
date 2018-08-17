// tslint:disable:no-bitwise

function foo(a: number, b: number) {
  let aa = +a;

  -a;
  ~a;
  aa++;
  aa--;
  ++aa;
  --aa;
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
