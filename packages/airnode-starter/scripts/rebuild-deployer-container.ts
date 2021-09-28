import { runAndHandleErrors, runShellCommand } from '../src';

async function main() {
  runShellCommand(`yarn --cwd ../../ docker:deployer`);
}

runAndHandleErrors(main);
