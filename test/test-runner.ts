import chalk from "chalk";
import * as child_process from "child_process";
import { diffLines } from "diff";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { replaceExtension } from "../src/utils";
const { green, red } = chalk;
const execFile = promisify(child_process.execFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const updateSnapshots = process.argv.includes("--updateSnapshots");
const tests = fs.readdirSync(path.join(__dirname, "cases")).filter(file => file.endsWith(".ts"));

async function runTest(file: string) {
  const compilerPath = path.join(__dirname, "..", "src", "main.ts");
  const inputFile = path.join(__dirname, "cases", file);
  const outputFile = path.join(__dirname, "cases", replaceExtension(file, ".ll"));
  const testCommand = ["ts-node", compilerPath, inputFile, "--printIR", "--target", "x86_64"];
  let expectedOutput;
  let output;
  let error;

  try {
    expectedOutput = (await readFile(outputFile)).toString();
    const { stdout, stderr } = await execFile(testCommand[0], testCommand.slice(1));
    output = stdout + stderr;
  } catch (err) {
    expectedOutput = expectedOutput || "";
    output = output || "";
    error = err;
  }

  if (!output || !expectedOutput || output !== expectedOutput) {
    console.log(`TEST FAILED: ${file} (${testCommand.join(" ")})`);

    if (error) {
      console.log(error.stdout || error.toString());
    } else if (updateSnapshots) {
      await writeFile(outputFile, output);
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
  await execFile(compileCommand[0], compileCommand.slice(1));
  const executable = path.join(__dirname, "..", replaceExtension(file, ""));
  try {
    await execFile(executable);
  } finally {
    await unlink(executable);
  }

  return undefined;
}

async function main() {
  try {
    const failedTests = (await Promise.all(tests.map(runTest))).filter(Boolean);

    if (updateSnapshots) {
      process.exit();
    }

    if (failedTests.length > 0) {
      process.exit(1);
    }

    console.log(`All ${tests.length} tests passed.`);
  } catch (error) {
    console.log(error.stdout || error.toString());
    process.exit(1);
  }
}

main();
