import * as llvm from "llvm-node";
import * as ts from "typescript";
import { createGCAllocate } from "../builtins";
import { error } from "../diagnostics";
import { Scope } from "../symbol-table";
import { getStringType } from "../types";
import { getMemberIndex } from "../utils";
import { LLVMGenerator } from "./generator";

export function emitBinaryExpression(expression: ts.BinaryExpression, generator: LLVMGenerator): llvm.Value {
  const left = generator.emitExpression(expression.left);
  const right = generator.emitExpression(expression.right);

  switch (expression.operatorToken.kind) {
    case ts.SyntaxKind.EqualsToken:
      return generator.builder.createStore(generator.createLoadIfAllocaOrPointerToValueType(right), left);
    case ts.SyntaxKind.PlusToken:
      return generator.builder.createFAdd(
        generator.createLoadIfAllocaOrPointerToValueType(left),
        generator.createLoadIfAllocaOrPointerToValueType(right)
      );
    default:
      return error(`Unhandled ts.BinaryExpression operator '${ts.SyntaxKind[expression.operatorToken.kind]}'`);
  }
}

export function emitCallExpression(expression: ts.CallExpression, generator: LLVMGenerator): llvm.Value {
  const callee = generator.emitExpression(expression.expression);
  const args = expression.arguments.map(argument => generator.emitExpression(argument));
  const isMethod =
    callee instanceof llvm.Function && callee.getArguments().length > 0 && callee.getArguments()[0].name === "this";
  if (isMethod) {
    const propertyAccess = expression.expression as ts.PropertyAccessExpression;
    args.unshift(generator.emitExpression(propertyAccess.expression));
  }
  return generator.builder.createCall(callee, args);
}

export function emitPropertyAccessExpression(
  expression: ts.PropertyAccessExpression,
  generator: LLVMGenerator
): llvm.Value {
  const left = expression.expression;
  const propertyName = expression.name.text;

  switch (left.kind) {
    case ts.SyntaxKind.Identifier:
      const value = generator.symbolTable.get((left as ts.Identifier).text);
      if (value instanceof Scope) {
        return value.get(propertyName) as llvm.Value;
      }
      return emitPropertyAccessGEP(propertyName, value, generator);
    case ts.SyntaxKind.ThisKeyword:
      return emitPropertyAccessGEP(propertyName, generator.symbolTable.get("this") as llvm.Value, generator);
    default:
      return error(`Unhandled ts.LeftHandSideExpression '${ts.SyntaxKind[left.kind]}': ${left.getText()}`);
  }
}

export function emitPropertyAccessGEP(propertyName: string, value: llvm.Value, generator: LLVMGenerator): llvm.Value {
  const typeName = ((value.type as llvm.PointerType).elementType as llvm.StructType).name;
  if (!typeName) {
    return error("Property access not implemented for anonymous object types");
  }
  const typeScope = generator.symbolTable.get(typeName) as Scope;
  const type = typeScope.data!.declaration;

  const method = type.members.find(member => ts.isMethodDeclaration(member) && member.name.getText() === propertyName);
  if (method) {
    return typeScope.get(propertyName) as llvm.Value;
  }

  const indexList = [
    llvm.ConstantInt.get(generator.context, 0),
    llvm.ConstantInt.get(generator.context, getMemberIndex(propertyName, type))
  ];
  return generator.builder.createInBoundsGEP(value, indexList, propertyName);
}

export function emitIdentifier(expression: ts.Identifier, generator: LLVMGenerator): llvm.Value {
  return generator.symbolTable.get(expression.text) as llvm.Value;
}

export function emitBooleanLiteral(expression: ts.BooleanLiteral, generator: LLVMGenerator): llvm.Value {
  if (expression.kind === ts.SyntaxKind.TrueKeyword) {
    return llvm.ConstantInt.getTrue(generator.context);
  } else {
    return llvm.ConstantInt.getFalse(generator.context);
  }
}

export function emitNumericLiteral(expression: ts.NumericLiteral, generator: LLVMGenerator): llvm.Value {
  return llvm.ConstantFP.get(generator.context, parseFloat(expression.text));
}

export function emitStringLiteral(expression: ts.StringLiteral, generator: LLVMGenerator): llvm.Value {
  const ptr = generator.builder.createGlobalStringPtr(expression.text) as llvm.Constant;
  const length = llvm.ConstantInt.get(generator.context, expression.text.length);
  return llvm.ConstantStruct.get(getStringType(generator.context), [ptr, length]);
}

export function emitObjectLiteralExpression(
  expression: ts.ObjectLiteralExpression,
  generator: LLVMGenerator
): llvm.Value {
  const object = createGCAllocate(
    generator.checker.getTypeAtLocation(expression),
    generator.context,
    generator.module,
    generator.builder,
    generator.checker
  );

  let propertyIndex = 0;
  for (const property of expression.properties) {
    switch (property.kind) {
      case ts.SyntaxKind.PropertyAssignment:
        const value = generator.emitExpression((property as ts.PropertyAssignment).initializer);
        const indexList = [
          llvm.ConstantInt.get(generator.context, 0),
          llvm.ConstantInt.get(generator.context, propertyIndex++)
        ];
        const pointer = generator.builder.createInBoundsGEP(object, indexList, property.name.getText());
        generator.builder.createStore(value, pointer);
        break;
      default:
        return error(`Unhandled ts.ObjectLiteralElementLike '${ts.SyntaxKind[property.kind]}'`);
    }
  }

  return object;
}

export function emitNewExpression(expression: ts.NewExpression, generator: LLVMGenerator): llvm.Value {
  const typeName = (expression.expression as ts.Identifier).getText();
  const constructor = (generator.symbolTable.get(typeName) as Scope).get("constructor") as llvm.Value;
  const args = expression.arguments!.map(argument => generator.emitExpression(argument));
  return generator.builder.createCall(constructor, args);
}
