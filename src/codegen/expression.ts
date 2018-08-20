import * as llvm from "llvm-node";
import * as ts from "typescript";
import { createGCAllocate, getBuiltin } from "../builtins";
import { error } from "../diagnostics";
import { getDeclarationBaseName } from "../mangle";
import { Scope } from "../symbol-table";
import { getLLVMType, getStringType } from "../types";
import {
  getMemberIndex,
  getMethod,
  getTypeArguments,
  isArray,
  isMethodReference,
  isString,
  keepInsertionPoint
} from "../utils";
import { emitFunctionDeclaration } from "./declaration";
import { LLVMGenerator } from "./generator";
import { createEntryBlockAlloca } from "./statement";

function castToInt32AndBack(
  values: llvm.Value[],
  generator: LLVMGenerator,
  emit: (ints: llvm.Value[]) => llvm.Value
): llvm.Value {
  const ints = values.map(value => {
    return generator.builder.createFPToSI(generator.loadIfValueType(value), llvm.Type.getInt32Ty(generator.context));
  });
  return generator.builder.createSIToFP(emit(ints), llvm.Type.getDoubleTy(generator.context));
}

export function emitPrefixUnaryExpression(expression: ts.PrefixUnaryExpression, generator: LLVMGenerator): llvm.Value {
  const operand = generator.emitExpression(expression.operand);

  switch (expression.operator) {
    case ts.SyntaxKind.PlusToken:
      return generator.loadIfValueType(operand);
    case ts.SyntaxKind.MinusToken:
      return generator.builder.createFNeg(generator.loadIfValueType(operand));
    case ts.SyntaxKind.PlusPlusToken:
      return emitAssignment(
        operand,
        generator.builder.createFAdd(generator.loadIfValueType(operand), llvm.ConstantFP.get(generator.context, 1)),
        generator
      );
    case ts.SyntaxKind.MinusMinusToken:
      return emitAssignment(
        operand,
        generator.builder.createFSub(generator.loadIfValueType(operand), llvm.ConstantFP.get(generator.context, 1)),
        generator
      );
    case ts.SyntaxKind.TildeToken:
      return castToInt32AndBack([operand], generator, ([value]) => generator.builder.createNot(value));
    case ts.SyntaxKind.ExclamationToken:
      return error(`Unhandled ts.PrefixUnaryOperator operator '${ts.SyntaxKind[expression.operator]}'`);
  }
}

export function emitPostfixUnaryExpression(
  expression: ts.PostfixUnaryExpression,
  generator: LLVMGenerator
): llvm.Value {
  const operand = generator.emitExpression(expression.operand);

  switch (expression.operator) {
    case ts.SyntaxKind.PlusPlusToken: {
      const oldValue = generator.loadIfValueType(operand);
      const newValue = generator.builder.createFAdd(oldValue, llvm.ConstantFP.get(generator.context, 1));
      emitAssignment(operand, newValue, generator);
      return oldValue;
    }
    case ts.SyntaxKind.MinusMinusToken: {
      const oldValue = generator.loadIfValueType(operand);
      const newValue = generator.builder.createFSub(oldValue, llvm.ConstantFP.get(generator.context, 1));
      emitAssignment(operand, newValue, generator);
      return oldValue;
    }
  }
}

function emitBinaryPlus(left: llvm.Value, right: llvm.Value, generator: LLVMGenerator): llvm.Value {
  if (left.type.isDoubleTy() && right.type.isDoubleTy()) {
    return generator.builder.createFAdd(left, right);
  }

  if (isString(left.type) && isString(right.type)) {
    const concat = getBuiltin("string__concat", generator.context, generator.module);
    return generator.builder.createCall(concat, [left, right]);
  }

  return error("Invalid operand types to binary plus");
}

function emitAssignment(left: llvm.Value, right: llvm.Value, generator: LLVMGenerator): llvm.Value {
  if (left instanceof llvm.Argument) {
    const alloca = createEntryBlockAlloca(left.type, left.name + ".alloca", generator);
    generator.symbolTable.currentScope.overwrite(left.name, alloca);
    left = alloca;
  }
  return generator.builder.createStore(generator.loadIfValueType(right), left);
}

