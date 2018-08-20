import * as ts from "typescript";
import { error } from "./diagnostics";
import { getTypeArguments, getTypeBaseName } from "./tsc-utils";

export function getDeclarationBaseName(declaration: ts.NamedDeclaration) {
  switch (declaration.kind) {
    case ts.SyntaxKind.Constructor:
      return "constructor";
    case ts.SyntaxKind.IndexSignature:
      return "subscript";
    default:
      return declaration.name!.getText();
  }
}

export function mangleFunctionDeclaration(
  declaration: ts.NamedDeclaration,
  thisType: ts.Type | undefined,
  checker: ts.TypeChecker
): string {
  const { parent } = declaration;
  let parentName: string | undefined;

  if (!thisType && (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent))) {
    return error("Mangling methods requires thisType");
  }

  if (thisType) {
    parentName = mangleType(thisType, checker);
  } else if (ts.isModuleBlock(parent)) {
    parentName = parent.parent.name.text;
  }

  const scopePrefix = parentName ? parentName + "__" : "";
  const baseName = getDeclarationBaseName(declaration);
  return scopePrefix + baseName;
}

export function mangleType(type: ts.Type, checker: ts.TypeChecker): string {
  const typeArguments = getTypeArguments(type).map(typeArgument => mangleType(typeArgument, checker));
  return [getTypeBaseName(type, checker), ...typeArguments].join("__");
}
