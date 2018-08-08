import * as ts from "typescript";
import { getLLVMType } from "./types";

export const bitsPerByte = 8;

export function getSize(type: ts.Type, checker: ts.TypeChecker, context: llvm.LLVMContext): number {
  const llvmType = getLLVMType(checker.typeToTypeNode(type)!, context, checker);
  return llvmType.getPrimitiveSizeInBits() / bitsPerByte;
}
