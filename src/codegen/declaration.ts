import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { createGCAllocate } from "../builtins";
import { error } from "../diagnostics";
import { getDeclarationBaseName, mangleFunctionDeclaration, mangleType } from "../mangle";
import { Scope } from "../symbol-table";
import { getLLVMType, getStructType } from "../types";
import { addTypeArguments, createLLVMFunction } from "../utils";
import { LLVMGenerator } from "./generator";

type FunctionLikeDeclaration =
  | ts.FunctionDeclaration
  | ts.MethodDeclaration
  | ts.IndexSignatureDeclaration
  | ts.PropertyDeclaration
  | ts.ConstructorDeclaration;

function getFunctionDeclarationScope(declaration: FunctionLikeDeclaration, generator: LLVMGenerator) {
  const { parent } = declaration;

  if (ts.isSourceFile(parent)) {
    return generator.symbolTable.globalScope;
  } else if (ts.isModuleBlock(parent)) {
    return generator.symbolTable.get(parent.parent.name.text) as Scope;
  } else if (ts.isClassDeclaration(parent) || ts.isInterfaceDeclaration(parent)) {
    return generator.symbolTable.get(parent.name!.text) as Scope;
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

  const parentScope = getFunctionDeclarationScope(declaration, generator);
  const isConstructor = ts.isConstructorDeclaration(declaration);
  const hasThisParameter =
    ts.isMethodDeclaration(declaration) ||
    ts.isIndexSignatureDeclaration(declaration) ||
    ts.isPropertyDeclaration(declaration);

  let thisType: llvm.StructType | undefined;
  if (isConstructor || hasThisParameter) {
    const parent = (declaration as ts.ConstructorDeclaration | ts.MethodDeclaration).parent as ts.ClassDeclaration;
    thisType = (generator.symbolTable.get(parent.name!.text) as Scope).data!.type;
  }
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
    parameterTypes.unshift(thisType!.getPointerTo());
  }
  const qualifiedName = mangleFunctionDeclaration(declaration, tsThisType, generator.checker);
  const func = createLLVMFunction(returnType, parameterTypes, qualifiedName, generator.module);
  const body =
    ts.isIndexSignatureDeclaration(declaration) || ts.isPropertyDeclaration(declaration) ? undefined : declaration.body;

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
  const name = declaration.name!.text;
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
