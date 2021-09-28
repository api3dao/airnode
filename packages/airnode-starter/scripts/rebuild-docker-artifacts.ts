import { runAndHandleErrors, runShellCommand } from '../src';

async function main() {
  runShellCommand(`yarn --cwd ../../ docker:artifacts`);
}

runAndHandleErrors(main);
