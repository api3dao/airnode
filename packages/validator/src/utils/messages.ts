export function formattingMessage(paramPath, error = false) {
  return { level: error ? 'error' : 'warning', message: `${paramPath} is not formatted correctly` };
}

export function keyFormattingMessage(key, paramPath) {
  return { level: 'error', message: `Key ${key} in ${paramPath} is formatted incorrectly` };
}

export function sizeExceededMessage(paramPath, maxSize) {
  return { level: 'error', message: `${paramPath} must contain ${maxSize} or less items` };
}

export function missingParamMessage(param) {
  return { level: 'error', message: `Missing parameter ${param}` };
}

export function extraFieldMessage(param) {
  return { level: 'warning', message: `Extra field: ${param}` };
}

export function conditionNotMetMessage(paramPath, param) {
  return { level: 'error', message: `Condition in ${paramPath} is not met with ${param}` };
}
