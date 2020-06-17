type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export function log(message: string) {
  if (process.env.SILENCE_LOGGER) {
    return;
  }
  console.log(message);
}

export function logJSON(level: LogLevel, message: any) {
  log(JSON.stringify({ level, message }));
}
