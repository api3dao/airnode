import { get, put } from '../utils';
import { Plug, Response } from '../types';

export function add(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;

  const first = typeof inputs[0] === 'string' ? get(response, inputs[0]) : inputs[0];
  const second = typeof inputs[1] === 'string' ? get(response, inputs[1]) : inputs[1];
  const sum = Number(first) + Number(second);

  return put(response, output, sum);
}
