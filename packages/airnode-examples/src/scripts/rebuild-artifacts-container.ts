import { runAndHandleErrors, runShellCommand } from '../';

const main = async () => {
  runShellCommand(`yarn --cwd ../../../ docker:build:artifacts`);
};

runAndHandleErrors(main);
