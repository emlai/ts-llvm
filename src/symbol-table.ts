import * as llvm from "llvm-node";
import * as R from "ramda";
import { error } from "./diagnostics";

export class Scope extends Map<string, llvm.Value | Scope> {
  readonly name: string | undefined;

  constructor(name: string | undefined) {
    super();
    this.name = name;
  }

  get(identifier: string): llvm.Value | Scope {
    const value = this.getOptional(identifier);
    if (value) {
      return value;
    }
    return error(`Unknown identifier '${identifier}'`);
  }

  getOptional(identifier: string): llvm.Value | Scope | undefined {
    return super.get(identifier);
  }
}

export class SymbolTable {
  private readonly scopes: Scope[];

  constructor() {
    this.scopes = [new Scope(undefined)];
  }

  get(identifier: string): llvm.Value | Scope {
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
