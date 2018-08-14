import * as ts from "typescript";
import { Scope } from "./symbol-table";

export function mangleFunctionDeclaration(declaration: ts.NamedDeclaration, parentScope: Scope): string {
  const scopePrefix = parentScope.name ? parentScope.name + "__" : "";
  const baseName = ts.isConstructorDeclaration(declaration) ? "constructor" : declaration.name!.getText();
  return scopePrefix + baseName;
}
