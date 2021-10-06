import { runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  runShellCommand(`yarn --cwd ../../ docker:artifacts`);
};

runAndHandleErrors(main);
