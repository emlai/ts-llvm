import * as llvm from "llvm-node";
import { LLVMGenerator } from "./codegen/generator";
import { error } from "./diagnostics";
import { getSize } from "./memory-layout";
import { isValueType } from "./utils";

export function getBuiltin(name: string, context: llvm.LLVMContext, module: llvm.Module) {
  switch (name) {
    case "gc__allocate":
      const type = llvm.FunctionType.get(llvm.Type.getInt8PtrTy(context), [llvm.Type.getInt32Ty(context)], false);
      return module.getOrInsertFunction(name, type);
    default:
      return error(`Unknown builtin ${name}`);
  }
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
