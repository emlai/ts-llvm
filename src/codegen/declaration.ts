import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { createGCAllocate } from "../builtins";
import { error } from "../diagnostics";
import { getDeclarationBaseName, mangleFunctionDeclaration, mangleType } from "../mangle";
import { Scope } from "../symbol-table";
import { addTypeArguments } from "../tsc-utils";
import { getLLVMType, getStringType, getStructType } from "../types";
import { createLLVMFunction, isValueType } from "../utils";
import { LLVMGenerator } from "./generator";

type FunctionLikeDeclaration =
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.MethodSignature
  | ts.IndexSignatureDeclaration
  | ts.PropertyDeclaration
  | ts.ConstructorDeclaration;

function getFunctionDeclarationScope(
  declaration: FunctionLikeDeclaration,
  thisType: ts.Type | undefined,
  generator: LLVMGenerator
): Scope {
  if (thisType) {
    return generator.symbolTable.get(mangleType(thisType, generator.checker)) as Scope;
  }

  const { parent } = declaration;

  if (ts.isSourceFile(parent)) {
    return generator.symbolTable.globalScope;
  } else if (ts.isModuleBlock(parent)) {
    return generator.symbolTable.get(parent.parent.name.text) as Scope;
  } else {
    return error(`Unhandled function declaration parent kind '${ts.SyntaxKind[parent.kind]}'`);
  }
}

export function emitFunctionDeclaration(
  declaration: FunctionLikeDeclaration,
  tsThisType: ts.Type | undefined,
  argumentTypes: ts.Type[],
  generator: LLVMGenerator
): llvm.Function | undefined {
  const preExisting = generator.module.getFunction(
    mangleFunctionDeclaration(declaration, tsThisType, generator.checker)
  );
  if (preExisting) {
    return preExisting;
  }

  const parentScope = getFunctionDeclarationScope(declaration, tsThisType, generator);
  const isConstructor = ts.isConstructorDeclaration(declaration);
  const hasThisParameter =
    ts.isMethodDeclaration(declaration) ||
    ts.isMethodSignature(declaration) ||
    ts.isIndexSignatureDeclaration(declaration) ||
    ts.isPropertyDeclaration(declaration);
  const thisType = tsThisType
    ? (generator.symbolTable.get(mangleType(tsThisType, generator.checker)) as Scope).data!.type
    : undefined;
  let thisValue: llvm.Value;

  let tsReturnType: ts.Type;
  if (ts.isIndexSignatureDeclaration(declaration) && tsThisType) {
    tsReturnType = generator.checker.getIndexTypeOfType(tsThisType, ts.IndexKind.Number)!;
  } else {
    if (ts.isPropertyDeclaration(declaration)) {
      tsReturnType = generator.checker.getTypeFromTypeNode(declaration.type!);
    } else {
      const signature = generator.checker.getSignatureFromDeclaration(declaration)!;
      tsReturnType = signature.getReturnType();
    }
  }

  let returnType = isConstructor ? thisType!.getPointerTo() : getLLVMType(tsReturnType, generator);
  if (ts.isIndexSignatureDeclaration(declaration)) {
    returnType = returnType.getPointerTo();
  }
  const parameterTypes = argumentTypes.map(argumentType => getLLVMType(argumentType, generator));
  if (hasThisParameter) {
    parameterTypes.unshift(isValueType(thisType!) ? thisType! : thisType!.getPointerTo());
  }
  const qualifiedName = mangleFunctionDeclaration(declaration, tsThisType, generator.checker);
  const func = createLLVMFunction(returnType, parameterTypes, qualifiedName, generator.module);
  const body =
    ts.isMethodSignature(declaration) ||
    ts.isIndexSignatureDeclaration(declaration) ||
    ts.isPropertyDeclaration(declaration)
      ? undefined
      : declaration.body;

  if (body) {
    generator.symbolTable.withScope(qualifiedName, bodyScope => {
      const parameterNames = ts.isPropertyDeclaration(declaration)
        ? []
        : generator.checker.getSignatureFromDeclaration(declaration)!.parameters.map(parameter => parameter.name);

      if (hasThisParameter) {
        parameterNames.unshift("this");
      }
      for (const [parameterName, argument] of R.zip(parameterNames, func.getArguments())) {
        argument.name = parameterName;
        bodyScope.set(parameterName, argument);
      }

      const entryBlock = llvm.BasicBlock.create(generator.context, "entry", func);
      generator.builder.setInsertionPoint(entryBlock);

      if (isConstructor) {
        thisValue = createGCAllocate(thisType!, generator);
        bodyScope.set("this", thisValue);
      }

      body.forEachChild(node => generator.emitNode(node, bodyScope));

      if (!generator.builder.getInsertBlock().getTerminator()) {
        if (returnType.isVoidTy()) {
          generator.builder.createRetVoid();
        } else if (isConstructor) {
          generator.builder.createRet(thisValue);
        } else {
          // TODO: Emit LLVM 'unreachable' instruction.
        }
      }
    });
  }

  llvm.verifyFunction(func);
  const name = getDeclarationBaseName(declaration);
  parentScope.set(name, func);
  return func;
}

export function visitInterfaceDeclaration(
  declaration: ts.InterfaceDeclaration,
  parentScope: Scope,
  generator: LLVMGenerator
) {
  const name = declaration.name.text;
  parentScope.set(name, new Scope(name));

  if (name === "String") {
    parentScope.set("string", new Scope(name, { declaration, type: getStringType(generator.context) }));
  }
}

export function emitClassDeclaration(
  declaration: ts.ClassDeclaration,
  typeArguments: ReadonlyArray<ts.Type>,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  if (declaration.typeParameters && typeArguments.length === 0) {
    return;
  }

  const thisType = addTypeArguments(generator.checker.getTypeAtLocation(declaration), typeArguments);

  const preExisting = generator.module.getTypeByName(mangleType(thisType, generator.checker));
  if (preExisting) {
    return;
  }

  const isOpaque = !!(ts.getCombinedModifierFlags(declaration) & ts.ModifierFlags.Ambient);
  const name = mangleType(thisType, generator.checker);
  const type = getStructType(thisType, isOpaque, generator);
  const scope = new Scope(name, { declaration, type });
  parentScope.set(name, scope);
  for (const method of declaration.members.filter(member => !ts.isPropertyDeclaration(member))) {
    generator.emitNode(method, scope);
  }
}

export function emitModuleDeclaration(
  declaration: ts.ModuleDeclaration,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  const name = declaration.name.text;
  const scope = new Scope(name);
  declaration.body!.forEachChild(node => generator.emitNode(node, scope));
  parentScope.set(name, scope);
}
