import * as ts from "typescript";
import { error } from "./diagnostics";

export function isVarConst(node: ts.VariableDeclaration | ts.VariableDeclarationList): boolean {
  return !!(ts.getCombinedNodeFlags(node) & ts.NodeFlags.Const);
}

export function getPropertyIndex(name: string, type: ts.Type, checker: ts.TypeChecker): number {
  const properties = checker.getPropertiesOfType(type);
  const index = properties.findIndex(property => property.name === name);

  if (index < 0) {
    return error(`Type '${checker.typeToString(type)}' has no property '${name}'`);
  }

  return index;
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

export function isObject(type: ts.Type): type is ts.ObjectType {
  return !!(type.flags & ts.TypeFlags.Object);
}

export function isArray(type: ts.Type): type is ts.ObjectType {
  return type.symbol && type.symbol.name === "Array";
}

export function isString(type: ts.Type): boolean {
  return !!(type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral));
}

export function getTypeBaseName(type: ts.Type, checker: ts.TypeChecker) {
  return type.symbol ? type.symbol.name : checker.typeToString(checker.getBaseTypeOfLiteralType(type));
}

export function isProperty(symbol: ts.Symbol): boolean {
  return !!(symbol.flags & ts.SymbolFlags.Property);
}
