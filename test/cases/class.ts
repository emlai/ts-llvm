class B {
  b: number;
  constructor() {}
}

class A {
  b: B;
  c: number;

  constructor(b: number) {
    this.b = new B();
    this.c = 0;
    let a = b;
  }

  a() {
    this.b.b = this.c;
    console.log("foo");
  }
}

const a = new A(4);
a.c = 1;
let x = a.b;
a.a();
