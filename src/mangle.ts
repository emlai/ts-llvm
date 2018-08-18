import * as ts from "typescript";

export function mangleFunctionDeclaration(
  declaration: ts.NamedDeclaration,
  typeArguments: ReadonlyArray<ts.Type>,
  checker: ts.TypeChecker
): string {
  const { parent } = declaration;
  let parentName: string | undefined;

  if (ts.isModuleBlock(parent)) {
    parentName = parent.parent.name.text;
  } else if (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent)) {
    parentName = parent.name!.text;
  }

  const typeArgumentStrings = typeArguments.map(type => checker.typeToString(type));
  const scopePrefix = parentName ? [parentName, ...typeArgumentStrings].join("__") + "__" : "";

  const baseName = ts.isConstructorDeclaration(declaration) ? "constructor" : declaration.name!.getText();
  return scopePrefix + baseName;
}
