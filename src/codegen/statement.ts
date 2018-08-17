import * as llvm from "llvm-node";
import * as ts from "typescript";
import { Scope } from "../symbol-table";
import { isVarConst } from "../tsc-utils";
import { getLLVMType } from "../types";
import { LLVMGenerator } from "./generator";

export function emitBlock(block: ts.Block, generator: LLVMGenerator): void {
  generator.symbolTable.withScope(undefined, scope => {
    for (const statement of block.statements) {
      generator.emitNode(statement, scope);
    }
  });
}

function emitIfBranch(
  block: ts.Statement | undefined,
  destination: llvm.BasicBlock,
  continuation: llvm.BasicBlock,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  generator.builder.setInsertionPoint(destination);

  if (block) {
    generator.emitNode(block, parentScope);
  }

  if (!generator.builder.getInsertBlock().getTerminator()) {
    generator.builder.createBr(continuation);
  }
}

export function emitExpressionStatement(statement: ts.ExpressionStatement, generator: LLVMGenerator): void {
  generator.emitExpression(statement.expression);
}

export function emitIfStatement(statement: ts.IfStatement, parentScope: Scope, generator: LLVMGenerator): void {
  const condition = generator.emitExpression(statement.expression);
  const thenBlock = llvm.BasicBlock.create(generator.context, "then", generator.currentFunction);
  const elseBlock = llvm.BasicBlock.create(generator.context, "else", generator.currentFunction);
  const endBlock = llvm.BasicBlock.create(generator.context, "endif", generator.currentFunction);
  generator.builder.createCondBr(condition, thenBlock, elseBlock);
  emitIfBranch(statement.thenStatement, thenBlock, endBlock, parentScope, generator);
  emitIfBranch(statement.elseStatement, elseBlock, endBlock, parentScope, generator);
  generator.builder.setInsertionPoint(endBlock);
}

export function emitReturnStatement(statement: ts.ReturnStatement, generator: LLVMGenerator): void {
  if (statement.expression) {
    generator.builder.createRet(
      generator.createLoadIfAllocaOrPointerToValueType(generator.emitExpression(statement.expression))
    );
  } else {
    generator.builder.createRetVoid();
  }
}

export function emitVariableStatement(
  statement: ts.VariableStatement,
  parentScope: Scope,
  generator: LLVMGenerator
): void {
  for (const declaration of statement.declarationList.declarations) {
    // TODO: Handle destructuring declarations.
    const name = declaration.name.getText();
    const initializer = generator.createLoadIfAllocaOrPointerToValueType(
      generator.emitExpression(declaration.initializer!)
    );

    if (isVarConst(declaration)) {
      if (!initializer.hasName()) {
        initializer.name = name;
      }
      parentScope.set(name, initializer);
    } else {
      const type = generator.checker.typeToTypeNode(generator.checker.getTypeAtLocation(declaration))!;
      const alloca = createEntryBlockAlloca(getLLVMType(type, generator.context, generator.checker), name, generator);
      generator.builder.createStore(initializer, alloca);
      parentScope.set(name, alloca);
    }
  }
}

function createEntryBlockAlloca(type: llvm.Type, name: string, generator: LLVMGenerator): llvm.AllocaInst {
  const builder = new llvm.IRBuilder(generator.currentFunction.getEntryBlock()!);
  const arraySize = undefined;
  return builder.createAlloca(type, arraySize, name);
}

