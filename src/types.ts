import * as llvm from "llvm-node";
import * as ts from "typescript";
import { error } from "./diagnostics";

export function getLLVMType(node: ts.TypeNode, context: llvm.LLVMContext): llvm.Type {
  switch (node.kind) {
    case ts.SyntaxKind.NumberKeyword:
      return llvm.Type.getDoubleTy(context);
    case ts.SyntaxKind.StringKeyword:
      return getStringType(context);
    case ts.SyntaxKind.VoidKeyword:
      return llvm.Type.getVoidTy(context);
    default:
      return error(`Unhandled ts.TypeNode '${ts.SyntaxKind[node.kind]}'`);
  }
}

let stringType: llvm.StructType | undefined;

export function getStringType(context: llvm.LLVMContext): llvm.StructType {
  if (!stringType) {
    stringType = llvm.StructType.create(context, "string");
    stringType.setBody([llvm.Type.getInt8PtrTy(context), llvm.Type.getInt32Ty(context)]);
  }
  return stringType;
}
