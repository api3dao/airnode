'use strict';

const specsStructure = {
  'servers': {
    '__maxSize': 1,
    '__arrayItem': {
      'url': {
        '__regexp': '^(https?|ftp)://[^\\s/$.?#].[^\\s]*$'
      },
    },
  },
  'paths': {
    '__keyRegexp': '^\\/[^\\s\'"\\\\]+$',
    '__objectItem': {
      '__keyRegexp': '^(get|post)$',
      '__objectItem': {
        'parameters': {
          '__arrayItem': {
            'name': {},
            'in': {
              '__regexp': '^(path|query|header|cookie)$'
            },
          },
        }
      }
    }
  },
  'components': {
    'securitySchemes': {
      '__keyRegexp': '^[^\\s\'"\\\\]+$',
      '__objectItem': {
        'type': {
          '__regexp': '^(apiKey|http)$',
          '__level': 'error'
        },
        '__conditions': [
          {
            '__if': {
              'type': '^apiKey$'
            },
            '__then': {
              'name': {}
            }
          },
          {
            '__if': {
              'type': '^http$'
            },
            '__then': {
              'scheme': {
                '__regexp': '^(Basic|Bearer)$',
                '__level': 'error'
              }
            }
          },
          {
            '__require': {
              '/security.__this_name': {}
            }
          }
        ],
        'in': {
          '__regexp': '^(query|header|cookie)$'
        },
      }
    }
  },
  'security': {
    '__keyRegexp': '^[^\\s\'"\\\\]+$',
    '__objectItem': {
      '__arrayItem': {},
      '__conditions': [
        {
          '__require': {
            '/components.securitySchemes.__this_name': {}
          }
        }
      ]
    }
  }
};

function validateSpecs(specs, specsStruct, paramPath, specsRoot) {
  let messages = [];
  let valid = true;
  let checkExtraFields = true;
  let conditionalParams = [];

  for (const key of Object.keys(specsStruct)) {
    if (key === '__conditions') {
      for (const condition of specsStruct[key]) {
        if (condition['__if']) {
          const paramName = Object.keys(condition['__if'])[0];
          const paramValue = condition['__if'][paramName];
          const thenParamName = Object.keys(condition['__then'])[0];

          if (specs[paramName]) {
            if (specs[paramName].match(new RegExp(paramValue))) {
              if (specs[thenParamName]) {
                conditionalParams.push(thenParamName);

                if (!Object.keys(condition['__then'][thenParamName]).length) {
                  continue;
                }

                let result = validateSpecs(specs[thenParamName], condition['__then'][thenParamName], `${paramPath}${paramPath ? '.' : ''}${thenParamName}`, specsRoot);
                messages.push(...result.messages);

                if (!result.valid) {
                  valid = false;
                }
              } else {
                valid = false;
                messages.push({ level: 'error', message: `Missing parameter ${paramPath}${paramPath ? '.' : ''}${thenParamName}`});
              }
            }
          }
        } else {
          for (let requiredParam of Object.keys(condition['__require'])) {
            let workingDir = specs;
            let requiredPath = '';

            if (requiredParam[0] === '/') {
              requiredParam = requiredParam.slice(1);
              workingDir = specsRoot;
              requiredPath = requiredParam;
            } else {
              requiredPath = `${paramPath}${paramPath ? '.' : ''}${requiredParam}`;
            }

            const lastDotIndex = paramPath.lastIndexOf('.');
            let thisName = paramPath;

            if (lastDotIndex >= 0) {
              thisName = paramPath.slice(lastDotIndex + 1);
            }

            requiredPath = requiredPath.replace(/__this_name/g, thisName);

            while (requiredParam.length) {
              if (requiredParam.startsWith('__this_name')) {
                requiredParam = requiredParam.replace('__this_name', '');

                if (!workingDir[thisName]) {
                  valid = false;
                  messages.push({ level: 'error', message: `Missing parameter ${requiredPath}`});
                  break;
                }

                workingDir = workingDir[thisName];

                if (requiredParam.startsWith('.')) {
                  requiredParam = requiredParam.replace('.', '');
                }
              } else {
                const dotIndex = requiredParam.indexOf('.');
                let paramName = requiredParam;

                if (dotIndex > 0) {
                  paramName = requiredParam.substr(0, dotIndex);
                }

                requiredParam = requiredParam.replace(paramName, '');

                if (requiredParam.startsWith('.')) {
                  requiredParam = requiredParam.replace('.', '');
                }

                if (!workingDir[paramName]) {
                  valid = false;
                  messages.push({ level: 'error', message: `Missing parameter ${requiredPath}`});
                  break;
                }

                workingDir = workingDir[paramName];
              }
            }
          }
        }
      }

      continue;
    }

    if (key === '__regexp') {
      if (!specs.match(new RegExp(specsStruct[key]))) {
        let level = 'warning';

        if (specsStruct['__level']) {
          level = specsStruct['__level'];

          if (level === 'error') {
            valid = false;
          }
        }

        messages.push({ level, message: `${paramPath} is not formatted correctly` });
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__keyRegexp') {
      for (const item of Object.keys(specs)) {
        if (!item.match(new RegExp(specsStruct[key]))) {
          messages.push({ level: 'error', message: `Key ${item} in ${paramPath}${paramPath ? '.' : ''}${item} is formatted incorrectly` });
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__maxSize') {
      if (specsStruct[key] < specs.length) {
        messages.push({ level: 'error', message: `${paramPath}${paramPath ? '.' : ''}${key} must contain ${specsStruct[key]} or less items` });
        valid = false;
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__arrayItem') {
      for (let i = 0; i < specs.length; i++) {
        let result = validateSpecs(specs[i], specsStruct[key], `${paramPath}[${i}]`, specsRoot);
        messages.push(...result.messages);

        if (!result.valid) {
          valid = false;
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__objectItem') {
      for (const item of Object.keys(specs)) {
        let result = validateSpecs(specs[item], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${item}`, specsRoot);
        messages.push(...result.messages);

        if (!result.valid) {
          valid = false;
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__level') {
      continue;
    }

    if (!specs[key]) {
      messages.push({ level: 'error', message: `Missing parameter ${paramPath}${paramPath ? '.' : ''}${key}`});
      valid = false;

      continue;
    }

    if (!Object.keys(specsStruct[key]).length) {
      continue;
    }

    let result = validateSpecs(specs[key], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${key}`, specsRoot);
    messages.push(...result.messages);

    if (!result.valid) {
      valid = false;
    }
  }

  if (checkExtraFields) {
    for (const key of Object.keys(specs)) {
      if (!specsStruct[key] && !conditionalParams.includes(key)) {
        messages.push({ level: 'warning', message: `Extra field: ${paramPath}${paramPath ? '.' : ''}${key}` });
      }
    }
  }

  return { valid, messages };
}

function isSpecsValid(specs) {
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return validateSpecs(parsedSpecs, specsStructure, '', parsedSpecs);
}

module.exports = { isSpecsValid };
