import * as llvm from "llvm-node";
import * as ts from "typescript";
import { error } from "./diagnostics";

export function getLLVMType(type: ts.Type, context: llvm.LLVMContext, checker: ts.TypeChecker): llvm.Type {
  // tslint:disable:no-bitwise

  if (type.flags & ts.TypeFlags.Boolean) {
    return llvm.Type.getInt1Ty(context);
  }

  if (type.flags & ts.TypeFlags.Number) {
    return llvm.Type.getDoubleTy(context);
  }

  if (type.flags & ts.TypeFlags.String) {
    return getStringType(context);
  }

  if (type.flags & ts.TypeFlags.Object) {
    const elements = checker.getPropertiesOfType(type).map(property => {
      const declaration = property.declarations[0];
      switch (declaration.kind) {
        case ts.SyntaxKind.PropertyAssignment:
          return getLLVMType(checker.getTypeAtLocation(declaration as ts.PropertyAssignment), context, checker);
        default:
          return error(`Unhandled ts.Declaration '${ts.SyntaxKind[declaration.kind]}'`);
      }
    });
    return llvm.StructType.get(context, elements);
  }

  if (type.flags & ts.TypeFlags.Void) {
    return llvm.Type.getVoidTy(context);
  }

  if (type.flags & ts.TypeFlags.Any) {
    return error("'any' type is not supported");
  }

  // tslint:enable:no-bitwise
  return error(`Unhandled ts.Type '${checker.typeToString(type)}'`);
}

let stringType: llvm.StructType | undefined;

export function getStringType(context: llvm.LLVMContext): llvm.StructType {
  if (!stringType) {
    stringType = llvm.StructType.create(context, "string");
    stringType.setBody([llvm.Type.getInt8PtrTy(context), llvm.Type.getInt32Ty(context)]);
  }
  return stringType;
}
