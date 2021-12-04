import { getEvaluate, put } from '../utils';
import { Plug, Response } from '../types';

export function substring(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;

  // TODO: assert inputs.length === 2

  const currentValue = getEvaluate(response, inputs[0] as string);
  const start = Number(inputs[1]);
  const end = Number(inputs[2]);
  const selection = currentValue.substring(start, end);

  return put(response, output, selection);
}