export function emitBinaryExpression(expression: ts.BinaryExpression, generator: LLVMGenerator): llvm.Value {
  const left = generator.emitExpression(expression.left);
  const right = generator.emitExpression(expression.right);

  switch (expression.operatorToken.kind) {
    case ts.SyntaxKind.EqualsToken:
      return emitAssignment(left, right, generator);
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
      return generator.builder.createFCmpOEQ(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      return generator.builder.createFCmpONE(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.LessThanToken:
      return generator.builder.createFCmpOLT(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.GreaterThanToken:
      return generator.builder.createFCmpOGT(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.LessThanEqualsToken:
      return generator.builder.createFCmpOLE(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.GreaterThanEqualsToken:
      return generator.builder.createFCmpOGE(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.PlusToken:
      return emitBinaryPlus(generator.loadIfValueType(left), generator.loadIfValueType(right), generator);
    case ts.SyntaxKind.MinusToken:
      return generator.builder.createFSub(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.AsteriskToken:
      return generator.builder.createFMul(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.SlashToken:
      return generator.builder.createFDiv(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.PercentToken:
      return generator.builder.createFRem(generator.loadIfValueType(left), generator.loadIfValueType(right));
    case ts.SyntaxKind.AmpersandToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createAnd(leftInt, rightInt)
      );
    case ts.SyntaxKind.BarToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createOr(leftInt, rightInt)
      );
    case ts.SyntaxKind.CaretToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createXor(leftInt, rightInt)
      );
    case ts.SyntaxKind.LessThanLessThanToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createShl(leftInt, rightInt)
      );
    case ts.SyntaxKind.GreaterThanGreaterThanToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createAShr(leftInt, rightInt)
      );
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      return castToInt32AndBack([left, right], generator, ([leftInt, rightInt]) =>
        generator.builder.createLShr(leftInt, rightInt)
      );
    default:
      return error(`Unhandled ts.BinaryExpression operator '${ts.SyntaxKind[expression.operatorToken.kind]}'`);
  }
}

export function getOrEmitFunctionForCall(
  declaration: ts.Declaration,
  thisType: ts.Type | undefined,
  argumentTypes: ts.Type[],
  generator: LLVMGenerator
) {
  if (
    !ts.isFunctionDeclaration(declaration) &&
    !ts.isMethodDeclaration(declaration) &&
    !ts.isMethodSignature(declaration) &&
    !ts.isIndexSignatureDeclaration(declaration) &&
    !ts.isPropertyDeclaration(declaration) &&
    !ts.isConstructorDeclaration(declaration)
  ) {
    return error(
      `Invalid function call target '${getDeclarationBaseName(declaration)}' (${ts.SyntaxKind[declaration.kind]})`
    );
  }

  return keepInsertionPoint(generator.builder, () => {
    return emitFunctionDeclaration(declaration, thisType, argumentTypes, generator)!;
  });
}

export function emitCallExpression(expression: ts.CallExpression, generator: LLVMGenerator): llvm.Value {
  const isMethod = isMethodReference(expression.expression, generator.checker);
  const declaration = generator.checker.getSymbolAtLocation(expression.expression)!.valueDeclaration;
  let thisType: ts.Type | undefined;
  if (isMethod) {
    const methodReference = expression.expression as ts.PropertyAccessExpression;
    thisType = generator.checker.getTypeAtLocation(methodReference.expression);
  }

  const argumentTypes = expression.arguments.map(generator.checker.getTypeAtLocation);
  const callee = getOrEmitFunctionForCall(declaration, thisType, argumentTypes, generator);

  const args = expression.arguments.map(argument => generator.emitExpression(argument));

  if (isMethod) {
    const propertyAccess = expression.expression as ts.PropertyAccessExpression;
    args.unshift(generator.emitExpression(propertyAccess.expression));
  }

  return generator.builder.createCall(callee, args.map(generator.loadIfValueType));
}

export function emitPropertyAccessExpression(
  expression: ts.PropertyAccessExpression,
  generator: LLVMGenerator
): llvm.Value {
  const left = expression.expression;
  const propertyName = expression.name.text;

  if (propertyName === "length" && isArray(generator.checker.getTypeAtLocation(left))) {
    return emitArrayLengthAccess(left, generator);
  }

  switch (left.kind) {
    case ts.SyntaxKind.Identifier: {
      const value = generator.symbolTable.get((left as ts.Identifier).text);
      if (value instanceof Scope) {
        return value.get(propertyName) as llvm.Value;
      }
      return emitPropertyAccessGEP(propertyName, value, generator);
    }
    case ts.SyntaxKind.ThisKeyword:
      return emitPropertyAccessGEP(propertyName, generator.symbolTable.get("this") as llvm.Value, generator);
    case ts.SyntaxKind.PropertyAccessExpression: {
      const value = emitPropertyAccessExpression(left as ts.PropertyAccessExpression, generator);
      return emitPropertyAccessGEP(propertyName, generator.loadIfValueType(value), generator);
    }
    default:
      return error(`Unhandled ts.LeftHandSideExpression '${ts.SyntaxKind[left.kind]}': ${left.getText()}`);
  }
}

export function emitElementAccessExpression(
  expression: ts.ElementAccessExpression,
  generator: LLVMGenerator
): llvm.Value {
  const arrayType = generator.checker.getTypeAtLocation(expression.expression);
  const subscript = getMethod(
    arrayType,
    "subscript",
    [generator.checker.getTypeAtLocation(expression.argumentExpression)],
    generator
  );
  const array = generator.emitExpression(expression.expression);
  const index = generator.loadIfValueType(generator.emitExpression(expression.argumentExpression));
  return generator.builder.createCall(subscript, [array, index]);
}

export function emitArrayLengthAccess(expression: ts.Expression, generator: LLVMGenerator) {
  const arrayType = generator.checker.getTypeAtLocation(expression);
  const lengthGetter = getMethod(arrayType, "length", [], generator);
  const array = generator.emitExpression(expression);
  return generator.builder.createCall(lengthGetter, [array]);
}

export function emitPropertyAccessGEP(propertyName: string, value: llvm.Value, generator: LLVMGenerator): llvm.Value {
  if (!value.type.isPointerTy() || !value.type.elementType.isStructTy()) {
    return error(`Property access left-hand-side must be a pointer to a struct, found '${value.type}'`);
  }
  const typeName = value.type.elementType.name;
  if (!typeName) {
    return error("Property access not implemented for anonymous object types");
  }
  const typeScope = generator.symbolTable.get(typeName) as Scope;
  const type = typeScope.data!.declaration as ts.ClassDeclaration;

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

export function emitArrayLiteralExpression(
  expression: ts.ArrayLiteralExpression,
  generator: LLVMGenerator
): llvm.Value {
  const arrayType = generator.checker.getTypeAtLocation(expression);
  const elementType = getTypeArguments(arrayType)[0];
  const constructor = getMethod(arrayType, "constructor", [], generator);
  const push = getMethod(arrayType, "push", [elementType], generator);
  const array = generator.builder.createCall(constructor, []);

  for (const element of expression.elements) {
    const elementValue = generator.loadIfValueType(generator.emitExpression(element));
    generator.builder.createCall(push, [array, elementValue]);
  }

  return array;
}

export function emitObjectLiteralExpression(
  expression: ts.ObjectLiteralExpression,
  generator: LLVMGenerator
): llvm.Value {
  const type = getLLVMType(generator.checker.getTypeAtLocation(expression), generator);
  const object = createGCAllocate(type.isPointerTy() ? type.elementType : type, generator);

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
  const declaration = generator.checker.getSymbolAtLocation(expression.expression)!.valueDeclaration;

  if (!ts.isClassDeclaration(declaration)) {
    return error("Cannot 'new' non-class type");
  }

  const constructorDeclaration = declaration.members.find(ts.isConstructorDeclaration);

  if (!constructorDeclaration) {
    return error("Calling 'new' requires the type to have a constructor");
  }

  const argumentTypes = expression.arguments!.map(generator.checker.getTypeAtLocation);
  const thisType = generator.checker.getTypeAtLocation(expression);

  const constructor = keepInsertionPoint(generator.builder, () => {
    return emitFunctionDeclaration(constructorDeclaration, thisType, argumentTypes, generator)!;
  });

  const args = expression.arguments!.map(argument => generator.emitExpression(argument));
  return generator.builder.createCall(constructor, args);
}
