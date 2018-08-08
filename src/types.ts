import * as llvm from "llvm-node";
import * as ts from "typescript";
import { error } from "./diagnostics";

export function getLLVMType(node: ts.TypeNode, context: llvm.LLVMContext, checker: ts.TypeChecker): llvm.Type {
  switch (node.kind) {
    case ts.SyntaxKind.BooleanKeyword:
      return llvm.Type.getInt1Ty(context);
    case ts.SyntaxKind.NumberKeyword:
      return llvm.Type.getDoubleTy(context);
    case ts.SyntaxKind.StringKeyword:
      return getStringType(context);
    case ts.SyntaxKind.TypeLiteral:
      const typeLiteralNode = node as ts.TypeLiteralNode;
      const elements = typeLiteralNode.members.map(member => {
        switch (member.kind) {
          case ts.SyntaxKind.PropertySignature:
            const propertySignature = member as ts.PropertySignature;
            return getLLVMType(propertySignature.type!, context, checker);
          default:
            return error(`Unhandled ts.TypeElement '${ts.SyntaxKind[member.kind]}'`);
        }
      });
      return llvm.StructType.get(context, elements).getPointerTo();
    case ts.SyntaxKind.VoidKeyword:
      return llvm.Type.getVoidTy(context);
    case ts.SyntaxKind.AnyKeyword:
      return error("'any' type is not supported");
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
