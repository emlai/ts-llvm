import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { error, warn } from "../diagnostics";
import { Scope, SymbolTable } from "../symbol-table";
import { createLLVMFunction, isValueType } from "../utils";
import { emitClassDeclaration, emitModuleDeclaration, visitInterfaceDeclaration } from "./declaration";
import {
  emitArrayLiteralExpression,
  emitBinaryExpression,
  emitBooleanLiteral,
  emitCallExpression,
  emitElementAccessExpression,
  emitIdentifier,
  emitNewExpression,
  emitNumericLiteral,
  emitObjectLiteralExpression,
  emitPostfixUnaryExpression,
  emitPrefixUnaryExpression,
  emitPropertyAccessExpression,
  emitStringLiteral,
  emitThis
} from "./expression";
import {
  emitBlock,
  emitExpressionStatement,
  emitIfStatement,
  emitReturnStatement,
  emitVariableStatement,
  emitWhileStatement
} from "./statement";

export function emitLLVM(program: ts.Program): llvm.Module {
  const checker = program.getTypeChecker();
  const context = new llvm.LLVMContext();
  const module = new llvm.Module("main", context);
  const generator = new LLVMGenerator(checker, module, context);
  const { builder } = generator;

  const mainReturnType = llvm.Type.getInt32Ty(context);
  const main = createLLVMFunction(mainReturnType, [], "main", module);
  llvm.BasicBlock.create(context, "entry", main);

  // TODO: Emit top-level statements in correct order to main function when there are multiple source files.
  for (const sourceFile of program.getSourceFiles()) {
    generator.emitSourceFile(sourceFile);
  }

  builder.setInsertionPoint(R.last(main.getBasicBlocks())!);
  builder.createRet(llvm.Constant.getNullValue(mainReturnType));

  try {
    llvm.verifyModule(module);
  } catch (error) {
    error.message += "\n" + module.print();
    throw error;
  }

  return module;
}

export class LLVMGenerator {
  readonly checker: ts.TypeChecker;
  readonly module: llvm.Module;
  readonly context: llvm.LLVMContext;
  readonly builder: llvm.IRBuilder;
  readonly symbolTable: SymbolTable;

  constructor(checker: ts.TypeChecker, module: llvm.Module, context: llvm.LLVMContext) {
    this.checker = checker;
    this.module = module;
    this.context = context;
    this.builder = new llvm.IRBuilder(context);
    this.symbolTable = new SymbolTable();
  }

  emitSourceFile(sourceFile: ts.SourceFile) {
    sourceFile.forEachChild(node => this.emitNode(node, this.symbolTable.globalScope));
  }

  emitNode(node: ts.Node, parentScope: Scope): void {
    switch (node.kind) {
      case ts.SyntaxKind.Block:
      case ts.SyntaxKind.ExpressionStatement:
      case ts.SyntaxKind.IfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.ReturnStatement:
      case ts.SyntaxKind.VariableStatement:
        if (parentScope === this.symbolTable.globalScope) {
          this.builder.setInsertionPoint(R.last(this.module.getFunction("main").getBasicBlocks())!);
        }
        break;
    }

    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
      case ts.SyntaxKind.MethodDeclaration:
      case ts.SyntaxKind.IndexSignature:
      case ts.SyntaxKind.Constructor:
        // Emitted when called.
        break;
      case ts.SyntaxKind.InterfaceDeclaration:
        visitInterfaceDeclaration(node as ts.InterfaceDeclaration, parentScope, this);
        break;
      case ts.SyntaxKind.ClassDeclaration:
        emitClassDeclaration(node as ts.ClassDeclaration, [], parentScope, this);
        break;
      case ts.SyntaxKind.ModuleDeclaration:
        emitModuleDeclaration(node as ts.ModuleDeclaration, parentScope, this);
        break;
      case ts.SyntaxKind.Block:
        emitBlock(node as ts.Block, this);
        break;
      case ts.SyntaxKind.ExpressionStatement:
        emitExpressionStatement(node as ts.ExpressionStatement, this);
        break;
      case ts.SyntaxKind.IfStatement:
        emitIfStatement(node as ts.IfStatement, parentScope, this);
        break;
      case ts.SyntaxKind.WhileStatement:
        emitWhileStatement(node as ts.WhileStatement, this);
        break;
      case ts.SyntaxKind.ReturnStatement:
        emitReturnStatement(node as ts.ReturnStatement, this);
        break;
      case ts.SyntaxKind.VariableStatement:
        emitVariableStatement(node as ts.VariableStatement, parentScope, this);
        break;
      case ts.SyntaxKind.EndOfFileToken:
        break;
      default:
        warn(`Unhandled ts.Node '${ts.SyntaxKind[node.kind]}': ${node.getText()}`);
    }
  }

  emitLvalueExpression(expression: ts.Expression): llvm.Value {
    switch (expression.kind) {
      case ts.SyntaxKind.PrefixUnaryExpression:
        return emitPrefixUnaryExpression(expression as ts.PrefixUnaryExpression, this);
      case ts.SyntaxKind.PostfixUnaryExpression:
        return emitPostfixUnaryExpression(expression as ts.PostfixUnaryExpression, this);
      case ts.SyntaxKind.BinaryExpression:
        return emitBinaryExpression(expression as ts.BinaryExpression, this);
      case ts.SyntaxKind.CallExpression:
        return emitCallExpression(expression as ts.CallExpression, this);
      case ts.SyntaxKind.PropertyAccessExpression:
        return emitPropertyAccessExpression(expression as ts.PropertyAccessExpression, this);
      case ts.SyntaxKind.ElementAccessExpression:
        return emitElementAccessExpression(expression as ts.ElementAccessExpression, this);
      case ts.SyntaxKind.Identifier:
        return emitIdentifier(expression as ts.Identifier, this);
      case ts.SyntaxKind.ThisKeyword:
        return emitThis(this);
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return emitBooleanLiteral(expression as ts.BooleanLiteral, this);
      case ts.SyntaxKind.NumericLiteral:
        return emitNumericLiteral(expression as ts.NumericLiteral, this);
      case ts.SyntaxKind.StringLiteral:
        return emitStringLiteral(expression as ts.StringLiteral, this);
      case ts.SyntaxKind.ArrayLiteralExpression:
        return emitArrayLiteralExpression(expression as ts.ArrayLiteralExpression, this);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return emitObjectLiteralExpression(expression as ts.ObjectLiteralExpression, this);
      case ts.SyntaxKind.NewExpression:
        return emitNewExpression(expression as ts.NewExpression, this);
      case ts.SyntaxKind.ParenthesizedExpression:
        return this.emitLvalueExpression((expression as ts.ParenthesizedExpression).expression);
      default:
        return error(`Unhandled ts.Expression '${ts.SyntaxKind[expression.kind]}'`);
    }
  }

  emitExpression(expression: ts.Expression): llvm.Value {
    return this.convertToRvalue(this.emitLvalueExpression(expression));
  }

  convertToRvalue(value: llvm.Value) {
    if (value.type.isPointerTy() && isValueType(value.type.elementType)) {
      return this.builder.createLoad(value, value.name + ".load");
    }
    return value;
  }

  get currentFunction(): llvm.Function {
    return this.builder.getInsertBlock().parent!;
  }
}
