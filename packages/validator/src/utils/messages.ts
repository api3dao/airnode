import { Log } from '../types';

export function formattingMessage(paramPath: string[], error = false): Log {
  return { level: error ? 'error' : 'warning', message: `${paramPath.join('.')} is not formatted correctly` };
}

export function keyFormattingMessage(key: string, paramPath: string[]): Log {
  return { level: 'error', message: `Key ${key} in ${paramPath.join('.')} is formatted incorrectly` };
}

export function sizeExceededMessage(paramPath: string[], maxSize: number): Log {
  return { level: 'error', message: `${paramPath.join('.')} must contain ${maxSize} or less items` };
}

export function missingParamMessage(param: string[]): Log {
  return { level: 'error', message: `Missing parameter ${param.join('.')}` };
}

export function extraFieldMessage(param: string[]): Log {
  return { level: 'warning', message: `Extra field: ${param.join('.')}` };
}

export function conditionNotMetMessage(paramPath: string[], param: string): Log {
  return { level: 'error', message: `Condition in ${paramPath.join('.')} is not met with ${param}` };
}

export function requiredConditionNotMetMessage(paramPath: string[]): Log {
  return { level: 'error', message: `Required conditions not met in ${paramPath.join('.')}` };
}

export function invalidConversionMessage(from: string, to: string): Log {
  return { level: 'error', message: `Conversion from ${from} to ${to} is not valid conversion` };
}

export function incorrectType(paramPath: string[], expectedType: string, actualType: string): Log {
  return { level: 'error', message: `${paramPath.join('.')}: Expected ${expectedType}, got ${actualType}` };
}
