import { get } from './object-utils';

// Matches '${...}' strings
function matchValues(str: string): string[] | null {
  return str.match(/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g);
}

function isDynamic(str: string): boolean {
  return str.startsWith('${') && str.endsWith('}');
}

export function evaluateStr(obj: any, str: string) {
  // If str is an expression by itself, evaluate and return it
  if (isDynamic(str)) {
    return get(obj, str);
  }

  // Match on all parts that look like '${...}'
  const expressions = matchValues(str) || [];

  // No evaluatable expressions
  if (expressions.length === 0) {
    return str;
  }

  return expressions.reduce((acc, expression) => {
    const inner = expression.substring(2).slice(0, -1);
    const evaluated = get(obj, inner);
    return acc.replace(expression, evaluated);
  }, str);
}
