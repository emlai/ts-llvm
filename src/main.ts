import { execSync } from "child_process";
import * as argv from "commander";
import * as fs from "fs";
import * as llvm from "llvm-node";
import * as path from "path";
// @ts-ignore
import * as SegfaultHandler from "segfault-handler";
import * as ts from "typescript";
import { emitLLVM } from "./codegen";
import { replaceExtension } from "./utils";

SegfaultHandler.registerHandler("ts-llvm-crash.log");

argv
  .option("--printIR", "print LLVM assembly to stdout")
  .option("--emitIR", "write LLVM assembly to file")
  .option("--emitBitcode", "write LLVM bitcode to file")
  .parse(process.argv);

main();

function main() {
  const files = argv.args;
  const options: ts.CompilerOptions = {
    lib: [path.join(__dirname, "..", "lib", "lib.ts-llvm.d.ts")],
    types: []
  };
  const host = ts.createCompilerHost(options);
  const program = ts.createProgram(files, options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);

  if (diagnostics.length > 0) {
    process.stdout.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));
    process.exit(1);
  }

  const llvmModule = emitLLVM(program);

  if (argv.printIR) {
    console.log(llvmModule.print());
  }
  if (argv.emitIR) {
    writeIRToFile(llvmModule, program);
  }
  if (argv.emitBitcode) {
    writeBitcodeToFile(llvmModule, program);
  }
  if (!argv.printIR && !argv.emitIR && !argv.emitBitcode) {
    writeExecutableToFile(llvmModule, program);
  }
}

function getOutputBaseName(program: ts.Program): string {
  const fileNames = program.getRootFileNames();
  return fileNames.length === 1 ? path.basename(fileNames[0], ".ts") : "main";
}

function writeIRToFile(module: llvm.Module, program: ts.Program): string {
  const fileName = replaceExtension(getOutputBaseName(program), ".ll");
  fs.writeFileSync(fileName, module.print());
  console.log(`${fileName} written`);
  return fileName;
}

function writeBitcodeToFile(module: llvm.Module, program: ts.Program): string {
  const fileName = replaceExtension(getOutputBaseName(program), ".bc");
  llvm.writeBitcodeToFile(module, fileName);
  return fileName;
}

function writeExecutableToFile(module: llvm.Module, program: ts.Program): void {
  const runtimeLibPath = path.join(__dirname, "..", "lib", "runtime");
  const runtimeLibFiles = fs
    .readdirSync(runtimeLibPath)
    .filter(file => path.extname(file) === ".cpp")
    .map(file => path.join(runtimeLibPath, file))
    .map(file => `"${file}"`);
  const bitcodeFile = writeBitcodeToFile(module, program);
  const objectFile = replaceExtension(bitcodeFile, ".o");
  const executableFile = replaceExtension(bitcodeFile, "");
  const optimizationLevel = "-O3";

  try {
    execSync(`llc ${optimizationLevel} -filetype=obj "${bitcodeFile}" -o "${objectFile}"`);
    execSync(`cc ${optimizationLevel} "${objectFile}" ${runtimeLibFiles.join(" ")} -o "${executableFile}"`);
  } finally {
    fs.unlinkSync(bitcodeFile);
    fs.unlinkSync(objectFile);
  }
}
