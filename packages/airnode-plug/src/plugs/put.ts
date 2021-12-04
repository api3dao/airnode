import { evaluateStr, put as putValue } from '../utils';
import { Plug, Response } from '../types';

export function put(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;
  const newValue = evaluateStr(response, inputs[0] as string);
  return putValue(response, output, newValue);
}
