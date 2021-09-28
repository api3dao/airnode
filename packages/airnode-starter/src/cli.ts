import { spawnSync } from 'child_process';

export const runAndHandleErrors = (fn: () => Promise<unknown>) => {
  fn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
};

export const runShellCommand = (command: string) => {
  spawnSync(command, {
    shell: true,
    stdio: 'inherit',
  });
};
