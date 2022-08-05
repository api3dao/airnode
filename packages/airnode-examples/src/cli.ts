import { spawnSync } from 'child_process';
import chalk from 'chalk';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';

/**
 * Executes the function passed as an argument and properly shuts down the node environment.
 *
 * Any uncaught error or promise rejection will be printed out in the console.
 */
export const runAndHandleErrors = (fn: () => Promise<unknown>) => {
  const goFn = goSync(() =>
    fn()
      .then(() => process.exit(0))
      .catch((error) => {
        cliPrint.error(error);
        process.exit(1);
      })
  );
  if (!goFn.success) {
    cliPrint.error('' + goFn.error);
    process.exit(1);
  }
};

/**
 * Run the command passed as an argument in the current shell and stream the output of the command in the CLI.
 */
export const runShellCommand = (command: string) => {
  cliPrint.info(command);
  spawnSync(command, {
    shell: true,
    stdio: 'inherit',
  });
};

export const cliPrint = {
  info: (text: string) => logger.log(chalk.bold.white(text)),
  warning: (text: string) => logger.warn(chalk.bold.hex('#FFA500')(text)), // Orange color
  error: (text: string) => logger.error(chalk.bold.red(text)),
};
