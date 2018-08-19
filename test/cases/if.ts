function foo(a: boolean, b: boolean, c: boolean) {
  if (a) {
    return false;
  } else if (b) {
    if (c) {
      return true;
    } else {
      return b;
    }
  }
  return c;
}

foo(false, true, false);
