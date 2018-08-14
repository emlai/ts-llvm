import * as llvm from "llvm-node";
import * as R from "ramda";
import { error } from "./diagnostics";

type ScopeValue = llvm.Value | llvm.StructType | Scope;

export class Scope extends Map<string, ScopeValue> {
  readonly name: string | undefined;
  readonly structType: llvm.StructType | undefined;

  constructor(name: string | undefined, structType?: llvm.StructType) {
    super();
    this.name = name;
    this.structType = structType;
  }

  get(identifier: string): ScopeValue {
    const value = this.getOptional(identifier);
    if (value) {
      return value;
    }
    return error(`Unknown identifier '${identifier}'`);
  }

  getOptional(identifier: string): ScopeValue | undefined {
    return super.get(identifier);
  }
}

export class SymbolTable {
  private readonly scopes: Scope[];

  constructor() {
    this.scopes = [new Scope(undefined)];
  }

  get(identifier: string): ScopeValue {
    const parts = identifier.split(".");

    if (parts.length > 1) {
      const scope = this.get(parts[0]);
      if (!(scope instanceof Scope)) {
        return error(`'${parts[0]}' is not a namespace`);
      }
      return scope.get(parts.slice(1).join("."));
    }

    for (const scope of R.reverse(this.scopes)) {
      const value = scope.getOptional(identifier);
      if (value) {
        return value;
      }
    }
    return error(`Unknown identifier '${identifier}'`);
  }

  get globalScope(): Scope {
    return this.scopes[0];
  }

  withScope(scopeName: string | undefined, body: (scope: Scope) => void): void {
    const scope = new Scope(scopeName);
    this.scopes.push(scope);
    body(scope);
    this.scopes.pop();
  }
}
