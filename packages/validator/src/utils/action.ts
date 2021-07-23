import { regexList } from './globals';
import { insertValue, replaceParamIndexWithName, replacePathsWithValues } from './utils';
import { Roots } from '../types';

export function execute(specs: any, template: any, currentPath: string[], roots: Roots) {
  for (const action of template) {
    let targetPath;

    try {
      targetPath = JSON.parse(
        (action['__insert'] || action['__copy'])['__target']
          .replace(regexList.noEscapeApostrophe, '"')
          .replace(/\\'/g, "'")
      ) as string[];
    } catch {
      continue;
    }

    switch (Object.keys(action)[0]) {
      case '__insert':
        insertValue(
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(targetPath, currentPath)),
          roots,
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(action['__insert'], currentPath))[
            '__value'
          ]
        );
        break;

      case '__copy':
        insertValue(
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(targetPath, currentPath)),
          roots,
          specs
        );
        break;
    }
  }
}
