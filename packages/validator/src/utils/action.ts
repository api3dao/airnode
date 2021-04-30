import { Roots } from '../types';
import { insertValue, replaceParamIndexWithName } from './utils';

export function execute(specs: any, template: any, currentPath: string[], roots: Roots) {
  for (const action of template) {
    let targetPath;

    try {
      targetPath = JSON.parse((action['__insert'] || action['__copy'])['__target'].replace(/'/g, '"')) as string[];
    } catch {
      continue;
    }

    switch (Object.keys(action)[0]) {
      case '__insert':
        insertValue(
          replaceParamIndexWithName(targetPath, currentPath),
          roots.output,
          typeof action['__insert']['__value'] === 'string'
            ? replaceParamIndexWithName(action['__insert'], currentPath)['__value']
            : action['__insert']['__value']
        );
        break;

      case '__copy':
        insertValue(replaceParamIndexWithName(targetPath, currentPath), roots.output, specs);
        break;
    }
  }
}
