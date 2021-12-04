import { add } from './add';
import { castBoolean } from './cast-boolean';
import { concat } from './concat';
import { formatDate } from './format-date';
import { put } from './put';
import { redact } from './redact';
import { remove } from './remove';
import { substring } from './substring';

export const plugs = {
  add,
  'cast-boolean': castBoolean,
  concat,
  'format-date': formatDate,
  put,
  redact,
  remove,
  substring,
};
