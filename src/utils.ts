import * as llvm from "llvm-node";
import * as ts from "typescript";

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
  return declaration.members.findIndex(member => member.name!.getText() === name);
}

export function isValueType(type: llvm.Type) {
  return type.isDoubleTy();
}
