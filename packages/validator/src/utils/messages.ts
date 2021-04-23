import { Log } from '../types';

export function formattingMessage(paramPath, error = false): Log {
  return { level: error ? 'error' : 'warning', message: `${paramPath} is not formatted correctly` };
}

export function keyFormattingMessage(key, paramPath): Log {
  return { level: 'error', message: `Key ${key} in ${paramPath} is formatted incorrectly` };
}

export function sizeExceededMessage(paramPath, maxSize): Log {
  return { level: 'error', message: `${paramPath} must contain ${maxSize} or less items` };
}

export function missingParamMessage(param): Log {
  return { level: 'error', message: `Missing parameter ${param}` };
}

export function extraFieldMessage(param): Log {
  return { level: 'warning', message: `Extra field: ${param}` };
}

export function conditionNotMetMessage(paramPath, param): Log {
  return { level: 'error', message: `Condition in ${paramPath} is not met with ${param}` };
}

export function requiredConditionNotMetMessage(paramPath): Log {
  return { level: 'error', message: `Required conditions not met in ${paramPath}` };
}

export function invalidConversionMessage(from, to): Log {
  return { level: 'error', message: `Conversion from ${from} to ${to} is not valid conversion` };
}
