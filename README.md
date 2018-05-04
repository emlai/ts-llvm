# ts-llvm

ts-llvm is a compiler for [TypeScript](https://www.typescriptlang.org/) that
generates [LLVM](https://llvm.org/) code, which can then be optimized using all
existing LLVM optimizations, and converted further into e.g. native code,
WebAssembly, or JavaScript (using
[emscripten](https://github.com/kripken/emscripten)).

It uses the  TypeScript [Compiler
API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API) to
parse and typecheck the input TypeScript code. The resulting TypeScript AST is
transformed into LLVM IR using the
[llvm-node](https://github.com/MichaReiser/llvm-node) bindings. ts-llvm also
provides a runtime library written in C++ that implements native replacements
for built-in TypeScript APIs such as `console.log`.

ts-llvm is still in very early stages of development. For example, it cannot yet
compile most TypeScript programs and it doesn't yet do any garbage collection.
If you're willing to contribute, any help will be greatly appreciated. For
questions you can create a GitHub issue or ask on the [ts-llvm
Slack](https://join.slack.com/t/ts-llvm/shared_invite/enQtMzU4MjQwMjI4MzUzLTk3M2VjYWU4MjA3MzIxMGIxMTJkMDg0ODdlZWNlNzg1ZDBkMjRiMjJmMzc2ZDYwZTYxMTg3NzVlMmJlY2JiNDg).

## Building from source

1. You need to have LLVM installed on your system.
2. Run `npm install` to install other dependencies. If llvm-config is not on
your PATH, you may need to tell llvm-node where to find LLVM on your system,
e.g. by running `npm config set cmake_LLVM_DIR $(path-to-llvm/bin/llvm-config
--cmakedir)` before `npm install`.
3. If you want ts-llvm to generate native code, you need to have
[`llc`](https://llvm.org/docs/CommandGuide/llc.html) and `cc` (any C++ compiler)
on your PATH. `llc` will not be required once llvm-node gains support for the
LLVM legacy PassManager and addPassesToEmitFile APIs. `cc` will not be required
once ts-llvm learns to detect the system C++ compiler on its own.

Once everything above is set up, you can use the following commands:

- `npm run build` will build the ts-llvm compiler in the `build` directory.
- `npm start` will run the ts-llvm compiler. You can pass arguments to the
  compiler after two consecutive hyphens: e.g. `npm start -- --help` will print
  the compiler's usage information.
- `npm test` will run the test suite.

## License

ts-llvm is licensed under the MIT license.
