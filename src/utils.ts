import * as llvm from "llvm-node";
import * as ts from "typescript";
import { emitClassDeclaration } from "./codegen/declaration";
import { getOrEmitFunctionForCall } from "./codegen/expression";
import { LLVMGenerator } from "./codegen/generator";
import { error } from "./diagnostics";
import { getTypeArguments, isProperty } from "./tsc-utils";

export function replaceExtension(filePath: string, extension: string): string {
  return filePath.replace(/\.[^\.\/\\]+$/, "") + extension;
}

export function keepInsertionPoint<T>(builder: llvm.IRBuilder, emit: () => T): T {
  const backup = builder.getInsertBlock();
  const result = emit();
  builder.setInsertionPoint(backup);
  return result;
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

export function isValueType(type: llvm.Type) {
  return type.isDoubleTy() || type.isIntegerTy() || type.isPointerTy() || isLLVMString(type);
}

export function isLLVMString(type: llvm.Type) {
  return type.isStructTy() && type.name === "string";
}

export function getStoredProperties(type: ts.Type, checker: ts.TypeChecker) {
  return checker.getPropertiesOfType(type).filter(isProperty);
}

export function getMethod(type: ts.Type, name: string, argumentTypes: ts.Type[], generator: LLVMGenerator) {
  const typeDeclaration = type.symbol.valueDeclaration;

  if (!ts.isClassDeclaration(typeDeclaration)) {
    return error("Cannot get method of non-class type");
  }

  // TODO: Use correct scope.
  emitClassDeclaration(typeDeclaration, getTypeArguments(type), generator.symbolTable.globalScope, generator);
  let declaration: ts.Declaration | undefined;

  switch (name) {
    case "constructor":
      declaration = typeDeclaration.members.find(ts.isConstructorDeclaration);
      break;
    case "subscript":
      declaration = typeDeclaration.members.find(ts.isIndexSignatureDeclaration);
      break;
    default:
      const propertySymbol = generator.checker.getPropertyOfType(type, name)!;
      declaration = propertySymbol.valueDeclaration;
      break;
  }

  if (!declaration) {
    return error("Member declaration not found");
  }

  return getOrEmitFunctionForCall(declaration, type, argumentTypes, generator);
}
