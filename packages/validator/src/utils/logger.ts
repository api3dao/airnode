import { Log } from '../types';

export function warn(message: string): Log {
  return { level: 'warning', message };
}

export function error(message: string): Log {
  return { level: 'error', message };
}
