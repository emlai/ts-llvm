import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { error, warn } from "./diagnostics";
import { mangleFunctionDeclaration } from "./mangle";
import { Scope, SymbolTable } from "./symbol-table";
import { getLLVMType, getStringType } from "./types";

export function emitLLVM(program: ts.Program): llvm.Module {
  const checker = program.getTypeChecker();
  const context = new llvm.LLVMContext();
  const module = new llvm.Module("main", context);
  const generator = new LLVMGenerator(checker, module, context);

  for (const sourceFile of program.getSourceFiles()) {
    generator.emitSourceFile(sourceFile);
  }

  llvm.verifyModule(module);
  return module;
}

class LLVMGenerator {
  private readonly checker: ts.TypeChecker;
  private readonly module: llvm.Module;
  private readonly context: llvm.LLVMContext;
  private readonly builder: llvm.IRBuilder;
  private readonly symbolTable: SymbolTable;

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
      case ts.SyntaxKind.FunctionDeclaration:
        this.emitFunctionDeclaration(node as ts.FunctionDeclaration, parentScope);
        break;
      case ts.SyntaxKind.ModuleDeclaration:
        this.emitModuleDeclaration(node as ts.ModuleDeclaration, parentScope);
        break;
      case ts.SyntaxKind.ExpressionStatement:
        this.emitExpressionStatement(node as ts.ExpressionStatement);
        break;
      case ts.SyntaxKind.ReturnStatement:
        this.emitReturnStatement(node as ts.ReturnStatement);
        break;
      case ts.SyntaxKind.EndOfFileToken:
        break;
      default:
        warn(`Unhandled ts.Node '${ts.SyntaxKind[node.kind]}'`);
    }
  }

  emitFunctionDeclaration(declaration: ts.FunctionDeclaration, parentScope: Scope): void {
    const signature = this.checker.getSignatureFromDeclaration(declaration)!;
    const returnType = getLLVMType(this.checker.typeToTypeNode(signature.getReturnType()), this.context);
    const parameterTypes = declaration.parameters.map(parameter => getLLVMType(parameter.type!, this.context));
    const type = llvm.FunctionType.get(returnType, parameterTypes, false);
    const linkage = llvm.LinkageTypes.ExternalLinkage;
    const qualifiedName = mangleFunctionDeclaration(declaration, parentScope);
    const func = llvm.Function.create(type, linkage, qualifiedName, this.module);
    const body = declaration.body;

    if (body) {
      this.symbolTable.withScope(qualifiedName, bodyScope => {
        for (const [parameter, argument] of R.zip(signature.parameters, func.getArguments())) {
          argument.name = parameter.name;
          bodyScope.set(parameter.name, argument);
        }

        const entryBlock = llvm.BasicBlock.create(this.context, "entry", func);
        this.builder.setInsertionPoint(entryBlock);
        body.forEachChild(node => this.emitNode(node, bodyScope));

        if (!this.builder.getInsertBlock().getTerminator()) {
          this.builder.createRetVoid();
        }
      });
    }

    llvm.verifyFunction(func);
    parentScope.set(declaration.name!.text, func);
  }

  emitModuleDeclaration(declaration: ts.ModuleDeclaration, parentScope: Scope): void {
    const name = declaration.name.text;
    const scope = new Scope(name);
    declaration.body!.forEachChild(node => this.emitNode(node, scope));
    parentScope.set(name, scope);
  }

  emitExpressionStatement(statement: ts.ExpressionStatement): void {
    this.emitExpression(statement.expression);
  }

  emitReturnStatement(statement: ts.ReturnStatement): void {
    if (statement.expression) {
      this.builder.createRet(this.emitExpression(statement.expression));
    } else {
      this.builder.createRetVoid();
    }
  }

  emitExpression(expression: ts.Expression): llvm.Value {
    switch (expression.kind) {
      case ts.SyntaxKind.BinaryExpression:
        return this.emitBinaryExpression(expression as ts.BinaryExpression);
      case ts.SyntaxKind.CallExpression:
        return this.emitCallExpression(expression as ts.CallExpression);
      case ts.SyntaxKind.PropertyAccessExpression:
        return this.emitPropertyAccessExpression(expression as ts.PropertyAccessExpression);
      case ts.SyntaxKind.Identifier:
        return this.emitIdentifier(expression as ts.Identifier);
      case ts.SyntaxKind.StringLiteral:
        return this.emitStringLiteral(expression as ts.StringLiteral);
      default:
        return error(`Unhandled ts.Expression '${ts.SyntaxKind[expression.kind]}'`);
    }
  }

  emitBinaryExpression(expression: ts.BinaryExpression): llvm.Value {
    const left = this.emitExpression(expression.left);
    const right = this.emitExpression(expression.right);

    switch (expression.operatorToken.kind) {
      case ts.SyntaxKind.PlusToken:
        return this.builder.createFAdd(left, right);
      default:
        return error(`Unhandled ts.BinaryExpression operator '${ts.SyntaxKind[expression.operatorToken.kind]}'`);
    }
  }

  emitCallExpression(expression: ts.CallExpression): llvm.Value {
    const callee = this.emitExpression(expression.expression);
    const args = expression.arguments.map(argument => this.emitExpression(argument));
    return this.builder.createCall(callee, args);
  }

  emitPropertyAccessExpression(expression: ts.PropertyAccessExpression): llvm.Value {
    const left = expression.expression;
    const propertyName = expression.name.text;

    // TODO: Handle arbitrarily long namespace access chains.
    if (ts.isIdentifier(left)) {
      const value = this.symbolTable.get(left.text);
      if (value instanceof Scope) {
        return value.get(propertyName) as llvm.Value;
      }
    }

    // TODO: Implement object property access.
    return error("Object property access not implemented yet");
  }

  emitIdentifier(expression: ts.Identifier): llvm.Value {
    return this.symbolTable.get(expression.text) as llvm.Value;
  }

  emitStringLiteral(expression: ts.StringLiteral): llvm.Value {
    const ptr = this.builder.createGlobalStringPtr(expression.text) as llvm.Constant;
    const length = llvm.ConstantInt.get(this.context, expression.text.length);
    return llvm.ConstantStruct.get(getStringType(this.context), [ptr, length]);
  }
}
