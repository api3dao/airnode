import { getEvaluate, put } from '../utils';
import { Plug, Response } from '../types';

export function concat(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;

  const firstValue = getEvaluate(response, inputs[0] as string);
  const secondValue = getEvaluate(response, inputs[1] as string) || inputs[1] as string;
  const concatted = firstValue + secondValue;

  return put(response, output, concatted);
}
