import * as llvm from "llvm-node";
import { LLVMGenerator } from "./codegen/generator";

export function getSize(type: llvm.Type, generator: LLVMGenerator): number {
  return generator.module.dataLayout.getTypeStoreSize(type);
}
