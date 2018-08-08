import * as llvm from "llvm-node";
import { error } from "./diagnostics";
import { createLLVMFunction } from "./utils";

export function getBuiltin(name: string, context: llvm.LLVMContext, module: llvm.Module) {
  switch (name) {
    case "gc__allocate":
      return createLLVMFunction(llvm.Type.getInt8PtrTy(context), [llvm.Type.getInt32Ty(context)], name, module);
    default:
      return error(`Unknown builtin ${name}`);
  }
}
