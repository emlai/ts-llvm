import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { createGCAllocate } from "./builtins";
import { error, warn } from "./diagnostics";
import { mangleFunctionDeclaration } from "./mangle";
import { Scope, SymbolTable } from "./symbol-table";
import { isVarConst } from "./tsc-utils";
import { getLLVMType, getStringType } from "./types";
import { createLLVMFunction, getMemberIndex, isValueType } from "./utils";

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

  llvm.verifyModule(module);
  return module;
}

class LLVMGenerator {
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
      case ts.SyntaxKind.ReturnStatement:
      case ts.SyntaxKind.VariableStatement:
        if (parentScope === this.symbolTable.globalScope) {
          this.builder.setInsertionPoint(R.last(this.module.getFunction("main").getBasicBlocks())!);
        }
        break;
    }

    switch (node.kind) {
      case ts.SyntaxKind.FunctionDeclaration:
        this.emitFunctionDeclaration(node as ts.FunctionDeclaration, parentScope);
        break;
      case ts.SyntaxKind.MethodDeclaration:
        this.emitFunctionDeclaration(node as ts.MethodDeclaration, parentScope);
        break;
      case ts.SyntaxKind.Constructor:
        this.emitFunctionDeclaration(node as ts.ConstructorDeclaration, parentScope);
        break;
      case ts.SyntaxKind.ClassDeclaration:
        this.emitClassDeclaration(node as ts.ClassDeclaration, parentScope);
        break;
      case ts.SyntaxKind.ModuleDeclaration:
        this.emitModuleDeclaration(node as ts.ModuleDeclaration, parentScope);
        break;
      case ts.SyntaxKind.Block:
        this.emitBlock(node as ts.Block);
        break;
      case ts.SyntaxKind.ExpressionStatement:
        this.emitExpressionStatement(node as ts.ExpressionStatement);
        break;
      case ts.SyntaxKind.IfStatement:
        this.emitIfStatement(node as ts.IfStatement, parentScope);
        break;
      case ts.SyntaxKind.ReturnStatement:
        this.emitReturnStatement(node as ts.ReturnStatement);
        break;
      case ts.SyntaxKind.VariableStatement:
        this.emitVariableStatement(node as ts.VariableStatement, parentScope);
        break;
      case ts.SyntaxKind.EndOfFileToken:
      case ts.SyntaxKind.InterfaceDeclaration:
        break;
      default:
        warn(`Unhandled ts.Node '${ts.SyntaxKind[node.kind]}': ${node.getText()}`);
    }
  }

  emitFunctionDeclaration(
    declaration: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ConstructorDeclaration,
    parentScope: Scope
  ): void {
    const isConstructor = ts.isConstructorDeclaration(declaration);
    const thisType = isConstructor
      ? (this.symbolTable.get((declaration as ts.ConstructorDeclaration).parent.name!.text) as Scope).data!.type
      : undefined;
    let thisValue: llvm.Value;
    const signature = this.checker.getSignatureFromDeclaration(declaration)!;
    const returnType = isConstructor
      ? thisType!.getPointerTo()
      : getLLVMType(this.checker.typeToTypeNode(signature.getReturnType())!, this.context, this.checker);
    const parameterTypes = declaration.parameters.map(parameter =>
      getLLVMType(parameter.type!, this.context, this.checker)
    );
    const qualifiedName = mangleFunctionDeclaration(declaration, parentScope);
    const func = createLLVMFunction(returnType, parameterTypes, qualifiedName, this.module);
    const body = declaration.body;

    if (body) {
      this.symbolTable.withScope(qualifiedName, bodyScope => {
        for (const [parameter, argument] of R.zip(signature.parameters, func.getArguments())) {
          argument.name = parameter.name;
          bodyScope.set(parameter.name, argument);
        }

        const entryBlock = llvm.BasicBlock.create(this.context, "entry", func);
        this.builder.setInsertionPoint(entryBlock);

        if (isConstructor) {
          thisValue = createGCAllocate(thisType!, this.context, this.module, this.builder, this.checker);
          bodyScope.set("this", thisValue);
        }

        body.forEachChild(node => this.emitNode(node, bodyScope));

        if (!this.builder.getInsertBlock().getTerminator()) {
          if (returnType.isVoidTy()) {
            this.builder.createRetVoid();
          } else if (isConstructor) {
            this.builder.createRet(thisValue);
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

  emitClassDeclaration(declaration: ts.ClassDeclaration, parentScope: Scope): void {
    const name = declaration.name!.text;
    const type = llvm.StructType.create(this.context, name);
    const members = declaration.members
      .filter(ts.isPropertyDeclaration)
      .map(member => getLLVMType((member as ts.PropertyDeclaration).type!, this.context, this.checker));
    type.setBody(members);

    const scope = new Scope(name, { declaration, type });
    parentScope.set(name, scope);
    for (const method of declaration.members.filter(member => !ts.isPropertyDeclaration(member))) {
      this.emitNode(method, scope);
    }
  }

  emitModuleDeclaration(declaration: ts.ModuleDeclaration, parentScope: Scope): void {
    const name = declaration.name.text;
    const scope = new Scope(name);
    declaration.body!.forEachChild(node => this.emitNode(node, scope));
    parentScope.set(name, scope);
  }

  emitBlock(block: ts.Block): void {
    this.symbolTable.withScope(undefined, scope => {
      for (const statement of block.statements) {
        this.emitNode(statement, scope);
      }
    });
  }

  emitIfBranch(
    block: ts.Statement | undefined,
    destination: llvm.BasicBlock,
    continuation: llvm.BasicBlock,
    parentScope: Scope
  ): void {
    this.builder.setInsertionPoint(destination);

    if (block) {
      this.emitNode(block, parentScope);
    }

    if (!this.builder.getInsertBlock().getTerminator()) {
      this.builder.createBr(continuation);
    }
  }

  emitExpressionStatement(statement: ts.ExpressionStatement): void {
    this.emitExpression(statement.expression);
  }

  emitIfStatement(statement: ts.IfStatement, parentScope: Scope): void {
    const condition = this.emitExpression(statement.expression);
    const thenBlock = llvm.BasicBlock.create(this.context, "then", this.currentFunction);
    const elseBlock = llvm.BasicBlock.create(this.context, "else", this.currentFunction);
    const endBlock = llvm.BasicBlock.create(this.context, "endif", this.currentFunction);
    this.builder.createCondBr(condition, thenBlock, elseBlock);
    this.emitIfBranch(statement.thenStatement, thenBlock, endBlock, parentScope);
    this.emitIfBranch(statement.elseStatement, elseBlock, endBlock, parentScope);
    this.builder.setInsertionPoint(endBlock);
  }

  emitReturnStatement(statement: ts.ReturnStatement): void {
    if (statement.expression) {
      this.builder.createRet(this.createLoadIfAllocaOrPointerToValueType(this.emitExpression(statement.expression)));
    } else {
      this.builder.createRetVoid();
    }
  }

  emitVariableStatement(statement: ts.VariableStatement, parentScope: Scope): void {
    for (const declaration of statement.declarationList.declarations) {
      // TODO: Handle destructuring declarations.
      const name = declaration.name.getText();
      const initializer = this.createLoadIfAllocaOrPointerToValueType(this.emitExpression(declaration.initializer!));

      if (isVarConst(declaration)) {
        if (!initializer.hasName()) {
          initializer.name = name;
        }
        parentScope.set(name, initializer);
      } else {
        const type = this.checker.typeToTypeNode(this.checker.getTypeAtLocation(declaration))!;
        const alloca = this.createEntryBlockAlloca(getLLVMType(type, this.context, this.checker), name);
        this.builder.createStore(initializer, alloca);
        parentScope.set(name, alloca);
      }
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
      case ts.SyntaxKind.TrueKeyword:
      case ts.SyntaxKind.FalseKeyword:
        return this.emitBooleanLiteral(expression as ts.BooleanLiteral);
      case ts.SyntaxKind.NumericLiteral:
        return this.emitNumericLiteral(expression as ts.NumericLiteral);
      case ts.SyntaxKind.StringLiteral:
        return this.emitStringLiteral(expression as ts.StringLiteral);
      case ts.SyntaxKind.ObjectLiteralExpression:
        return this.emitObjectLiteralExpression(expression as ts.ObjectLiteralExpression);
      case ts.SyntaxKind.NewExpression:
        return this.emitNewExpression(expression as ts.NewExpression);
      default:
        return error(`Unhandled ts.Expression '${ts.SyntaxKind[expression.kind]}'`);
    }
  }

  emitBinaryExpression(expression: ts.BinaryExpression): llvm.Value {
    const left = this.emitExpression(expression.left);
    const right = this.emitExpression(expression.right);

    switch (expression.operatorToken.kind) {
      case ts.SyntaxKind.EqualsToken:
        return this.builder.createStore(this.createLoadIfAllocaOrPointerToValueType(right), left);
      case ts.SyntaxKind.PlusToken:
        return this.builder.createFAdd(
          this.createLoadIfAllocaOrPointerToValueType(left),
          this.createLoadIfAllocaOrPointerToValueType(right)
        );
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

    switch (left.kind) {
      case ts.SyntaxKind.Identifier:
        const value = this.symbolTable.get((left as ts.Identifier).text);
        if (value instanceof Scope) {
          return value.get(propertyName) as llvm.Value;
        }
        return this.emitPropertyAccessGEP(propertyName, value);
      case ts.SyntaxKind.ThisKeyword:
        return this.emitPropertyAccessGEP(propertyName, this.symbolTable.get("this") as llvm.Value);
      default:
        return error(`Unhandled ts.LeftHandSideExpression '${ts.SyntaxKind[left.kind]}': ${left.getText()}`);
    }
  }

  emitPropertyAccessGEP(propertyName: string, value: llvm.Value): llvm.Value {
    const typeName = ((value.type as llvm.PointerType).elementType as llvm.StructType).name;
    if (!typeName) {
      return error("Property access not implemented for anonymous object types");
    }
    const type = (this.symbolTable.get(typeName) as Scope).data!.declaration;
    return this.builder.createInBoundsGEP(value, [
      llvm.ConstantInt.get(this.context, 0),
      llvm.ConstantInt.get(this.context, getMemberIndex(propertyName, type))
    ]);
  }

  emitIdentifier(expression: ts.Identifier): llvm.Value {
    return this.symbolTable.get(expression.text) as llvm.Value;
  }

  emitBooleanLiteral(expression: ts.BooleanLiteral): llvm.Value {
    if (expression.kind === ts.SyntaxKind.TrueKeyword) {
      return llvm.ConstantInt.getTrue(this.context);
    } else {
      return llvm.ConstantInt.getFalse(this.context);
    }
  }

  emitNumericLiteral(expression: ts.NumericLiteral): llvm.Value {
    return llvm.ConstantFP.get(this.context, parseFloat(expression.text));
  }

  emitStringLiteral(expression: ts.StringLiteral): llvm.Value {
    const ptr = this.builder.createGlobalStringPtr(expression.text) as llvm.Constant;
    const length = llvm.ConstantInt.get(this.context, expression.text.length);
    return llvm.ConstantStruct.get(getStringType(this.context), [ptr, length]);
  }

  emitObjectLiteralExpression(expression: ts.ObjectLiteralExpression): llvm.Value {
    const object = createGCAllocate(
      this.checker.getTypeAtLocation(expression),
      this.context,
      this.module,
      this.builder,
      this.checker
    );

    let propertyIndex = 0;
    for (const property of expression.properties) {
      switch (property.kind) {
        case ts.SyntaxKind.PropertyAssignment:
          const value = this.emitExpression((property as ts.PropertyAssignment).initializer);
          const pointer = this.builder.createInBoundsGEP(object, [
            llvm.ConstantInt.get(this.context, 0),
            llvm.ConstantInt.get(this.context, propertyIndex++)
          ]);
          this.builder.createStore(value, pointer);
          break;
        default:
          return error(`Unhandled ts.ObjectLiteralElementLike '${ts.SyntaxKind[property.kind]}'`);
      }
    }

    return object;
  }

  emitNewExpression(expression: ts.NewExpression): llvm.Value {
    const typeName = (expression.expression as ts.Identifier).getText();
    const constructor = (this.symbolTable.get(typeName) as Scope).get("constructor") as llvm.Value;
    const args = expression.arguments!.map(argument => this.emitExpression(argument));
    return this.builder.createCall(constructor, args);
  }

  createLoadIfAllocaOrPointerToValueType(value: llvm.Value): llvm.Value {
    if (value instanceof llvm.AllocaInst || (value.type.isPointerTy() && isValueType(value.type.elementType))) {
      return this.builder.createLoad(value);
    }
    return value;
  }

  createEntryBlockAlloca(type: llvm.Type, name: string): llvm.AllocaInst {
    const builder = new llvm.IRBuilder(this.currentFunction.getEntryBlock()!);
    const arraySize = undefined;
    return builder.createAlloca(type, arraySize, name);
  }

  get currentFunction(): llvm.Function {
    return this.builder.getInsertBlock().parent!;
  }
}
