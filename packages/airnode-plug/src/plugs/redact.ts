import { getEvaluate, put } from '../utils';
import { Plug, Response } from '../types';

export function redact(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;

  const currentValue = getEvaluate(response, inputs[0] as string);
  const redacted = Array.from(currentValue).map(() => '*').join('');

  return put(response, output, redacted);
}
