import { Roots } from '../types';
import { insertValue, replaceParamIndexWithName } from './utils';

export function execute(specs: any, template: any, currentPath: string, roots: Roots) {
  for (const action of template) {
    switch (Object.keys(action)[0]) {
      case '__insert':
        insertValue(
          replaceParamIndexWithName(action['__insert'], currentPath)['__target'],
          roots.output,
          typeof action['__insert']['__value'] === 'string'
            ? replaceParamIndexWithName(action['__insert'], currentPath)['__value']
            : action['__insert']['__value']
        );
        break;

      case '__copy':
        insertValue(replaceParamIndexWithName(action['__copy'], currentPath)['__target'], roots.output, specs);
        break;
    }
  }
}
