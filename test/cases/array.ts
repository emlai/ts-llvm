const a = [1, 2, 3];
a.push(4);
let b = a[1];
a[1] = a[a[b]];
