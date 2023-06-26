// for WebAssembly typings:
/// <reference lib="dom" />

import os from "os";
import fs from "fs";
import path from "path";
import chalk from "chalk";

import { compile, docs, test, checkForUpdates, run } from "./commands";
import { satisfies } from "compare-versions";

import { Command, Option } from "commander";
import { run_server } from "./commands/lsp";

const PACKAGE_VERSION = require("../package.json").version as string;
const SUPPORTED_NODE_VERSION = require("../package.json").engines.node as string;
if (!SUPPORTED_NODE_VERSION) {
  throw new Error("couldn't parse engines.node version from package.json");
}

function actionErrorHandler(fn: (...args: any[]) => Promise<any>) {
  return (...args: any[]) =>
    fn(...args).catch((err: Error) => {
      console.error(err);
      process.exit(1);
    });
}

async function main() {
  checkNodeVersion();

  // Check if the flag file exists
  const wingDirPath = path.join(os.homedir(), ".wing");
  const flagFilePath = path.join(wingDirPath, ".cli_initialized");
  const isFirstRun = !fs.existsSync(flagFilePath);

  // If it's the first run, display the disclaimer and create the flag file
  if (isFirstRun) {
    const disclaimer = `
🧪 This is an early pre-release of the Wing Programming Language (aka "alpha").
  
We are working hard to make this a great tool, but there's still a pretty good
chance you'll encounter missing pieces, rough edges, performance issues and even,
god forbid, bugs 🐞.

Please don't hesitate to ping us at ${chalk.blueBright.bold.underline(
      "https://t.winglang.io/slack"
    )} or file an issue at
${chalk.blueBright.bold.underline(
  "https://github.com/winglang/wing"
)}. We promise to do our best to respond quickly and help out.

To help us identify issues early, we are collecting anonymous analytics.
To turn this off, set ${chalk.yellowBright.bold("WING_CLI_DISABLE_ANALYTICS=1")}.
For more information see ${chalk.blueBright.bold.underline("https://winglang.io/docs/analytics")}

${chalk.redBright("(This message will self-destruct after the first run)")}
`;

    console.log(`${chalk.hex("#2AD5C1")(disclaimer)}`);

    fs.writeFileSync(flagFilePath, "");
  }

  const program = new Command();

  program.name("wing").version(PACKAGE_VERSION);

  program.option("--debug", "Enable debug logging (same as DEBUG=1)", () => {
    process.env.DEBUG = "1";
  });

  program.option("--progress", "Show compilation progress", () => {
    process.env.PROGRESS = "1";
  });

  program
    .option("--no-update-check", "Skip checking for toolchain updates")
    .hook("preAction", async (cmd) => {
      const updateCheck = cmd.opts().updateCheck;
      if (updateCheck) {
        // most of the update check is network bound, so we don't want to block the rest of the CLI
        void checkForUpdates();
      }
    });

  program
    .command("run")
    .alias("it")
    .description("Runs a Wing simulator file in the Wing Console")
    .argument("[simfile]", ".wsim simulator file")
    .action(run);

  program.command("lsp").description("Run the Wing language server on stdio").action(run_server);

  program
    .command("compile")
    .description("Compiles a Wing program")
    .argument("<entrypoint>", "program .w entrypoint")
    .addOption(
      new Option("-t, --target <target>", "Target platform")
        .choices(["tf-aws", "tf-azure", "tf-gcp", "sim", "awscdk"])
        .default("sim")
    )
    .option("-p, --plugins [plugin...]", "Compiler plugins")
    .action(actionErrorHandler(compile));

  program
    .command("test")
    .description(
      "Compiles a Wing program and runs all functions with the word 'test' or start with 'test:' in their resource identifiers"
    )
    .argument("<entrypoint...>", "all entrypoints to test")
    .addOption(
      new Option("-t, --target <target>", "Target platform")
        .choices(["tf-aws", "sim", "awscdk"])
        .default("sim")
    )
    .option("-p, --plugins [plugin...]", "Compiler plugins")
    .action(actionErrorHandler(test));

  program.command("docs").description("Open the Wing documentation").action(docs);

  program.parse();
}

function checkNodeVersion() {
  const supportedVersion = SUPPORTED_NODE_VERSION;

  if (!satisfies(process.version, supportedVersion)) {
    console.warn(
      `WARNING: You are running an incompatible node.js version ${process.version}. Compatible engine is: ${supportedVersion}.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
