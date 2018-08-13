const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { diffLines } = require("diff");
const { green, red } = require("chalk");
const { replaceExtension } = require("../build/utils");

let tests = fs.readdirSync(path.join(__dirname, "cases")).filter(file => file.endsWith(".ts"));

const failedTests = tests.filter(file => {
  const compilerPath = path.join(__dirname, "..", "build", "main.js");
  const inputFile = path.join(__dirname, "cases", file);
  const outputFile = path.join(__dirname, "cases", replaceExtension(file, ".ll"));
  const testCommand = ["node", compilerPath, inputFile, "--printIR"];
  let expectedOutput;
  let output;
  let error;

  try {
    expectedOutput = fs.readFileSync(outputFile);
    const { stdout, stderr } = spawnSync(testCommand[0], testCommand.slice(1));
    output = Buffer.concat([stdout, stderr].filter(Boolean));
  } catch (err) {
    error = err;
  }

  if (!output || !expectedOutput || !output.includes(expectedOutput)) {
    console.log(`TEST FAILED: ${file} (${testCommand.join(" ")})\n`);

    if (error) {
      console.log(error.toString());
    } else {
      const diffParts = diffLines(output.toString(), expectedOutput.toString());

      diffParts.forEach(({ value, added, removed }) => {
        process.stdout.write(added ? green(value) : removed ? red(value) : value);
      });
    }

    return file;
  }

  const compileCommand = ["node", compilerPath, inputFile];
  spawnSync(compileCommand[0], compileCommand.slice(1));
  const executable = replaceExtension(file, "");
  spawnSync(executable);
  fs.unlink(executable, err => {
    if (err) {
      throw err;
    }
  });
});

if (failedTests.length > 0) {
  process.exit(1);
}

console.log(`All ${tests.length} tests passed.`);
