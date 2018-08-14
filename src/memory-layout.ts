import * as llvm from "llvm-node";
import * as ts from "typescript";
import { getLLVMType } from "./types";

export function getSize(
  type: ts.Type | llvm.Type,
  checker: ts.TypeChecker,
  context: llvm.LLVMContext,
  module: llvm.Module
): number {
  const llvmType = type instanceof llvm.Type ? type : getLLVMType(checker.typeToTypeNode(type)!, context, checker);
  return module.dataLayout.getTypeStoreSize(llvmType);
}
