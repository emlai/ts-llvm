import * as llvm from "llvm-node";

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
