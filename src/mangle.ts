import * as ts from "typescript";
import { Scope } from "./symbol-table";

export function mangleFunctionDeclaration(declaration: ts.NamedDeclaration, parentScope: Scope): string {
  const scopePrefix = parentScope.name ? parentScope.name + "__" : "";
  return scopePrefix + declaration.name!.getText();
}
