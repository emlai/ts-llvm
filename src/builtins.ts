import * as llvm from "llvm-node";
import { LLVMGenerator } from "./codegen/generator";
import { error } from "./diagnostics";
import { getSize } from "./memory-layout";
import { getStringType } from "./types";
import { isValueType } from "./utils";

type BuiltinName = "gc__allocate" | "string__concat";

function getBuiltinFunctionType(name: BuiltinName, context: llvm.LLVMContext) {
  switch (name) {
    case "gc__allocate":
      return llvm.FunctionType.get(llvm.Type.getInt8PtrTy(context), [llvm.Type.getInt32Ty(context)], false);
    case "string__concat":
      return llvm.FunctionType.get(getStringType(context), [getStringType(context), getStringType(context)], false);
  }
}

export function getBuiltin(name: BuiltinName, context: llvm.LLVMContext, module: llvm.Module) {
  return module.getOrInsertFunction(name, getBuiltinFunctionType(name, context));
}

export function createGCAllocate(type: llvm.Type, generator: LLVMGenerator) {
  if (isValueType(type)) {
    return error(`Allocating value types not supported, tried to allocate '${type}'`);
  }
  const size = getSize(type, generator);
  const allocate = getBuiltin("gc__allocate", generator.context, generator.module);
  const returnValue = generator.builder.createCall(allocate, [llvm.ConstantInt.get(generator.context, size, 32)]);
  return generator.builder.createBitCast(returnValue, type.getPointerTo());
}
