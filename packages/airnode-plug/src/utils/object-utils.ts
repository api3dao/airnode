import lodashGet from 'lodash/get';
import lodashSet from 'lodash/set';
import { evaluateStr } from './string-utils';

export const put = lodashSet;

export function getEvaluate(obj: any, path: string) {
  const evaluatedPath = evaluateStr(obj, path);
  return get(obj, evaluatedPath);
}

export function get(obj: any, path: string) {
  return lodashGet(obj, path);
}
