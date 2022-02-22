// @ts-ignore
// eslint-disable-next-line no-console
const callConsoleFn = (functionName: string, arg: any) => console[functionName](arg);

export const createLogMessage = (args: any[]) =>
  args
    .map((arg) => {
      if (arg instanceof Object) {
        return JSON.stringify(arg, null, 2);
      }

      return arg.toString();
    })
    .join(' ');

export const log = (...args: any[]) => callConsoleFn('log', createLogMessage(args));
export const logWarn = (...args: any[]) => callConsoleFn('warn', createLogMessage(args));
export const logError = (...args: any[]) => callConsoleFn('error', createLogMessage(args));
export const logTrace = (...args: any[]) => callConsoleFn('trace', createLogMessage(args));
