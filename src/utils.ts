import * as llvm from "llvm-node";
import * as ts from "typescript";
import { error } from "./diagnostics";

export function replaceExtension(filePath: string, extension: string): string {
  return filePath.replace(/\.[^\.\/\\]+$/, "") + extension;
}

export function createLLVMFunction(
  returnType: llvm.Type,
  parameterTypes: llvm.Type[],
  name: string,
  module: llvm.Module
) {
  const type = llvm.FunctionType.get(returnType, parameterTypes, false);
  const linkage = llvm.LinkageTypes.ExternalLinkage;
  return llvm.Function.create(type, linkage, name, module);
}

export function getMemberIndex(name: string, declaration: ts.ClassDeclaration) {
  const index = declaration.members.findIndex(
    member => ts.isPropertyDeclaration(member) && member.name.getText() === name
  );
  if (index < 0) {
    return error(`Type '${declaration.name!.text}' has no field '${name}'`);
  }
  return index;
}

export function isValueType(type: llvm.Type) {
  return type.isDoubleTy() || type.isPointerTy();
}

export function getTypeArguments(type: ts.Type) {
  if (type.flags & ts.TypeFlags.Object) {
    if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
      return (type as ts.TypeReference).typeArguments || [];
    }
  }
  return [];
}

export function isMethodReference(expression: ts.Expression, checker: ts.TypeChecker): boolean {
  return (
    ts.isPropertyAccessExpression(expression) &&
    (checker.getTypeAtLocation(expression).symbol.flags & ts.SymbolFlags.Method) !== 0
  );
}

export function isArray(type: ts.Type) {
  return type.symbol.name === "Array";
}
