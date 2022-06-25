import { spawnSync, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { logger } from '@api3/airnode-utilities';
import { goSync } from '@api3/promise-utils';
import { cliPrint } from '../src';

export const runCommand = (command: string) => {
  logger.log(`Running command:\n${command}`);
  const result = spawnSync(command, {
    shell: true,
  });

  if (result.status !== 0 || result.error) {
    throw new Error(`Command failed with non-zero status code. Output:\n${result.stdout.toString()}`);
  }

  const stderr = result.stderr.toString();
  if (stderr) {
    cliPrint.warning(`Stderr output:\n${stderr}`);
  }

  return result.stdout.toString();
};

export const runCommandInBackground = (command: string) => {
  logger.log(`Running background command:\n${command}`);
  return spawn(command, {
    detached: true,
    shell: true,
  });
};

export const killBackgroundProcess = (processToKill: ChildProcessWithoutNullStreams) => {
  // We need to gracefully kill the Airnode docker otherwise it remains running on background
  //
  // The following reliably kills the Airnode process for unix, but it throws for windows.
  // See: https://azimi.me/2014/12/31/kill-child_process-node-js.html

  const goKillProcess = goSync(() => process.kill(-processToKill.pid!));

  // See: https://stackoverflow.com/a/28163919
  if (!goKillProcess.success) spawn('taskkill', ['/pid', processToKill.pid!.toString(), '/f', '/t']);
};
