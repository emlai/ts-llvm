import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { createGCAllocate } from "../builtins";
import { mangleFunctionDeclaration } from "../mangle";
import { Scope } from "../symbol-table";
import { getLLVMType } from "../types";
import { createLLVMFunction } from "../utils";
import { LLVMGenerator } from "./generator";

export function emitFunctionDeclaration(
  declaration: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  const isConstructor = ts.isConstructorDeclaration(declaration);
  const isMethod = ts.isMethodDeclaration(declaration);
  let thisType: llvm.StructType | undefined;
  if (isConstructor || isMethod) {
    const parent = (declaration as ts.ConstructorDeclaration | ts.MethodDeclaration).parent as ts.ClassLikeDeclaration;
    thisType = (generator.symbolTable.get(parent.name!.text) as Scope).data!.type;
  }
  let thisValue: llvm.Value;
  const signature = generator.checker.getSignatureFromDeclaration(declaration)!;
  const returnType = isConstructor
    ? thisType!.getPointerTo()
    : getLLVMType(generator.checker.typeToTypeNode(signature.getReturnType())!, generator.context, generator.checker);
  const parameterTypes = declaration.parameters.map(parameter =>
    getLLVMType(parameter.type!, generator.context, generator.checker)
  );
  if (isMethod) {
    parameterTypes.unshift(thisType!.getPointerTo());
  }
  const qualifiedName = mangleFunctionDeclaration(declaration, parentScope);
  const func = createLLVMFunction(returnType, parameterTypes, qualifiedName, generator.module);
  const body = declaration.body;

  if (body) {
    generator.symbolTable.withScope(qualifiedName, bodyScope => {
      const parameterNames = signature.parameters.map(parameter => parameter.name);
      if (isMethod) {
        parameterNames.unshift("this");
      }
      for (const [parameterName, argument] of R.zip(parameterNames, func.getArguments())) {
        argument.name = parameterName;
        bodyScope.set(parameterName, argument);
      }

      const entryBlock = llvm.BasicBlock.create(generator.context, "entry", func);
      generator.builder.setInsertionPoint(entryBlock);

      if (isConstructor) {
        thisValue = createGCAllocate(
          thisType!,
          generator.context,
          generator.module,
          generator.builder,
          generator.checker
        );
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
  const name = isConstructor ? "constructor" : declaration.name!.getText();
  parentScope.set(name, func);
}

export function emitClassDeclaration(
  declaration: ts.ClassDeclaration,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  const name = declaration.name!.text;
  const type = llvm.StructType.create(generator.context, name);
  const members = declaration.members
    .filter(ts.isPropertyDeclaration)
    .map(member => getLLVMType((member as ts.PropertyDeclaration).type!, generator.context, generator.checker));
  type.setBody(members);

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
