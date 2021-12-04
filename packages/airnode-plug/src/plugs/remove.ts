import omit from 'lodash/omit';
import { evaluateStr } from '../utils';
import { Plug, Response } from '../types';

export function remove(response: Response, plug: Plug): Response {
  const { inputs } = plug;
  const evaluated = evaluateStr(response, inputs[0] as string);
  return omit(response, evaluated);
}
