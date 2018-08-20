import * as llvm from "llvm-node";
import * as R from "ramda";
import * as ts from "typescript";
import { error } from "./diagnostics";

type ScopeValue = llvm.Value | Scope;

interface ScopeData {
  readonly declaration: ts.ClassDeclaration | ts.InterfaceDeclaration;
  readonly type: llvm.StructType;
}

export class Scope extends Map<string, ScopeValue> {
  readonly name: string | undefined;
  readonly data: ScopeData | undefined;

  constructor(name: string | undefined, data?: ScopeData) {
    super();
    this.name = name;
    this.data = data;
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

  set(identifier: string, value: ScopeValue) {
    if (!this.getOptional(identifier)) {
      return super.set(identifier, value);
    }

    return error(`Overwriting identifier '${identifier}' in symbol table`);
  }

  overwrite(identifier: string, value: ScopeValue) {
    if (this.getOptional(identifier)) {
      return super.set(identifier, value);
    }

    return error(`Identifier '${identifier}' being overwritten not found in symbol table`);
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

  get currentScope(): Scope {
    return this.scopes[this.scopes.length - 1];
  }

  withScope(scopeName: string | undefined, body: (scope: Scope) => void): void {
    const scope = new Scope(scopeName);
    this.scopes.push(scope);
    body(scope);
    this.scopes.pop();
  }
}
