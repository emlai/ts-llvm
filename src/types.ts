import * as llvm from "llvm-node";
import * as ts from "typescript";
import { LLVMGenerator } from "./codegen/generator";
import { error } from "./diagnostics";
import { mangleType } from "./mangle";
import { isObject, isString } from "./tsc-utils";
import { getStoredProperties } from "./utils";

export function getLLVMType(type: ts.Type, generator: LLVMGenerator): llvm.Type {
  const { context, checker } = generator;

  // TODO: Inline literal types where possible.

  if (type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) {
    return llvm.Type.getInt1Ty(context);
  }

  if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) {
    return llvm.Type.getDoubleTy(context);
  }

  if (isString(type)) {
    return getStringType(context);
  }

  if (isObject(type)) {
    // TODO: Pass correct isOpaque parameter.
    return getStructType(type, false, generator).getPointerTo();
  }

  if (type.flags & ts.TypeFlags.Void) {
    return llvm.Type.getVoidTy(context);
  }

  if (type.flags & ts.TypeFlags.Any) {
    return error("'any' type is not supported");
  }

  return error(`Unhandled ts.Type '${checker.typeToString(type)}'`);
}

export function getStructType(type: ts.ObjectType, isOpaque: boolean, generator: LLVMGenerator) {
  const { context, module, checker } = generator;

  const elements = getStoredProperties(type, checker).map(property =>
    getLLVMType(checker.getTypeAtLocation(property.valueDeclaration), generator)
  );
  const declaration = type.symbol.declarations[0];
  let struct: llvm.StructType | null;

  if (ts.isClassDeclaration(declaration)) {
    const name = mangleType(type, checker);
    struct = module.getTypeByName(name);
    if (!struct) {
      struct = llvm.StructType.create(context, name);
      if (!isOpaque) {
        struct.setBody(elements);
      }
    }
  } else {
    struct = llvm.StructType.get(context, elements);
  }

  return struct;
}

let stringType: llvm.StructType | undefined;

export function getStringType(context: llvm.LLVMContext): llvm.StructType {
  if (!stringType) {
    stringType = llvm.StructType.create(context, "string");
    stringType.setBody([llvm.Type.getInt8PtrTy(context), llvm.Type.getInt32Ty(context)]);
  }
  return stringType;
}
