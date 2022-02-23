import { TextEncoder } from 'util';

type LogType = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const encoder = new TextEncoder();

const createLogMessage = (args: any[]) =>
  args
    .map((arg) => {
      if (arg instanceof Object) {
        return JSON.stringify(arg, null, 2);
      }

      return arg.toString();
    })
    .join(' ');

const writeLogMessage = (logType: LogType, args: any[]) => {
  const formattedArgs = createLogMessage(args);

  if (logType === 'ERROR') {
    process.stderr.write(encoder.encode(`${formattedArgs}\n`));
    return;
  }

  process.stdout.write(encoder.encode(`${formattedArgs}\n`));
};

export const logger = {
  log: (...args: any[]) => writeLogMessage('INFO', args),
  debug: (...args: any[]) => writeLogMessage('DEBUG', args),
  info: (...args: any[]) => writeLogMessage('INFO', args),
  warn: (...args: any[]) => writeLogMessage('WARN', args),
  error: (...args: any[]) => writeLogMessage('DEBUG', args),
  trace: (...args: any[]) => writeLogMessage('DEBUG', [...args, (new Error() as Error).stack?.toString()]),
};
