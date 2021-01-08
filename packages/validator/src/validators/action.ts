import { Roots } from '../types';
import { insertValue, parseParamPath } from '../utils/utils';

export function execute(specs: any, template: any, currentPath: string, roots: Roots) {
  for (const action of template) {
    switch (Object.keys(action)[0]) {
      case '__insert':
        insertValue(
          parseParamPath(action['__insert']['__target'], currentPath),
          roots.output,
          typeof action['__insert']['__value'] === 'string'
            ? parseParamPath(action['__insert']['__value'], currentPath)
            : action['__insert']['__value']
        );
        break;

      case '__copy':
        insertValue(parseParamPath(action['__copy']['__target'], currentPath), roots.output, specs);
        break;
    }
  }
}
