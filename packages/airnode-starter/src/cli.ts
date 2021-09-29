import { spawnSync } from 'child_process';
import chalk from 'chalk';

export const runAndHandleErrors = (fn: () => Promise<unknown>) => {
  fn()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
};

export const runShellCommand = (command: string) => {
  cliPrint.info(command);
  spawnSync(command, {
    shell: true,
    stdio: 'inherit',
  });
};

export const cliPrint = {
  info: (text: string) => console.log(chalk.bold.white(text)),
  warning: (text: string) => console.log(chalk.bold.hex('#FFA500')(text)), // Orange color
  error: (text: string) => console.log(chalk.bold.red(text)),
};
