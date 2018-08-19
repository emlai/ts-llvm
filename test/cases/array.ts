const a = [1, 2, 3];
a.push(4);
let b = a[1];
a[1] = a[a[b]];
let c = a.length;

let d = [false, true, a.length === 4];
const bar = "bar";
let baz = "baz";
let e = ["foo", bar, baz];
