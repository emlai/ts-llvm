import * as llvm from "llvm-node";
import * as ts from "typescript";
import { error } from "./diagnostics";
import { getSize } from "./memory-layout";
import { getLLVMType } from "./types";
import { createLLVMFunction } from "./utils";

export function getBuiltin(name: string, context: llvm.LLVMContext, module: llvm.Module) {
  switch (name) {
    case "gc__allocate":
      const type = llvm.FunctionType.get(llvm.Type.getInt8PtrTy(context), [llvm.Type.getInt32Ty(context)], false);
      return module.getOrInsertFunction(name, type);
    default:
      return error(`Unknown builtin ${name}`);
  }
}

export function createGCAllocate(
  type: ts.Type | llvm.Type,
  context: llvm.LLVMContext,
  module: llvm.Module,
  builder: llvm.IRBuilder,
  checker: ts.TypeChecker
) {
  const size = getSize(type, checker, context, module);
  const allocate = getBuiltin("gc__allocate", context, module);
  const returnValue = builder.createCall(allocate, [llvm.ConstantInt.get(context, size, 32)]);
  const llvmType = type instanceof llvm.Type ? type : getLLVMType(checker.typeToTypeNode(type)!, context, checker);
  return builder.createBitCast(returnValue, llvmType.getPointerTo());
}
