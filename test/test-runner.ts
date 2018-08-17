import chalk from "chalk";
import { spawnSync } from "child_process";
import { diffLines } from "diff";
import * as fs from "fs";
import * as path from "path";
import { replaceExtension } from "../src/utils";
const { green, red } = chalk;

const updateSnapshots = process.argv.includes("--updateSnapshots");
const tests = fs.readdirSync(path.join(__dirname, "cases")).filter(file => file.endsWith(".ts"));

const failedTests = tests.filter(file => {
  const compilerPath = path.join(__dirname, "..", "src", "main.ts");
  const inputFile = path.join(__dirname, "cases", file);
  const outputFile = path.join(__dirname, "cases", replaceExtension(file, ".ll"));
  const testCommand = ["ts-node", compilerPath, inputFile, "--printIR"];
  let expectedOutput;
  let output;
  let error;

  try {
    expectedOutput = fs.readFileSync(outputFile).toString();
    const { stdout, stderr } = spawnSync(testCommand[0], testCommand.slice(1));
    output = stdout + stderr;
  } catch (err) {
    expectedOutput = expectedOutput || "";
    output = output || "";
    error = err;
  }

  if (!output || !expectedOutput || output !== expectedOutput) {
    console.log(`TEST FAILED: ${file} (${testCommand.join(" ")})`);

    if (error) {
      console.log(error.toString());
    } else if (updateSnapshots) {
      fs.writeFileSync(outputFile, output);
      console.log(`✓ Snapshot ${path.basename(outputFile)} updated.\n`);
    } else {
      const diffParts = diffLines(output.toString(), expectedOutput.toString());

      diffParts.forEach(({ value, added, removed }) => {
        process.stdout.write(added ? green(value) : removed ? red(value) : value);
      });
    }

    return file;
  }

  const compileCommand = ["ts-node", compilerPath, inputFile];
  spawnSync(compileCommand[0], compileCommand.slice(1));
  const executable = replaceExtension(file, "");
  spawnSync(executable);
  fs.unlink(executable, () => undefined);

  return undefined;
});

if (updateSnapshots) {
  process.exit();
}

if (failedTests.length > 0) {
  process.exit(1);
}

console.log(`All ${tests.length} tests passed.`);
