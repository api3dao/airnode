import { getEvaluate, put } from '../utils';
import { Plug, Response } from '../types';

export function castBoolean(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;
  const currentValue = getEvaluate(response, inputs[0] as string);
  return put(response, output, Boolean(currentValue));
}
