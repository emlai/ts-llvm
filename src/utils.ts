import * as llvm from "llvm-node";
import * as ts from "typescript";
import { emitClassDeclaration } from "./codegen/declaration";
import { getOrEmitFunctionForCall } from "./codegen/expression";
import { LLVMGenerator } from "./codegen/generator";
import { error } from "./diagnostics";

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
  return type.isDoubleTy() || type.isIntegerTy() || type.isPointerTy() || isString(type);
}

export function getTypeArguments(type: ts.Type) {
  if (type.flags & ts.TypeFlags.Object) {
    if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
      return (type as ts.TypeReference).typeArguments || [];
    }
  }
  return [];
}

export function addTypeArguments(type: ts.Type, typeArguments: ReadonlyArray<ts.Type>): ts.TypeReference {
  if (type.flags & ts.TypeFlags.Object) {
    if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
      const typeReference = type as ts.TypeReference;
      return { ...typeReference, typeArguments };
    }
  }

  return error("Invalid type");
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

export function isString(type: llvm.Type) {
  return type.isStructTy() && type.name === "string";
}

export function getTypeBaseName(type: ts.Type, checker: ts.TypeChecker) {
  return type.symbol ? type.symbol.name : checker.typeToString(checker.getBaseTypeOfLiteralType(type));
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
