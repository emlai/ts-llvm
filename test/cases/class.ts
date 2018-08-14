class A {
  b: number;
  c: number;

  constructor(b: number) {
    // this.b = b;
    // this.c = 0;
    let a = b;
  }

  a() {
    console.log("foo");
  }
}

const a = new A(4);
