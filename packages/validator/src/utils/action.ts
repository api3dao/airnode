import { keywords, regexList } from './globals';
import { insertValue, replaceParamIndexWithName, replacePathsWithValues } from './utils';
import { Roots } from '../types';

export function execute(specs: any, template: any, currentPath: string[], roots: Roots) {
  for (const action of template) {
    let targetPath;

    try {
      targetPath = JSON.parse(
        (action[keywords.insert] || action[keywords.copy])[keywords.target]
          .replace(regexList.noEscapeApostrophe, '"')
          .replace(/\\'/g, "'")
      ) as string[];
    } catch {
      continue;
    }

    switch (Object.keys(action)[0]) {
      case keywords.insert:
        insertValue(
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(targetPath, currentPath)),
          roots,
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(action[keywords.insert], currentPath))[
            keywords.value
          ]
        );
        break;

      case keywords.copy:
        insertValue(
          replacePathsWithValues(specs, roots.specs, replaceParamIndexWithName(targetPath, currentPath)),
          roots,
          specs
        );
        break;
    }
  }
}
