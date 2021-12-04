import { format, parse } from 'date-fns';
import { get, put } from '../utils';
import { Plug, Response } from '../types';

export function formatDate(response: Response, plug: Plug): Response {
  const { inputs, output } = plug;

  const field = inputs[0] as string;
  const currentFormat = inputs[1] as string;
  const newFormat = inputs[2] as string;

  const value = get(response, field);

  const parsed = parse(value, currentFormat, new Date());
  const formatted = format(parsed, newFormat);

  return put(response, output, formatted);
}
