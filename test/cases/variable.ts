function foo(param: number) {
  const localConst = param + param, localParamAlias = param;
  let localLet = localConst + param;
  const localAllocaAlias = localLet;
  localLet = localConst;
  var localVar = localAllocaAlias;
  localVar = localParamAlias + localLet;
  return localVar;
}

foo(1);
